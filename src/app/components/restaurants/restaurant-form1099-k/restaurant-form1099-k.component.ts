import { HttpClient } from '@angular/common/http';
import { DomSanitizer } from '@angular/platform-browser';
import { AlertType } from 'src/app/classes/alert-type';
import { GlobalService } from './../../../services/global.service';
import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { PDFDocument } from 'pdf-lib';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { TimezoneHelper } from '@qmenu/ui';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import { form1099kEmailTemplate } from './html-email-templates';
declare var $: any;
enum enumTinTypes {
  Remove = '',
  EIN = 'EIN',
  SSN = 'SSN'
}

@Component({
  selector: 'app-restaurant-form1099-k',
  templateUrl: './restaurant-form1099-k.component.html',
  styleUrls: ['./restaurant-form1099-k.component.css'],
  providers: [CurrencyPipe, DatePipe]
})

export class Form1099KComponent implements OnInit {
  @Input() restaurant;
  @ViewChild('sendEmailModal') sendEmailModal: ModalComponent;
  @ViewChild('tinTypeModal') tinTypeModal: ModalComponent;
  @ViewChild('customize1099kModal') customize1099kModal: ModalComponent;
  formLinks = [];
  showExplanation = false;
  emails = [];
  allEmails = [];
  targets = [];
  template;
  sendLoading = false;
  tinTypes = [enumTinTypes.EIN, enumTinTypes.SSN, enumTinTypes.Remove];
  tinType = enumTinTypes.EIN;
  customizeTinTypes = [enumTinTypes.EIN, enumTinTypes.SSN];
  customize1099kList = [];
  taxYearOptions = [
    '2022',
    '2021',
    '2020',
  ];
  skipAutoInvoicing = false;
  taxYear = '';
  markSentFlag = false;// if it is true, the email won't actually be sent, it'll simply mark the status as "Sent" for that restaurant for that tax year.
  currForm;
  constructor(private _api: ApiService, private _global: GlobalService, private sanitizer: DomSanitizer, private _http: HttpClient) { }

  async ngOnInit() {
    this.skipAutoInvoicing = this.restaurant.skipAutoInvoicing;
    $("[data-toggle='tooltip']").tooltip();
    this.populateFormLinks();
    this.populateEmails();
  }
  // send button will be disabled when no invoice type emails
  disableSendBtn() {
    return this.emails.length === 0;
  }

  async updateSkipAutoInvoicing() {
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
      old: { _id: this.restaurant['_id'] },
      new: { _id: this.restaurant['_id'], skipAutoInvoicing: this.skipAutoInvoicing }
    }]).toPromise();
    this.restaurant.skipAutoInvoicing = this.skipAutoInvoicing;
  }

  /*
  Add ability to calculate, separate, and save separately,
  1099K info for a specific restaurant for different portions of the tax year
  and generate multiple 1099Ks, from the 1099K dashboard.
  */
  openCustomize1099kModal() {
    this.customize1099kList = [];
    // show saved data last times if it exists
    let customizedYear1099k = (this.restaurant.form1099k || []).filter(form => form.year === +this.taxYear && form.yearPeriodStart);
    if (customizedYear1099k.length > 0) {
      customizedYear1099k.sort((a, b) => new Date(a.yearPeriodStart).valueOf() - new Date(b.yearPeriodStart).valueOf());
      for (let i = 0; i < customizedYear1099k.length; i++) {
        const customizedForm = customizedYear1099k[i];
        let item = {
          tin: customizedForm.periodTin,
          payeeName: customizedForm.periodPayeeName,
          tinType: customizedForm.periodTinType || enumTinTypes.EIN,// EIN is defalut value
          fromDate: customizedForm.yearPeriodStart,//  e.g.: 2022-01-01
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
        tinType: enumTinTypes.EIN,// EIN is defalut value
        fromDate: `${this.taxYear}-01-01`,//  e.g.: 2022-01-01
        toDate: ''
      };
      this.customize1099kList.push(item);
    }
    this.customize1099kModal.show();
  }

  closeCustomize1099kModal() {
    this.customize1099kModal.hide();
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
      tin: this.restaurant.tin,
      payeeName: this.restaurant.payeeName,
      tinType: enumTinTypes.EIN,
      fromDate: '',//  e.g.: 2022-01-01
      toDate: `${this.taxYear}-12-31` // e.g. 2021.12.31 date should cover one year
    }
    this.customize1099kList.push(item);
  }

  async patchCustom1099k() {
    let newObj = {
      _id: this.restaurant._id,
      form1099k: this.restaurant.form1099k
    }
    newObj.form1099k = newObj.form1099k.filter(item => item.year !== +this.taxYear);
    this.customize1099kList.forEach(item => {
      newObj.form1099k.push(item.rt1099KData);
    });
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [
      {
        old: { _id: this.restaurant._id },
        new: newObj
      }
    ]).toPromise();
    // update origin data
    this.restaurant.form1099k = newObj.form1099k;
    this.populateFormLinks();
    this._global.publishAlert(AlertType.Success, `Customized form 1099k for restaurant ${this.restaurant.name}!`);
    this.closeCustomize1099kModal();
  }

  // btn will show diff text according to this function
  hasCustomOfThisYear(form1099k) {
    return form1099k.some(item => item.year === +this.taxYear && item.yearPeriodStart);
  }

  // show which part the customization is
  getCustomizedNum(form) {
    let yearforms = (this.restaurant.form1099k || []).filter(item => item.year === form.year && item.yearPeriodStart);
    yearforms.sort((a, b) => new Date(a.createdAt).valueOf() - new Date(b.createdAt).valueOf());
    return yearforms.findIndex(f => f.createdAt === form.createdAt) + 1;
  }

  // calculate tool of customize 1099k
  async calcTransactionByTime(fromDate, toDate, customizeItem) {
    if (!fromDate || !toDate) {
      return this._global.publishAlert(AlertType.Danger, "Please input a correct from time date format!");
    }

    if (new Date(fromDate).valueOf() - new Date(toDate).valueOf() > 0) {
      return this._global.publishAlert(AlertType.Danger, "Please input a correct date format, from time is less than or equals to time!");
    }

    const utcf = TimezoneHelper.getTimezoneDateFromBrowserDate(new Date(fromDate + " 00:00:00.000"), this.restaurant.googleAddress.timezone || 'America/New_York');
    const utct = TimezoneHelper.getTimezoneDateFromBrowserDate(new Date(toDate + " 23:59:59.999"), this.restaurant.googleAddress.timezone || 'America/New_York');

    const query = {
      restaurant: {
        $oid: this.restaurant._id
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
    const monthlyDataAndTotal = this.tabulateMonthlyData(orders, this.restaurant.googleAddress.timezone || 'America/New_York');

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

  openTinTypeModal() {
    this.tinType = enumTinTypes.EIN;
    this.tinTypeModal.show();
  }

  async patchTinType() {
    let newObj = { _id: this.restaurant._id };
    newObj['tinType'] = this.tinType === enumTinTypes.Remove ? undefined : this.tinType;
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [
      {
        old: { _id: this.restaurant._id, tinType: this.restaurant.tinType },
        new: newObj
      }
    ]).toPromise();
    this.restaurant.tinType = newObj['tinType'];
    this.tinTypeModal.hide();
  }

  prunedRestaurantRequriedData() {
    const rtTIN = this.restaurant.tin || null;
    const payeeName = this.restaurant.payeeName || null;
    const email = (this.restaurant.channels || []).filter(ch => ch.type === 'Email' && (ch.notifications || []).includes('Invoice')).map(ch => ch.value); // RT *must* have an invoice email channel
    const ga = this.restaurant.googleAddress;
    const streetAddress = `${ga.street_number} ${ga.route}`;
    const cityStateZip = `${ga.locality}, ${ga.administrative_area_level_1} ${ga.postal_code}`
    return {
      _id: this.restaurant._id,
      name: this.restaurant.name,
      email,
      streetAddress,
      cityStateZip,
      form1099k: this.restaurant.form1099k,
      payeeName,
      rtTIN,
    };
  }

  fillMessageTemplate(template, dataset, regex = /\{\{([A-Z_]+)}}/g) {
    return template.replace(regex, (_, p1) => dataset[p1]);
  }

  sanitized(origin) {
    return this.sanitizer.bypassSecurityTrustHtml(origin);
  }

  async uploadPDF() {
    let mediaUrl;
    let rt = this.prunedRestaurantRequriedData();
    const blob = await this.generatePDF("restaurant", rt);
    const currentFile = new File([blob], `${this.currForm.year}_Form_1099K_${rt._id}_forRT.pdf`);
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
        let new1099kRecords = JSON.parse(JSON.stringify(this.restaurant.form1099k));
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
            old: { _id: this.restaurant._id },
            new: { _id: this.restaurant._id, form1099k: new1099kRecords }
          }
        ]).toPromise();
        this.restaurant.form1099k = new1099kRecords;
        this.populateFormLinks();
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
            let new1099kRecords = JSON.parse(JSON.stringify(this.restaurant.form1099k));
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
                old: { _id: this.restaurant._id },
                new: { _id: this.restaurant._id, form1099k: new1099kRecords }
              }
            ]).toPromise();
            this.restaurant.form1099k = new1099kRecords;
            this.populateFormLinks();
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
      console.log("File uploading fail due to network error, please refresh the page and retry again!");
    }
  }

  selectTarget(e, target) {
    if (e.target.checked) {
      this.targets.push(target);
    } else {
      this.targets = this.targets.filter(x => x !== target);
    }
  }

  openSendEmailModal(formLink) {
    const [formEntry, year] = formLink;
    this.currForm = formEntry;
    this.markSentFlag = false;
    let dataset = {
      'LAST_YEAR': year,
      'RT_NAME': this.restaurant.name
    }
    this.targets = [];
    this.allEmails = (this.restaurant.channels || []).filter(ch => ch.type === 'Email');
    // if invoice emails, set them to target by default
    this.allEmails.forEach(email => {
      if ((email.notifications || []).includes('Invoice')) {
        this.targets.push(email);
      }
    });
    this.template = {
      subject: `1099-K Form for ${year}`,
      html: this.fillMessageTemplate(form1099kEmailTemplate, dataset),
      year: year,
      inputs: [
        {
          label: "Restaurant Name",
          value: this.restaurant.name,
          apply: (tpl, value) => this.fillMessageTemplate(tpl, { "RT_NAME": value }, /%%(RT_NAME)%%/g)
        }]
    }
    this.sendEmailModal.show();
  }

  populateFormLinks() {
    this.formLinks = [];
    const years = [2022, 2021, 2020];
    (this.restaurant.form1099k || []).sort((a, b) => b[1] - a[1]);
    for (let year of years) {
      if ((this.restaurant.form1099k || []).some(form => form.year === year)) {
        let yearForm1099kDatas = (this.restaurant.form1099k || []).filter(form => form.year === year);
        yearForm1099kDatas.forEach(form => {
          this.formLinks.push([form, year]);
        });
      } else {
        this.formLinks.push([null, year]);
      }
    }
  }

  populateEmails() {
    this.emails = (this.restaurant.channels || []).filter(ch => ch.type === 'Email' && (ch.notifications || []).includes('Invoice')).map(ch => ch.value); // RT *must* have an invoice email channel
  }

  allAttributesPresent() {
    const payeeNameExists = (this.restaurant.payeeName || "").length > 0;
    const tinExists = (this.restaurant.tin || "").length > 0;
    return payeeNameExists && tinExists;
  }

  async onEdit(event, field: string) {
    let newObj = { _id: this.restaurant._id };
    if (field === 'rtTIN') {
      this.restaurant.tin = newObj['tin'] = event.newValue;
    }
    if (field === 'payeeName') {
      this.restaurant.payeeName = newObj['payeeName'] = event.newValue;
    }
    if (field === 'Email') {
      /* we only allow user to submit email if one does not already exist.
      to avoid possible confusion, will not allow users to edit existing channels from this component*/
      const newChannel = {
        type: 'Email',
        value: event.newValue,
        notifications: ['Invoice']
      }
      this.restaurant.channels = newObj['channels'] = [...(this.restaurant.channels || []), newChannel];
      this.populateEmails();
    }
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [
      {
        old: { _id: this.restaurant._id },
        new: newObj
      }
    ]).toPromise();
  }

  async populateOrdersForYear(year) {
    const query = {
      restaurant: {
        $oid: this.restaurant._id
      },
      "paymentObj.method": "QMENU"
    } as any;

    let orders = [];
    let fromDate = new Date(year + "-1-1 00:00:00.000");
    // January to June, July to December
    for (let i = 0; i < 2; i++) {
      let toDate = new Date(fromDate);
      toDate.setMonth(fromDate.getMonth() + 6, 1);
      const utcf = TimezoneHelper.getTimezoneDateFromBrowserDate(fromDate, this.restaurant.googleAddress.timezone);
      const utct = TimezoneHelper.getTimezoneDateFromBrowserDate(toDate, this.restaurant.googleAddress.timezone);
      query["$and"] = [{
        createdAt: {
          $gte: { $date: utcf }
        } // less than and greater than
      }, {
        createdAt: {
          $lt: { $date: utct }
        }
      }]
      let tempOrders = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'order',
        query: query,
        projection: {
          "computed.total": 1
        },
        limit: 100000000000000000
      }).toPromise();
      orders = [...orders, ...tempOrders];
      fromDate.setMonth(toDate.getMonth(), 1);
    }
    return orders;
  }
  /* mongIdToDate - takes in the MongoDB _id and returns the encoded timestamp information as a date object
       (this functionality exists as a method of ObjectID, but this helper function acceps a string format) */
  mongoIdToDate(id, timezone) {
    const timestamp = id.substring(0, 8);
    return new Date(parseInt(timestamp, 16) * 1000).toLocaleDateString('en-US', { timeZone: timezone });
  }

  round(num) {
    return Math.round((num + Number.EPSILON) * 100) / 100;
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

  disbleCalBtn(formLink) {
    const [formEntry, year] = formLink;
    if (year < 2022) {
      return true;
    }
    if (year >= 2022) {
      return new Date().getFullYear() <= year;
    }
  }

  // calculates form1099k of rt, and repopulates formLinks
  async calculateForm1099k(formLink) {
    const [formEntry, year] = formLink;
    const orders = await this.populateOrdersForYear(year);

    let rt1099KData = {
      year: year,
      required: false,
      createdAt: new Date()
    } as any;
    if (year < 2022) {
      if (orders.length >= 200) {
        const monthlyDataAndTotal = this.tabulateMonthlyData(orders, this.restaurant.googleAddress.timezone || 'America/New_York');
        if (monthlyDataAndTotal.total >= 20000) {
          rt1099KData.required = true;
          rt1099KData = { transactions: orders.length, ...rt1099KData, ...monthlyDataAndTotal };
        }
      }
    } else if (year === 2022) {
      if (orders.length >= 1) {
        const monthlyDataAndTotal = this.tabulateMonthlyData(orders, this.restaurant.googleAddress.timezone || 'America/New_York');
        if (monthlyDataAndTotal.total >= 600) {
          rt1099KData.required = true;
          rt1099KData = { transactions: orders.length, ...rt1099KData, ...monthlyDataAndTotal };
        }
      }
    }

    let existing1099kRecords = this.restaurant.form1099k || [];
    let new1099kRecords = [...existing1099kRecords, rt1099KData];
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [
      {
        old: { _id: this.restaurant._id, form1099k: existing1099kRecords },
        new: { _id: this.restaurant._id, form1099k: new1099kRecords }
      }
    ]).toPromise();
    this._global.publishAlert(
      AlertType.Success,
      `Updated Form 1099k records success!`
    );
    this.restaurant.form1099k = new1099kRecords;
    this.populateFormLinks();
  }

  async generatePDF(target, rt) {
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
    form.getTextField(`topmostSubform[0].CopyB[0].CopyBHeader[0].CalendarYear[0].f2_1[0]`).setText(this.currForm.year.toString().slice(-2));
    // Filer checkbox
    form.getCheckBox(`topmostSubform[0].CopyB[0].LeftCol[0].FILERCheckbox_ReadOrder[0].c2_3[0]`).check();

    // Transaction reporting checkbox:
    form.getCheckBox(`topmostSubform[0].CopyB[0].LeftCol[0].c2_5[0]`).check();
    // Payee's name:
    form.getTextField(`topmostSubform[0].CopyB[0].LeftCol[0].f2_2[0]`).setText(qMenuAddress);
    // Payee's Name:
    form.getTextField(`topmostSubform[0].CopyB[0].LeftCol[0].f2_3[0]`).setText(this.currForm.yearPeriodStart ? this.currForm.periodPayeeName : rt.payeeName);
    // Street Address:
    form.getTextField(`topmostSubform[0].CopyB[0].LeftCol[0].f2_4[0]`).setText(rt.streetAddress);
    // City, State, and ZIP Code:
    form.getTextField(`topmostSubform[0].CopyB[0].LeftCol[0].f2_5[0]`).setText(rt.cityStateZip);
    // PSE's Name and Telephone Number:
    form.getTextField(`topmostSubform[0].CopyB[0].LeftCol[0].f2_6[0]`).setText('');
    // Account Number (leave blank)
    form.getTextField(`topmostSubform[0].CopyB[0].LeftCol[0].f2_7[0]`).setText('');

    // Filer's TIN
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_8[0]`).setText('81-4208444');
    // Payee's TIN
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_9[0]`).setText(this.currForm.yearPeriodStart ? this.currForm.periodTin : rt.rtTIN)
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
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_24[0]`).setText(this.currForm[9] ? this.currForm[9].toFixed(2) : "0");
    // Box 5k - November income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].Box5k_ReadOrder[0].f2_25[0]`).setText(this.currForm[10] ? this.currForm[10].toFixed(2) : "0");
    // Box 5l - December income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_26[0]`).setText(this.currForm[11] ? this.currForm[11].toFixed(2) : "0");
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

  // download PDF according to target
  async renderPDFForm(target, formLink) {
    const [formEntry, year] = formLink;
    this.currForm = formEntry;
    let rt = this.prunedRestaurantRequriedData();
    const blob = await this.generatePDF(target, rt);
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    // 2021_Form_1099K_58ba1a8d9b4e441100d8cdc1_forRT.pdf
    // 2021_Form_1099K_58ba1a8d9b4e441100d8cdc1_forQM.pdf
    link.download = `${this.currForm.year}_Form_1099K_${rt._id}_for${target === 'qmenu' ? 'QM' : 'RT'}.pdf`
    link.click();
    link.remove();
  }

}

