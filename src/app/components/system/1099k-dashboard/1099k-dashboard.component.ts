import { DomSanitizer } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { AlertType } from 'src/app/classes/alert-type';
import { Component, OnInit, OnDestroy, ViewChild } from "@angular/core";
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { PDFDocument } from "pdf-lib";
import { TimezoneHelper, Hour } from "@qmenu/ui";
import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import { form1099kEmailTemplate } from '../../restaurants/restaurant-form1099-k/html-email-templates';
enum openRTOptionTypes {
  All = 'Open now?',
  Open = 'Open',
  Not_Open = 'Not Open'
}

enum missPayeeOptionTypes {
  All = 'Missing Payee?',
  Missing_Payee = 'Missing Payee',
  Has_Payee = 'Has Payee'
}

enum missTINOptionTypes {
  All = 'Missing TIN?',
  Missing_TIN = 'Missing TIN',
  Has_TIN = 'Has TIN'
}

enum missingEmailOptionTypes {
  All = 'Missing Email?',
  Missing_Email = 'Missing Email',
  Has_Email = 'Has Email'
}

enum bulkFileOperationTypes {
  Download = 'Download forms for Qmenu use',
  Send = 'Send forms to all restaurants'
}

enum sentEmailOptionTypes {
  All = 'Form Sent?',
  Form_Sent = 'Form Sent',
  Form_Not_Sent = 'Form Not Sent'
}

@Component({
  selector: "app-1099k-dashboard",
  templateUrl: "./1099k-dashboard.component.html",
  styleUrls: ["./1099k-dashboard.component.scss"]
})
export class Dashboard1099KComponent implements OnInit, OnDestroy {
  @ViewChild('sendEmailModal') sendEmailModal: ModalComponent;

  rows = [];
  filteredRows = [];
  taxYearOptions = [
    'All',
    // '2022', // taxYear 2022 will need to be enabled beginning in 2023
    '2021',
    '2020',
  ];
  taxYear = 'All';

  openOptions = [openRTOptionTypes.All, openRTOptionTypes.Open, openRTOptionTypes.Not_Open];
  openOption = openRTOptionTypes.All;

  missPayeeOptions = [missPayeeOptionTypes.All, missPayeeOptionTypes.Missing_Payee, missPayeeOptionTypes.Has_Payee];
  missPayeeOption = missPayeeOptionTypes.All;

  missTINOptions = [missTINOptionTypes.All, missTINOptionTypes.Missing_TIN, missTINOptionTypes.Has_TIN];
  missTINOption = missTINOptionTypes.All;

  missingEmailOptions = [missingEmailOptionTypes.All, missingEmailOptionTypes.Missing_Email, missingEmailOptionTypes.Has_Email];
  missingEmailOption = missingEmailOptionTypes.All;

  sentEmailOptions = [sentEmailOptionTypes.All, sentEmailOptionTypes.Form_Sent, sentEmailOptionTypes.Form_Not_Sent];
  sentEmailOption = sentEmailOptionTypes.All;

  bulkFileOperations = [bulkFileOperationTypes.Download, bulkFileOperationTypes.Send];
  bulkFileOperation = '';

  bulkOperationYears = [
    '2021',
    '2020',
  ];
  bulkOperationYear = '';

  searchFilter;

  system: any;
  now: Date = new Date();
  timer;
  refreshDataInterval = 1 * 60 * 1000;
  restaurants = [];
  // send pdf emails
  allEmails = [];
  targets = [];
  template;
  currRow;
  currForm;
  sendLoading = false;
  showExplanation = false;
  showExtraTools = false;
  calcRTFilter;
  fromDate; //time picker to calculate transactions.
  toDate;
  transactionText = '';
  constructor(private _api: ApiService, private _global: GlobalService, private sanitizer: DomSanitizer, private _http: HttpClient) { }

  async ngOnInit() {
    // refresh the page every hour
    this.timer = setInterval(() => {
      this.now = new Date();
      this.rows = this.restaurants.map(rt => this.turnRtObjectIntoRow(rt));
      this.filterRows();
    }, this.refreshDataInterval);
    await this.get1099KData();
    this.filterRows();
  }

  handleShowExtraTools() {
    this.showExtraTools = !this.showExtraTools;
    if (!this.showExtraTools) {
      this.toDate = '';
      this.fromDate = '';
      this.calcRTFilter = '';
      this.transactionText = '';
    }
  }

  async calcTransactionByTime() {
    if (!this.fromDate || !this.toDate) {
      return this._global.publishAlert(AlertType.Danger, "please input a correct from time date format!");
    }

    if (new Date(this.fromDate).valueOf() - new Date(this.toDate).valueOf() > 0) {
      return this._global.publishAlert(AlertType.Danger, "please input a correct date format,from time is less than or equals to time!");
    }
    this.transactionText = '';
    const [restaurant] = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        _id: {
          $oid: this.calcRTFilter
        }
      },
      projection: {
        "googleAddress.timezone": 1
      },
      limit: 1
    }).toPromise();

    const utcf = TimezoneHelper.getTimezoneDateFromBrowserDate(new Date(this.fromDate + " 00:00:00.000"), restaurant.googleAddress.timezone || 'America/New_York');
    const utct = TimezoneHelper.getTimezoneDateFromBrowserDate(new Date(this.toDate + " 23:59:59.999"), restaurant.googleAddress.timezone || 'America/New_York');

    const query = {
      restaurant: {
        $oid: this.calcRTFilter
      },
      $and: [{
        createdAt: {
          $gte: { $date: utcf }
        } // less than and greater than
      }, {
        createdAt: {
          $lte: { $date: utct }
        }
      }],
      "paymentObj.method": "QMENU"
    } as any;
    const orders = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "order",
      query: query,
      projection: {
        "computed.total": 1
      },
      limit: 100000000000000000
    }).toPromise();
    /* round - helper function to address floating point math imprecision. 
     e.g. sometimes a total may be expressed as '2.27999999999997'. we need to put that in the format '2.28' */
    const round = function (num) {
      return Math.round((num + Number.EPSILON) * 100) / 100;
    }
    let timeRangeData = {
      transactionNum: 0,
      total: 0
    }
    orders.forEach(order => {
      let roundedOrderTotal = round(order.computed.total);
      timeRangeData.total += roundedOrderTotal;
      timeRangeData.transactionNum++;
    });
    this.transactionText = `${timeRangeData.transactionNum} transactions totaling \$${round(timeRangeData.total)}`
  }

  executeBulkFileOperation() {
    if (this.bulkFileOperation === bulkFileOperationTypes.Download) {
      this.bulkQMenuDownload(this.bulkOperationYear);
    } else {
      this.bulkSendFilesToRTs(this.bulkOperationYear);
    }
  }

  isMissingBulkFileAttributes() {
    return !this.bulkFileOperation || !this.bulkOperationYear;
  }

  async bulkQMenuDownload(year) {
    console.log(`bulk qmenu download ${year}`);

  }

  async bulkSendFilesToRTs(year) {
    // https://stackoverflow.com/questions/11098285/sending-email-with-attachment-using-amazon-ses
    // documentation regarding Amazon SES Raw Email (AWS email service that allows attachments)
    // 1. filter row whose form1099k sent flag is false and has all necessary attributes
    this.sendLoading = true;
    let notSendRows = this.rows.filter(row => (row.form1099k || []).some(form => form.year === +year && !form.sent) && this.allAttributesPresent(row));
    let templates = [];

    notSendRows.forEach(row => {
      let yearForm1099kData = (row.form1099k || []).find(form => form.year === +year);
      let dataset = {
        'LAST_YEAR': yearForm1099kData.year,
        'RT_NAME': row.name
      }
      templates.push({
        row: row,
        form: yearForm1099kData,
        subject: `1099-K Form for ${yearForm1099kData.year}`,
        html: this.fillMessageTemplate(form1099kEmailTemplate, dataset),
        inputs: [
          {
            label: "Restaurant Name",
            value: row.name,
            apply: (tpl, value) => this.fillMessageTemplate(tpl, { "RT_NAME": value }, /%%(RT_NAME)%%/g)
          }]
      });
    });
    for (let i = 0; i < templates.length; i++) {
      let template = templates[i];
      this.currRow = template.row;
      this.currForm = template.form;
      // fill in rt name
      let { inputs, html } = template;
      inputs.forEach(field => {
        templates[i].html = field.apply(html, field.value);
      });
      // upload pdf
      try {
        let mediaUrl = await this.uploadPDF();
        templates[i].html = this.fillMessageTemplate(templates[i].html, {
          'AWS_FORM_1099K_LINK_HERE': mediaUrl
        }, /%%(AWS_FORM_1099K_LINK_HERE)%%/g);
      } catch (error) {
        templates[i]['error'] = 'File Upload Error'
      }
    }

    let jobs = [];
    let canSendEmailTemplates = templates.filter(template => template.error !== 'File Upload Error');
    canSendEmailTemplates.forEach(template => {
      template.row.email.forEach(email => {
        jobs.push({
          'name': 'send-email',
          'params': {
            'to': email,
            'subject': template.subject,
            'html': template.html,
            'trigger': {
              'id': this._global.user._id,
              'name': this._global.user.username,
              'source': 'CSR',
              'module': '1099K Form'
            }
          }
        });
      })
    });

    this._api.post(environment.qmenuApiUrl + 'events/add-jobs', jobs)
      .subscribe(
        () => {
          this._global.publishAlert(AlertType.Success, `${canSendEmailTemplates.length} restaurants sent email message success with ${notSendRows.length} should send!`);
          // update send flag to know whether has sent email to rt
          let oldNewPairs = [];
          canSendEmailTemplates.forEach(template => {
            let new1099kRecords = JSON.parse(JSON.stringify(template.row.form1099k));
            new1099kRecords.forEach(record => {
              if (record.year === template.form.year) {
                record.sent = true;
              }
            });
            oldNewPairs.push({
              old: { _id: template.row.id },
              new: { _id: template.row.id, form1099k: new1099kRecords }
            });
          });

          this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', oldNewPairs)
            .toPromise();
          // update form 1099k of local row datas
          oldNewPairs.forEach(oldNewPair => {
            this.restaurants.forEach(rt => {
              if (rt._id === oldNewPair.new._id) {
                rt.form1099k = oldNewPair.new.form1099k;
              }
            });
          });
          this.rows = this.restaurants.map(rt => this.turnRtObjectIntoRow(rt));
          this.filterRows();
          this.sendLoading = false;
        },
        error => {
          console.log(error);
          this.sendLoading = false;
          this._global.publishAlert(AlertType.Danger, 'Email message sent failed!');
        }
      );
  }

  sanitized(origin) {
    return this.sanitizer.bypassSecurityTrustHtml(origin);
  }

  fillMessageTemplate(template, dataset, regex = /\{\{([A-Z_]+)}}/g) {
    return template.replace(regex, (_, p1) => dataset[p1]);
  }

  async uploadPDF() {
    let mediaUrl;
    const blob = await this.generatePDF("restaurant", this.currRow, this.currForm);
    const currentFile = new File([blob], `${this.currForm.year}_Form_1099K_${this.currRow.id}_forRT.pdf`);
    const apiPath = `utils/qmenu-uploads-s3-signed-url?file=${encodeURIComponent(currentFile.name)}`;

    // Get presigned url
    const response = await this._api.get(environment.appApiUrl + apiPath).toPromise();
    const presignedUrl = response['url'];
    const fileLocation = presignedUrl.slice(0, presignedUrl.indexOf('?'));

    await this._http.put(presignedUrl, currentFile).toPromise();
    // if it's already PDF, then we can directly send it to fax service.
    // otherwise we need to get a PDF version of the uploaded file (fileLocation) from our renderer service
    // please upload an image or text or html file for the following test
    if (fileLocation.toLowerCase().endsWith('pdf')) {
      mediaUrl = fileLocation;
    } else {
      mediaUrl = `${environment.utilsApiUrl}render-url?url=${encodeURIComponent(fileLocation)}&format=pdf`;
    }
    return mediaUrl;
  }

  async sendPDFFormToRT() {
    try {
      if (this.targets.length === 0) {
        return this._global.publishAlert(AlertType.Danger, 'Please select an valid email!');
      }
      // fill inputs
      let { inputs, html } = this.template;
      if (inputs.some(field => !field.value)) {
        return this._global.publishAlert(AlertType.Danger, `Please fill in necessary field!`);
      }
      this.sendLoading = true;
      if (inputs) {
        inputs.forEach(field => {
          if (html) {
            html = field.apply(html, field.value);
          }
        });
      }
      let mediaUrl = await this.uploadPDF();

      html = this.fillMessageTemplate(html, {
        'AWS_FORM_1099K_LINK_HERE': mediaUrl
      }, /%%(AWS_FORM_1099K_LINK_HERE)%%/g);

      const jobs = this.targets.map(target => {
        return {
          'name': 'send-email',
          'params': {
            'to': target.value,
            'subject': this.template.subject,
            'html': html,
            'trigger': {
              'id': this._global.user._id,
              'name': this._global.user.username,
              'source': 'CSR',
              'module': '1099K Form'
            }
          }
        }
      });

      this._api.post(environment.qmenuApiUrl + 'events/add-jobs', jobs)
        .subscribe(
          () => {
            this._global.publishAlert(AlertType.Success, 'Email message sent success');
            // update send flag to know whether has sent email to rt
            let new1099kRecords = JSON.parse(JSON.stringify(this.currRow.form1099k));
            new1099kRecords.forEach(record => {
              if (record.year === this.template.year) {
                record.sent = true;
              }
            });
            this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [
              {
                old: { _id: this.currRow.id },
                new: { _id: this.currRow.id, form1099k: new1099kRecords }
              }
            ]).toPromise();
            // update form 1099k of local row datas
            this.restaurants.forEach(rt => {
              if (rt._id === this.currRow.id) {
                rt.form1099k = new1099kRecords;
              }
            });
            this.rows = this.restaurants.map(rt => this.turnRtObjectIntoRow(rt));
            this.filterRows();
            this.sendLoading = false;
            this.sendEmailModal.hide();
          },
          error => {
            console.log(error);
            this.sendLoading = false;
            this._global.publishAlert(AlertType.Danger, 'Email message sent failed!');
          }
        );
    } catch (error) {
      this.sendLoading = false;
      this.sendEmailModal.hide();
      this._global.publishAlert(AlertType.Danger, "File uploading fail due to network error, please refresh the page and retry again!");
    }
  }

  selectTarget(e, target) {
    if (e.target.checked) {
      this.targets.push(target);
    } else {
      this.targets = this.targets.filter(x => x !== target);
    }
  }

  openSendEmailModal(row, form) {
    this.currRow = row;
    this.currForm = form;
    let dataset = {
      'LAST_YEAR': this.currForm.year,
      'RT_NAME': this.currRow.name
    }
    this.targets = [];
    this.allEmails = (this.currRow.channels || []).filter(ch => ch.type === 'Email');
    // if invoice emails, set them to target by default
    this.allEmails.forEach(email => {
      if ((email.notifications || []).includes('Invoice')) {
        this.targets.push(email);
      }
    });
    this.template = {
      subject: `1099-K Form for ${this.currForm.year}`,
      html: this.fillMessageTemplate(form1099kEmailTemplate, dataset),
      year: this.currForm.year,
      inputs: [
        {
          label: "Restaurant Name",
          value: row.name,
          apply: (tpl, value) => this.fillMessageTemplate(tpl, { "RT_NAME": value }, /%%(RT_NAME)%%/g)
        }]
    }
    this.sendEmailModal.show();
  }

  get bulkFileOperationTypes() {
    return bulkFileOperationTypes;
  }

  ngOnDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async rescan() {
    await this.get1099KData();
    this.filterRows();
  }

  isAdmin() {
    let roles = this._global.user.roles || [];
    return roles.includes('ADMIN');
  }

  debounce(value) {
    this.filterRows();
  }

  async get1099KData() {
    this.restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        "form1099k.required": true
      },
      projection: {
        "closedHours": 1,
        "menus.hours": 1,
        name: 1,
        form1099k: 1,
        channels: 1,
        googleAddress: 1,
        people: 1,
        tin: 1,
        payeeName: 1
      }
    }, 5000);
    this.now = new Date();
    this.rows = this.restaurants.map(rt => this.turnRtObjectIntoRow(rt));
  }

  turnRtObjectIntoRow(rt) {
    const rtTIN = rt.tin || null;
    const payeeName = rt.payeeName || null;
    const email = (rt.channels || []).filter(ch => ch.type === 'Email' && (ch.notifications || []).includes('Invoice')).map(ch => ch.value); // RT *must* have an invoice email channel
    const ga = rt.googleAddress;
    const streetAddress = `${ga.street_number} ${ga.route}`;
    const cityStateZip = `${ga.locality}, ${ga.administrative_area_level_1} ${ga.postal_code}`
    const timezone = ga.timezone || 'America/New_York';
    const menus = rt.menus;
    (menus || []).forEach(menu => {
      menu.hours = (menu.hours || []).map(hour => new Hour(hour));
    });
    const closedHours = rt.closedHours;
    const openOrNot = this.isRTOpened(menus, closedHours, timezone);

    return {
      id: rt._id,
      name: rt.name,
      email,
      streetAddress,
      cityStateZip,
      form1099k: rt.form1099k,
      payeeName,
      rtTIN,
      channels: rt.channels || [],
      timezone,
      openOrNot
    }
  }

  isRTOpened(menus, closedHours, timezone) {
    // judge whether open
    // 1. by menu hours
    let flag = false;
    for (let i = 0; i < (menus || []).length; i++) {
      const menu = (menus || [])[i];
      if ((menu.hours || []).some(hour => hour.isOpenAtTime(this.now, timezone))) {
        flag = true;
        break;
      }
    }
    // 2. by restaurant closed hours
    closedHours = (closedHours || []).filter(hour => !(hour.toTime && this.now > hour.toTime));

    if (closedHours.some(hour => {
      let nowTime = TimezoneHelper.getTimezoneDateFromBrowserDate(this.now, timezone);
      return nowTime >= hour.fromTime && nowTime <= hour.toTime;
    })) {
      flag = false;
    }
    return flag;
  }

  // filter the biz of restaurant's contacts to show on rt portal
  getBizContacts(channels) {
    return (channels || []).filter(channel => channel.type === 'Phone' && (channel.notifications || []).includes('Business')).map(c => c.value).join(', ');
  }

  allAttributesPresent(row) {
    const emailExists = (row.email || []).length > 0;
    const payeeNameExists = (row.payeeName || "").length > 0;
    const tinExists = (row.rtTIN || "").length > 0;
    return emailExists && payeeNameExists && tinExists;
  }

  filterRows() {
    /* pass through several layers of filtering based on each possible criteria: 
    taxYear, showingMissingPayee, showMissingTIN, and showMissingEmail */
    this.filteredRows = JSON.parse(JSON.stringify(this.rows));

    // taxYear
    if (this.taxYear !== 'All') {
      const year = parseInt(this.taxYear);
      this.filteredRows = this.filteredRows.filter(row => (row.form1099k || []).findIndex(form => form.year === year) >= 0);
      this.filteredRows.map(row => {
        row.form1099k = (row.form1099k || []).filter(form => form.year === year);
        return row;
      })
    }
    // rt open or not
    if (this.openOption === openRTOptionTypes.Open) {
      this.filteredRows = this.filteredRows.filter(row => row.openOrNot);
    } else if (this.openOption === openRTOptionTypes.Not_Open) {
      this.filteredRows = this.filteredRows.filter(row => !row.openOrNot);
    }
    // missing payee
    if (this.missPayeeOption === missPayeeOptionTypes.Missing_Payee) {
      this.filteredRows = this.filteredRows.filter(row => !row.payeeName);
    } else if (this.missPayeeOption === missPayeeOptionTypes.Has_Payee) {
      this.filteredRows = this.filteredRows.filter(row => row.payeeName);
    }
    // missing TIN (TIN is a company unique ID number)
    if (this.missTINOption === missTINOptionTypes.Missing_TIN) {
      this.filteredRows = this.filteredRows.filter(row => !row.rtTIN);
    } else if (this.missTINOption === missTINOptionTypes.Has_TIN) {
      this.filteredRows = this.filteredRows.filter(row => row.rtTIN);
    }
    // missing email
    if (this.missingEmailOption === missingEmailOptionTypes.Missing_Email) {
      this.filteredRows = this.filteredRows.filter(row => (row.email || []).length === 0);
    } else if (this.missingEmailOption === missingEmailOptionTypes.Has_Email) {
      this.filteredRows = this.filteredRows.filter(row => (row.email || []).length !== 0);
    }

    // sent email or not in the year
    if (this.sentEmailOption === sentEmailOptionTypes.Form_Sent) {
      this.filteredRows = this.filteredRows.filter(row => (row.form1099k || []).some(form => form.year === +this.taxYear && form.sent));
    } else if (this.sentEmailOption === sentEmailOptionTypes.Form_Not_Sent) {
      this.filteredRows = this.filteredRows.filter(row => (row.form1099k || []).some(form => form.year === +this.taxYear && !form.sent));
    }

    // search will match RT name, RT id, payee name, or email address
    if (this.searchFilter && this.searchFilter.trim().length > 0) {
      this.filteredRows = this.filteredRows.filter(row => {
        let lowerCaseSearchFilter = this.searchFilter.toLowerCase();
        const nameMatch = (row.name || "").toLowerCase().includes(lowerCaseSearchFilter);
        const idMatch = (row.id.toString() || "").toLowerCase().includes(lowerCaseSearchFilter);
        const payeeMatch = (row.payeeName || "").toLowerCase().includes(lowerCaseSearchFilter);
        const emailMatch = (row.email || []).some(entry => entry.toLowerCase().includes(lowerCaseSearchFilter));
        return nameMatch || idMatch || payeeMatch || emailMatch;
      });
    }
  }

  async onEdit(event, rowIndex, field) {
    let newObj = { _id: this.filteredRows[rowIndex].id };
    if (field === 'rtTIN') {
      this.filteredRows[rowIndex].rtTIN = newObj['tin'] = event.newValue;
    }
    if (field === 'payeeName') {
      this.filteredRows[rowIndex].payeeName = newObj['payeeName'] = event.newValue;
    }
    if (field === 'Email') {
      /* we only allow user to submit email if one does not already exist. 
      to avoid possible confusion, will not allow users to edit existing channels from this component*/
      /* we only allow user to submit email if one does not already exist. 
   to avoid possible confusion, will not allow users to edit existing channels from this component*/
      const newChannel = {
        type: 'Email',
        value: event.newValue,
        notifications: ['Invoice']
      }
      this.filteredRows[rowIndex].email = [newChannel.value];

      const oldChannels = this.filteredRows[rowIndex].channels;
      const newChannels = [...oldChannels, newChannel];
      this.filteredRows[rowIndex].channels = newObj['channels'] = newChannels;
    }

    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [
      {
        old: { _id: this.filteredRows[rowIndex].id },
        new: newObj
      }
    ]).toPromise();
  }

  async generatePDF(target, row, form1099KData) {
    let formTemplateUrl;
    if (target === 'qmenu') {
      formTemplateUrl = "../../../../assets/form1099k/form1099k_qmenu.pdf";
    } else if (target === 'restaurant') {
      formTemplateUrl = "../../../../assets/form1099k/form1099k.pdf";
    }
    const formBytes = await fetch(formTemplateUrl).then((res) => res.arrayBuffer());
    const pdfDoc = await PDFDocument.load(formBytes);
    const form = pdfDoc.getForm();

    const qMenuAddress = `
    qMenu, Inc.
    107 Technology Pkwy NW, Ste. 211
    Peachtree Corners, GA 30092`;

    // Calendar Year Blank (fill in last two digits of tax year)
    form.getTextField(`topmostSubform[0].CopyB[0].CopyBHeader[0].CalendarYear[0].f2_1[0]`).setText(form1099KData.year.toString().slice(-2));
    // Filer checkbox
    form.getCheckBox(`topmostSubform[0].CopyB[0].LeftCol[0].FILERCheckbox_ReadOrder[0].c2_3[0]`).check();

    // Transaction reporting checkbox:
    form.getCheckBox(`topmostSubform[0].CopyB[0].LeftCol[0].c2_5[0]`).check();
    // Payee's name:
    form.getTextField(`topmostSubform[0].CopyB[0].LeftCol[0].f2_2[0]`).setText(qMenuAddress);
    // Payee's Name:
    form.getTextField(`topmostSubform[0].CopyB[0].LeftCol[0].f2_3[0]`).setText(row.payeeName);
    // Street Address:
    form.getTextField(`topmostSubform[0].CopyB[0].LeftCol[0].f2_4[0]`).setText(row.streetAddress);
    // City, State, and ZIP Code:
    form.getTextField(`topmostSubform[0].CopyB[0].LeftCol[0].f2_5[0]`).setText(row.cityStateZip);
    // PSE's Name and Telephone Number:
    form.getTextField(`topmostSubform[0].CopyB[0].LeftCol[0].f2_6[0]`).setText('');
    // Account Number (leave blank)
    form.getTextField(`topmostSubform[0].CopyB[0].LeftCol[0].f2_7[0]`).setText('');

    // Filer's TIN
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_8[0]`).setText('81-4208444');
    // Payee's TIN    
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_9[0]`).setText(row.rtTIN)
    // Box 1b card not present transactions
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].Box1b_ReadOrder[0].f2_11[0]`).setText(form1099KData.total.toFixed(2));
    // Box 2 - Merchant category code (Always 5812 for restaurants)
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_12[0]`).setText('5812');
    // Box 3 - Number of payment transactions
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_13[0]`).setText(form1099KData.transactions.toString());
    // Box 4 - Federal income tax withheld
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_14[0]`).setText('');
    // Box 5a - January income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].Box5a_ReadOrder[0].f2_15[0]`).setText(form1099KData[0].toFixed(2));
    // Box 5b - February income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_16[0]`).setText(form1099KData[1].toFixed(2));
    // Box 5c - March income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].Box5c_ReadOrder[0].f2_17[0]`).setText(form1099KData[2].toFixed(2))
    // Box 5d - April income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_18[0]`).setText(form1099KData[3].toFixed(2))
    // Box 5e - May income

    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].Box5e_ReadOrder[0].f2_19[0]`).setText(form1099KData[4].toFixed(2));
    // Box 5f - June income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_20[0]`).setText(form1099KData[5].toFixed(2));
    // Box 5g - July income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].Box5g_ReadOrder[0].f2_21[0]`).setText(form1099KData[6].toFixed(2));
    // Box 5h - August income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_22[0]`).setText(form1099KData[7].toFixed(2));
    // Box 5i - September income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].Box5i_ReadOrder[0].f2_23[0]`).setText(form1099KData[8].toFixed(2));
    // Box 5j - October income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_24[0]`).setText(form1099KData[9].toFixed(2));
    // Box 5k - November income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].Box5k_ReadOrder[0].f2_25[0]`).setText(form1099KData[10].toFixed(2));
    // Box 5l - December income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_26[0]`).setText(form1099KData[11].toFixed(2));
    // Box 6 - State
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].Box6_ReadOrder[0].f2_27[0]`).setText('');
    // Box 7 - State ID
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].Box7_ReadOrder[0].f2_29[0]`).setText('');

    form.updateFieldAppearances();
    let pdfBytes;

    if (target === 'qmenu') {
      pdfBytes = await pdfDoc.save();
    } else if (target === 'restaurant') {
      const newDoc = await PDFDocument.create();
      const [copiedPage] = await newDoc.copyPages(pdfDoc, [3]);
      newDoc.addPage(copiedPage);
      pdfBytes = await newDoc.save();
    }

    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    return blob;
  }

  async renderPDFForm(row, form1099KData, target) {
    const blob = await this.generatePDF(target, row, form1099KData);
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    // 2021_Form_1099K_58ba1a8d9b4e441100d8cdc1_forRT.pdf
    // 2021_Form_1099K_58ba1a8d9b4e441100d8cdc1_forQM.pdf
    link.download = `${form1099KData.year}_Form_1099K_${row.id}_for${target === 'qmenu' ? 'QM' : 'RT'}.pdf`
    link.click();
  }


}

