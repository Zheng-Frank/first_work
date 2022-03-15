import {DomSanitizer} from '@angular/platform-browser';
import {HttpClient} from '@angular/common/http';
import {AlertType} from 'src/app/classes/alert-type';
import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {ApiService} from '../../../services/api.service';
import {environment} from '../../../../environments/environment';
import {GlobalService} from '../../../services/global.service';
import {PDFDocument} from 'pdf-lib';
import {Hour, TimezoneHelper} from '@qmenu/ui';
import {ModalComponent} from '@qmenu/ui/bundles/qmenu-ui.umd';
import {form1099kEmailTemplate} from '../../restaurants/restaurant-form1099-k/html-email-templates';
import IRSHelper from './irs-fire-helper';


declare var $: any;
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

enum customizeOptionTypes {
  All = 'Custom?',
  Custom = 'Customized',
  Regular = 'Regular'
}

enum enumTinTypes {
  Remove = '',
  EIN = 'EIN',
  SSN = 'SSN'
}

@Component({
  selector: "app-1099k-dashboard",
  templateUrl: "./1099k-dashboard.component.html",
  styleUrls: ["./1099k-dashboard.component.scss"]
})
export class Dashboard1099KComponent implements OnInit, OnDestroy {
  @ViewChild('sendEmailModal') sendEmailModal: ModalComponent;
  @ViewChild('tinTypeModal') tinTypeModal: ModalComponent;
  @ViewChild('customize1099kModal') customize1099kModal: ModalComponent;

  rows = [];
  filteredRows = [];
  taxYearOptions = [
    'All',
    '2022',
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

  customizeOptions = [customizeOptionTypes.All, customizeOptionTypes.Custom, customizeOptionTypes.Regular];
  customizeOption = customizeOptionTypes.All;

  bulkFileOperations = [bulkFileOperationTypes.Download, bulkFileOperationTypes.Send];
  bulkFileOperation = '';

  bulkOperationYears = [
    '2022',
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
  currRowIndex;
  sendLoading = false;
  showExtraTools = false;
  calcRTFilter;
  fromDate; // time picker to calculate transactions.
  toDate;
  transactionText = '';
  tinTypes = [enumTinTypes.EIN, enumTinTypes.SSN, enumTinTypes.Remove];
  tinType = enumTinTypes.EIN;
  customize1099kList = [];
  isCustomize1099k = false;
  customizeTinTypes = [enumTinTypes.EIN, enumTinTypes.SSN];
  markSentFlag = false; // if it is true, the email won't actually be sent, it'll simply mark the status as "Sent" for that restaurant for that tax year.
  constructor(private _api: ApiService, private _global: GlobalService, private sanitizer: DomSanitizer, private _http: HttpClient) { }

  async ngOnInit() {
    this.tooltip();
    // refresh the page every hour
    this.timer = setInterval(() => {
      this.now = new Date();
      this.rows = this.restaurants.map(rt => this.turnRtObjectIntoRow(rt));
      this.filterRows();
    }, this.refreshDataInterval);
    await this.get1099KData();
    this.filterRows();
  }

  // disable send button when the row has not emails
  disableSendBtn(row){
    return (row.email || []).length === 0;
  }

  // title of page has a number that should show all 1099k count instead of rt count
  getAllFiltered1099kCount() {
    return (this.filteredRows || []).reduce((prev, curr) => prev + (curr.form1099k || []).length, 0);
  }

  /*
  Add ability to calculate, separate, and save separately,
  1099K info for a specific restaurant for different portions of the tax year
  and generate multiple 1099Ks, from the 1099K dashboard.
  */
  openCustomize1099kModal(rowIndex) {
    this.currRowIndex = rowIndex;
    this.customize1099kList = [];
    this.isCustomize1099k = true;
    // show saved data last times if it exists
    let customizedYear1099k = (this.filteredRows[this.currRowIndex].form1099k || []).filter(form => form.year === +this.taxYear && form.yearPeriodStart);
    if (customizedYear1099k.length > 0) {
      customizedYear1099k.sort((a, b) => new Date(a.yearPeriodStart).valueOf() - new Date(b.yearPeriodStart).valueOf());
      for (let i = 0; i < customizedYear1099k.length; i++) {
        const customizedForm = customizedYear1099k[i];
        let item = {
          tin: customizedForm.periodTin,
          payeeName: customizedForm.periodPayeeName,
          tinType: customizedForm.periodTinType || enumTinTypes.EIN, // EIN is defalut value
          fromDate: customizedForm.yearPeriodStart, //  e.g.: 2022-01-01
          toDate: customizedForm.yearPeriodEnd,
          rt1099KData: customizedForm,
          transactionText: customizedForm.required ? `${customizedForm.transactions} transactions totaling \$${this.round(customizedForm.total)}` : `1099K won't be generated for this period since it's not needed.`
        };
        this.customize1099kList.push(item);
      }
    } else {
      let item = {
        tin: '',
        payeeName: '',
        tinType: enumTinTypes.EIN, // EIN is defalut value
        fromDate: `${this.taxYear}-01-01`, //  e.g.: 2022-01-01
        toDate: ''
      };
      this.customize1099kList.push(item);
    }
    this.customize1099kModal.show();
  }

  closeCustomize1099kModal() {
    this.currRowIndex = undefined;
    this.isCustomize1099k = false;
    this.customize1099kModal.hide()
  }

  deleteCustomNewLine(i) {
    this.customize1099kList.splice(i, 1);
  }
  // reset 1099k form of item if form element value is changed
  changeCustomItem(item) {
    item.rt1099KData = undefined;
  }

  // check error of all items of customizeList
  hasCustomize1099kError() {
    const tinErr = this.customize1099kList.some((item, i) => !item.tin && i < this.customize1099kList.length - 1 || this.customize1099kList.some((another, index) => (index === i + 1 && another.tin === item.tin) || (index === i - 1 && another.tin === item.tin)));
    const payeeErr = this.customize1099kList.some((item, i) => !item.payeeName && i < this.customize1099kList.length - 1 || this.customize1099kList.some((another, index) => (index === i + 1 && another.payeeName === item.payeeName) || (index === i - 1 && another.payeeName === item.payeeName)));
    const dateErr = this.customize1099kList.some((item, i) => !item.fromDate || !item.toDate || (i === 0 && item.fromDate !== `${this.taxYear}-01-01`) || (i === this.customize1099kList.length - 1 && item.toDate !== `${this.taxYear}-12-31`))
      || this.customize1099kList.some(item => new Date(item.fromDate).valueOf() >= new Date(item.toDate).valueOf())
      || this.customize1099kList.some(item => item.fromDate.split('-')[0] !== this.taxYear || item.toDate.split('-')[0] !== this.taxYear);
    const otherItemDateErr = this.customize1099kList.some((item, i) => this.customize1099kList.some((another, index) => new Date(another.fromDate).valueOf() <= new Date(item.toDate).valueOf() && index > i));
    const noform1099kDataErr = this.customize1099kList.some(item => !item.rt1099KData);

    return tinErr || payeeErr || dateErr || otherItemDateErr || noform1099kDataErr;
  }

  // check error of every item of customizeList
  hasCustomItemErr(i) {
    const item = this.customize1099kList[i];
    if (!item) {
      return 'Item is undefined';
    }
    const dateErr = 'Data entry error! Ensure date range within the tax year are accounted for, and that the date ranges are in chronological order.';
    const tinErr = 'Data entry error! Ensure tin is not empty!';
    const payeeErr = 'Data entry error! Ensure payee name is not empty!';
    const otherItemDateErr = 'Data entry error! fromTime of another item is smaller than this, but its index is behind!';
    const duplicateTinErr = 'Tin names between two adjacent items cannot be the same';
    const duplicatePayeeNameErr = 'Tin names between two adjacent items cannot be the same';
    const dateNoCoveredErr = 'Dates need to cover a full year';
    if (!item.tin && i < this.customize1099kList.length - 1) {
      return tinErr;
    }
    // Tin names between two adjacent items cannot be the same
    if (this.customize1099kList.some((another, index) => (index === i + 1 && another.tin === item.tin) || (index === i - 1 && another.tin === item.tin))) {
      return duplicateTinErr;
    }
    if (!item.payeeName && i < this.customize1099kList.length - 1) {
      return payeeErr;
    }
    // payeeName names between two adjacent items cannot be the same
    if (this.customize1099kList.some((another, index) => (index === i + 1 && another.payeeName === item.payeeName) || (index === i - 1 && another.payeeName === item.payeeName))) {
      return duplicatePayeeNameErr;
    }
    if (!item.fromDate || !item.toDate) {
      return dateErr;
    }
    // to time or from time must exsit in follow if condition
    if (new Date(item.fromDate).valueOf() >= new Date(item.toDate).valueOf() || item.fromDate.split('-')[0] !== this.taxYear || item.toDate.split('-')[0] !== this.taxYear) {
      return dateErr;
    }
    // check this condition:
    // fromTime of another item is smaller than this item but its index is behind
    if (this.customize1099kList.some((another, index) => new Date(another.fromDate).valueOf() <= new Date(item.toDate).valueOf() && index > i)) {
      return otherItemDateErr;
    }
    // Dates need to cover a full year
    if ((i === 0 && item.fromDate !== `${this.taxYear}-01-01`) || (i === this.customize1099kList.length - 1 && item.toDate !== `${this.taxYear}-12-31`)) {
      return dateNoCoveredErr;
    }

    return '';
  }

  addCustomNewLine() {
    let item = {
      tin: this.filteredRows[this.currRowIndex].rtTIN,
      payeeName: this.filteredRows[this.currRowIndex].payeeName,
      tinType: enumTinTypes.EIN,
      fromDate: '', //  e.g.: 2022-01-01
      toDate: `${this.taxYear}-12-31` // e.g. 2021.12.31 date should cover one year
    }
    this.customize1099kList.push(item);
  }

  async patchCustom1099k() {
    let newObj = {
      _id: this.filteredRows[this.currRowIndex].id,
      form1099k: this.filteredRows[this.currRowIndex].form1099k
    }
    // 1099k of other years should be remained excluding this taxYear
    newObj.form1099k = newObj.form1099k.filter(item => item.year !== +this.taxYear);
    this.customize1099kList.forEach(item => {
      newObj.form1099k.push(item.rt1099KData);
    });
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [
      {
        old: { _id: this.filteredRows[this.currRowIndex].id },
        new: newObj
      }
    ]).toPromise();
    // update origin data
    this.restaurants.forEach(rt => {
      if (rt._id === this.filteredRows[this.currRowIndex].id) {
        rt.form1099k = newObj['form1099k'];
      }
    });
    this._global.publishAlert(AlertType.Success, `Customized form 1099k for restaurant ${this.filteredRows[this.currRowIndex].name}!`);
    this.rows = this.restaurants.map(rt => this.turnRtObjectIntoRow(rt));
    this.filterRows();
    this.closeCustomize1099kModal();
  }

  // btn will show diff text according to this function
  hasCustomOfThisYear(form1099k) {
    return form1099k.some(item => item.year === +this.taxYear && item.yearPeriodStart);
  }

  // show which part the customization is
  getCustomizedNum(form, form1099k) {
    let yearforms = form1099k.filter(item => item.year === form.year && item.yearPeriodStart);
    yearforms.sort((a, b) => new Date(a.createdAt).valueOf() - new Date(b.createdAt).valueOf());
    return yearforms.findIndex(f => f.createdAt === form.createdAt) + 1;
  }

  openTinTypeModal(rowIndex) {
    this.currRowIndex = rowIndex;
    this.tinType = enumTinTypes.EIN;
    this.tinTypeModal.show();
  }

  async patchTinType() {
    let newObj = { _id: this.filteredRows[this.currRowIndex].id };
    newObj['tinType'] = this.tinType === enumTinTypes.Remove ? undefined : this.tinType;
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [
      {
        old: { _id: this.filteredRows[this.currRowIndex].id, tinType: this.filteredRows[this.currRowIndex].rtTinType },
        new: newObj
      }
    ]).toPromise();
    this.restaurants.forEach(rt => {
      if (rt._id === this.filteredRows[this.currRowIndex].id) {
        rt.tinType = newObj['tinType'];
      }
    });
    this.rows = this.restaurants.map(rt => this.turnRtObjectIntoRow(rt));
    this.filterRows();
    this.tinTypeModal.hide();
  }

  downloadFIRE() {
    try {

      const download = (content) => {
        let blob = new Blob([content], {type: 'text/plain; charset=utf-8'});
        let node = document.createElement('a');
        node.href = URL.createObjectURL(blob);
        let dt = new Date();
        let y = dt.getFullYear();
        let M =  IRSHelper.pad(dt.getMonth() + 1, 2, true)
        let d = IRSHelper.pad(dt.getDate(), 2, true)
        let h = IRSHelper.pad(dt.getHours(), 2, true)
        let m = IRSHelper.pad(dt.getMinutes(), 2, true)
        let s = IRSHelper.pad(dt.getSeconds(), 2, true)
        node.download = `${this.taxYear}-tax-year_Qmenu_FIRE_Submission-created_${[y, M, d, h, m, s].join('_')}.txt`;
        node.click();
        node.remove();
      }

      const { rows, errors } = IRSHelper.generate(this.taxYear, this.rows);
      if (errors.length > 0) {
        if (confirm('Some restaurants are missing payee and/or TIN. Do you want to proceed with download anyway?')) {
          download(rows.join('\n'))
        }
      } else {
        download(rows.join('\n'));
      }
    } catch (e) {
      this._global.publishAlert(AlertType.Danger, e.message)
    }
  }

  tooltip() {
    setTimeout(() => {
      $("[data-toggle='tooltip']").tooltip();
    })
  }

  handleShowExtraTools() {
    this.showExtraTools = !this.showExtraTools;
    if (!this.showExtraTools) {
      this.toDate = '';
      this.fromDate = '';
      this.calcRTFilter = '';
      this.transactionText = '';
    } else {
      this.tooltip();
    }
  }

  /* round - helper function to address floating point math imprecision.
     e.g. sometimes a total may be expressed as '2.27999999999997'. we need to put that in the format '2.28' */
  round(num) {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }


  /* mongIdToDate - takes in the MongoDB _id and returns the encoded timestamp information as a date object
    (this functionality exists as a method of ObjectID, but this helper function acceps a string format) */
  mongoIdToDate(id, timezone) {
    const timestamp = id.substring(0, 8);
    return new Date(parseInt(timestamp, 16) * 1000).toLocaleDateString('en-US', { timeZone: timezone });
  }

  tabulateMonthlyData(orders, timezone) {
    const monthlyData = {
      0: 0,
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      6: 0,
      7: 0,
      8: 0,
      9: 0,
      10: 0,
      11: 0,
      total: 0
    }
    orders.forEach(order => {
      let month = new Date(this.mongoIdToDate(order._id, timezone)).getMonth();
      let roundedOrderTotal = this.round(order.computed.total);
      monthlyData[month] += roundedOrderTotal;
      monthlyData['total'] += roundedOrderTotal;
    });

    for (let key of Object.keys(monthlyData)) {
      // due to floating point math imprecision, we need to round every value in the monthlyData object
      monthlyData[key] = this.round(monthlyData[key]);
    }
    return monthlyData;
  }

  // has two function:
  // calculate tool of extra tool and customize 1099k
  async calcTransactionByTime(fromDate, toDate, customizeItem?) {
    if (!fromDate || !toDate) {
      return this._global.publishAlert(AlertType.Danger, "Please input a correct from time date format!");
    }

    if (new Date(fromDate).valueOf() - new Date(toDate).valueOf() > 0) {
      return this._global.publishAlert(AlertType.Danger, "Please input a correct date format, from time is less than or equals to time!");
    }
    this.transactionText = '';
    let rtId = this.isCustomize1099k ? this.filteredRows[this.currRowIndex].id : this.calcRTFilter;

    if (!rtId) {
      return this._global.publishAlert(AlertType.Danger, "Calculating transactions needs ID of restaurant!");
    }

    const [restaurant] = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        _id: {
          $oid: rtId
        }
      },
      projection: {
        "googleAddress.timezone": 1
      },
      limit: 1
    }).toPromise();

    const utcf = TimezoneHelper.getTimezoneDateFromBrowserDate(new Date(fromDate + " 00:00:00.000"), restaurant.googleAddress.timezone || 'America/New_York');
    const utct = TimezoneHelper.getTimezoneDateFromBrowserDate(new Date(toDate + " 23:59:59.999"), restaurant.googleAddress.timezone || 'America/New_York');

    const query = {
      restaurant: {
        $oid: rtId
      },
      $and: [{
        createdAt: {
          $gte: { $date: utcf }
        } // less than and greater than
      }, {
        createdAt: {
          $lt: { $date: utct }
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

    if (!this.isCustomize1099k) {
      let timeRangeData = {
        0: 0,
        transactionNum: 0,
        total: 0
      }
      orders.forEach(order => {
        let month = new Date(this.mongoIdToDate(order._id, restaurant.googleAddress.timezone || 'America/New_York')).getMonth();
        let roundedOrderTotal = this.round(order.computed.total);
        timeRangeData[month] += roundedOrderTotal;
        timeRangeData.total += roundedOrderTotal;
        timeRangeData.transactionNum++;
      });

      this.transactionText = `${timeRangeData.transactionNum} transactions totaling \$${this.round(timeRangeData.total)}`;
    } else {
      if (customizeItem) {
        /**
         * form1099k item example:
         *  {
         *  "0": 22.41,
            "1": 55.66,
            "2": 0,
            "3": 65.16,
            "4": 210.08,
            "5": 0,
            "6": 0,
            "7": 0,
            "8": 0,
            "9": 0,
            "10": 0,
            "11": 0,
            "transactions": 234,
            "year": 2021,
            "yearPeriodStart": "2021-07-16T00:00:00.000Z",
            "yearPeriodEnd": "2021-12-31T00:00:00.000Z",
            "periodTin": "55-5555555",
            "periodPayeeName": "Dragon Fly Old Name",
            "periodTinType": "EIN",
            "required": true,
            "createdAt": "2022-02-09T17:14:38.303Z",
            "total": 42454.75
        }
         *
         */
        let rt1099KData = {
          year: +this.taxYear,
          required: false,
          yearPeriodStart: fromDate,
          yearPeriodEnd: toDate,
          periodTin: customizeItem.tin,
          periodPayeeName: customizeItem.payeeName,
          periodTinType: customizeItem.tinType, // EIN is default value
          createdAt: new Date()
        } as any;
        const monthlyDataAndTotal = this.tabulateMonthlyData(orders, restaurant.googleAddress.timezone || 'America/New_York');

        if (+this.taxYear < 2022) {
          if (orders.length >= 200) {
            if (monthlyDataAndTotal.total >= 20000) {
              rt1099KData.required = true;
              rt1099KData = { transactions: orders.length, ...rt1099KData, ...monthlyDataAndTotal };
            }
          }
        } else if (+this.taxYear === 2022) {
          if (orders.length >= 1) {
            if (monthlyDataAndTotal.total >= 600) {
              rt1099KData.required = true;
              rt1099KData = { transactions: orders.length, ...rt1099KData, ...monthlyDataAndTotal };
            }
          }
        }
        if (rt1099KData.required) {
          customizeItem['transactionText'] = `${rt1099KData.transactions} transactions totaling \$${this.round(rt1099KData.total)}`;
        } else {
          customizeItem['transactionText'] = `1099K won't be generated for this period since it's not needed. (${orders.length} transactions totaling \$${monthlyDataAndTotal['total']})`;
        }
        customizeItem['rt1099KData'] = rt1099KData;
      }

    }
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
    let notSendRows = this.filteredRows.filter(row => (row.form1099k || []).some(form => form.year === +year && !form.sent && form.required && !form.yearPeriodStart) && this.allAttributesPresent(row));
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
        console.log(error);
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
              // year maybe divided several
              if (record.yearPeriodStart) {
                if (template.form.yearPeriodStart === record.yearPeriodStart && template.form.year === record.year) {
                  record.sent = true;
                }
              } else {
                if (template.form.year === record.year) {
                  record.sent = true;
                }
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
    const blob = await this.generatePDF("restaurant");
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
      // update sent flag if markSentFlag is true and not sending really
      if (this.markSentFlag) {
        // update send flag to know whether has sent email to rt
        let new1099kRecords = JSON.parse(JSON.stringify(this.currRow.form1099k));
        new1099kRecords.forEach(record => {
          // year maybe divided several
          if (this.currForm.yearPeriodStart) {
            if (this.currForm.yearPeriodStart === record.yearPeriodStart && this.currForm.year === record.year) {
              record.sent = true;
            }
          } else {
            if (this.currForm.year === record.year) {
              record.sent = true;
            }
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
        return this._global.publishAlert(AlertType.Success, `Mark the status as 'Sent' success`);
      }
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
              // year maybe divided several
              if (this.currForm.yearPeriodStart) {
                if (this.currForm.yearPeriodStart === record.yearPeriodStart && this.currForm.year === record.year) {
                  record.sent = true;
                }
              } else {
                if (this.currForm.year === record.year) {
                  record.sent = true;
                }
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
    this.markSentFlag = false;
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
        $or: [
          {
            "form1099k.required": true
          },
          {
            "form1099k.yearPeriodStart": {
              $exists: true
            }
          }
        ]
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
        payeeName: 1,
        tinType: 1
      }
    }, 5000);
    this.now = new Date();
    this.rows = this.restaurants.map(rt => this.turnRtObjectIntoRow(rt));
  }

  turnRtObjectIntoRow(rt) {
    const rtTIN = rt.tin || null;
    const rtTinType = rt.tinType || null;
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
    rt.form1099k.sort((a, b) => b.year - a.year);
    return {
      id: rt._id,
      name: rt.name,
      email,
      streetAddress,
      cityStateZip,
      form1099k: rt.form1099k,
      payeeName,
      rtTIN,
      rtTinType,
      city: ga.locality,
      state: ga.administrative_area_level_1,
      zipCode: ga.postal_code,
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
    const payeeNameExists = (row.payeeName || "").length > 0;
    const tinExists = (row.rtTIN || "").length > 0;
    return payeeNameExists && tinExists;
  }

  filterRows() {
    this.tooltip();
    /* pass through several layers of filtering based on each possible criteria:
    taxYear, showingMissingPayee, showMissingTIN, and showMissingEmail */
    this.filteredRows = JSON.parse(JSON.stringify(this.rows));

    // taxYear
    if (this.taxYear !== 'All') {
      const year = Number.parseInt(this.taxYear);
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

    // customized form1099k or not in the year
    if (this.customizeOption === customizeOptionTypes.Custom) {
      this.filteredRows = this.filteredRows.filter(row => (row.form1099k || []).some(form => form.year === +this.taxYear && form.yearPeriodStart));
    } else if (this.sentEmailOption === sentEmailOptionTypes.Form_Not_Sent) {
      this.filteredRows = this.filteredRows.filter(row => (row.form1099k || []).some(form => form.year === +this.taxYear && !form.yearPeriodStart));
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
      newObj['tin'] = event.newValue;
      this.restaurants.forEach(rt => {
        if (rt._id === this.filteredRows[rowIndex].id) {
          rt.tin = newObj['tin'];
        }
      });
    }
    if (field === 'payeeName') {
      newObj['payeeName'] = event.newValue;
      this.restaurants.forEach(rt => {
        if (rt._id === this.filteredRows[rowIndex].id) {
          rt.payeeName = newObj['payeeName'];
        }
      });
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
      const oldChannels = this.filteredRows[rowIndex].channels;
      const newChannels = [...oldChannels, newChannel];
      newObj['channels'] = newChannels;
      this.restaurants.forEach(rt => {
        if (rt._id === this.filteredRows[rowIndex].id) {
          rt.channels = newObj['channels'];
        }
      });
    }

    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [
      {
        old: { _id: this.filteredRows[rowIndex].id },
        new: newObj
      }
    ]).toPromise();
    // Maintain data consistency
    this.rows = this.restaurants.map(rt => this.turnRtObjectIntoRow(rt));
    this.filterRows();
  }

  async generatePDF(target) {
    let formTemplateUrl;
    if (target === 'qmenu') {
      formTemplateUrl = "../../../../assets/form1099k/form1099k_qmenu.pdf";
    } else if (target === 'restaurant') {
      formTemplateUrl = "../../../../assets/form1099k/form1099k.pdf";
    }
    const formBytes = await fetch(formTemplateUrl).then((res) => res.arrayBuffer());
    const pdfDoc = await PDFDocument.load(formBytes);
    const form = pdfDoc.getForm();
    // const fields = await form.getFields();

    // let allFields = '';
    // fields.forEach(field => {

    //   allFields += field.getName() + '\n';
    // })
    // console.log(allFields);

    const qMenuAddress = `
    qMenu, Inc.
    107 Technology Pkwy NW, Ste. 211
    Peachtree Corners, GA 30092`;

    // Calendar Year Blank (fill in last two digits of tax year)
    form.getTextField(`topmostSubform[0].CopyB[0].CopyBHeader[0].CalendarYear[0].f2_1[0]`).setText(this.currForm.year.toString().slice(-2));
    // Filer checkbox
    form.getCheckBox(`topmostSubform[0].CopyB[0].LeftCol[0].FILERCheckbox_ReadOrder[0].c2_3[0]`).check();

    // Transaction reporting checkbox:
    form.getCheckBox(`topmostSubform[0].CopyB[0].LeftCol[0].c2_5[0]`).check();
    // Payee's name:
    form.getTextField(`topmostSubform[0].CopyB[0].LeftCol[0].f2_2[0]`).setText(qMenuAddress);
    // Payee's Name:
    form.getTextField(`topmostSubform[0].CopyB[0].LeftCol[0].f2_3[0]`).setText(this.currForm.yearPeriodStart ? this.currForm.periodPayeeName : this.currForm.payeeName);
    // Street Address:
    form.getTextField(`topmostSubform[0].CopyB[0].LeftCol[0].f2_4[0]`).setText(this.currRow.streetAddress);
    // City, State, and ZIP Code:
    form.getTextField(`topmostSubform[0].CopyB[0].LeftCol[0].f2_5[0]`).setText(this.currRow.cityStateZip);
    // PSE's Name and Telephone Number:
    form.getTextField(`topmostSubform[0].CopyB[0].LeftCol[0].f2_6[0]`).setText('');
    // Account Number (leave blank)
    form.getTextField(`topmostSubform[0].CopyB[0].LeftCol[0].f2_7[0]`).setText('');

    // Filer's TIN
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_8[0]`).setText('81-4208444');
    // Payee's TIN
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_9[0]`).setText(this.currForm.yearPeriodStart ? this.currForm.periodTin : this.currRow.rtTIN);
    // Box 1a gross amount of payment card/third party network transactions
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_10[0]`).setText(this.currForm.total.toFixed(2));
    // Box 1b card not present transactions
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].Box1b_ReadOrder[0].f2_11[0]`).setText(this.currForm.total.toFixed(2));
    // Box 2 - Merchant category code (Always 5812 for restaurants)
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_12[0]`).setText('5812');
    // Box 3 - Number of payment transactions
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_13[0]`).setText(this.currForm.transactions.toString());
    // Box 4 - Federal income tax withheld
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_14[0]`).setText('');
    // Box 5a - January income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].Box5a_ReadOrder[0].f2_15[0]`).setText(this.currForm[0] ? this.currForm[0].toFixed(2) : "0.00");
    // Box 5b - February income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_16[0]`).setText(this.currForm[1] ? this.currForm[1].toFixed(2) : "0.00");
    // Box 5c - March income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].Box5c_ReadOrder[0].f2_17[0]`).setText(this.currForm[2] ? this.currForm[2].toFixed(2) : "0.00");
    // Box 5d - April income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_18[0]`).setText(this.currForm[3] ? this.currForm[3].toFixed(2) : "0.00");
    // Box 5e - May income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].Box5e_ReadOrder[0].f2_19[0]`).setText(this.currForm[4] ? this.currForm[4].toFixed(2) : "0.00");
    // Box 5f - June income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_20[0]`).setText(this.currForm[5] ? this.currForm[5].toFixed(2) : "0.00");
    // Box 5g - July income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].Box5g_ReadOrder[0].f2_21[0]`).setText(this.currForm[6] ? this.currForm[6].toFixed(2) : "0.00");
    // Box 5h - August income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_22[0]`).setText(this.currForm[7] ? this.currForm[7].toFixed(2) : "0.00");
    // Box 5i - September income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].Box5i_ReadOrder[0].f2_23[0]`).setText(this.currForm[8] ? this.currForm[8].toFixed(2) : "0.00");
    // Box 5j - October income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_24[0]`).setText(this.currForm[9] ? this.currForm[9].toFixed(2) : "0.00");
    // Box 5k - November income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].Box5k_ReadOrder[0].f2_25[0]`).setText(this.currForm[10] ? this.currForm[10].toFixed(2) : "0.00");
    // Box 5l - December income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_26[0]`).setText(this.currForm[11] ? this.currForm[11].toFixed(2) : "0.00");
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
    this.currRow = row;
    this.currForm = form1099KData;
    const blob = await this.generatePDF(target);
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    // 2021_Form_1099K_58ba1a8d9b4e441100d8cdc1_forRT.pdf
    // 2021_Form_1099K_58ba1a8d9b4e441100d8cdc1_forQM.pdf
    link.download = `${form1099KData.year}_Form_1099K_${row.id}_for${target === 'qmenu' ? 'QM' : 'RT'}.pdf`
    link.click();
    link.remove();
  }


}

