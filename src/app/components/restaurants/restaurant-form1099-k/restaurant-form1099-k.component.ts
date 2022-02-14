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

@Component({
  selector: 'app-restaurant-form1099-k',
  templateUrl: './restaurant-form1099-k.component.html',
  styleUrls: ['./restaurant-form1099-k.component.css'],
  providers: [CurrencyPipe, DatePipe]
})

export class Form1099KComponent implements OnInit {
  @Input() restaurant;
  @ViewChild('sendEmailModal') sendEmailModal: ModalComponent;
  formLinks = [];
  showExplanation = false;
  emails = [];
  email = '';
  template;
  noFormLinksData = false;
  constructor(private _api: ApiService, private _global: GlobalService, private sanitizer: DomSanitizer) { }

  async ngOnInit() {
    this.populateFormLinks();
    this.populateEmails();
  }

  fillMessageTemplate(template, dataset, regex = /\{\{([A-Z_]+)}}/g) {
    return template.replace(regex, (_, p1) => dataset[p1]);
  }

  sanitized(origin) {
    return this.sanitizer.bypassSecurityTrustHtml(origin);
  }

  sendPDFFormToRT() {
    this.template.value = this.email;
    if (!this.template.value) {
      return this._global.publishAlert(AlertType.Danger, 'Please select an valid email!');
    }
    const jobs = [{
      'name': 'send-email',
      'params': {
        'to': this.template.value,
        'subject': this.template.subject,
        'html': this.template.html,
        'trigger': {
          'id': this._global.user._id,
          'name': this._global.user.username,
          'source': 'CSR',
          'module': '1099K Form'
        }
      }
    }];

    this._api.post(environment.qmenuApiUrl + 'events/add-jobs', jobs)
      .subscribe(
        () => {
          this._global.publishAlert(AlertType.Success, 'Email message sent success');
          // update send flag to know whether has sent email to rt
          let new1099kRecords = JSON.parse(JSON.stringify(this.restaurant.form1099k));
          new1099kRecords.forEach(record => {
            if(record.year === this.template.year){
              record.sent = true;
            }
          });
          this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [
            {
              old: { _id: this.restaurant._id, form1099k: this.restaurant.form1099k },
              new: { _id: this.restaurant._id, form1099k: new1099kRecords }
            }
          ]).toPromise();
          this._global.publishAlert(
            AlertType.Success,
            `Updated Form 1099k records success!`
          );
          this.restaurant.form1099k = new1099kRecords;
          this.populateFormLinks();
          this.sendEmailModal.hide();
        },
        error => {
          console.log(error);
          this._global.publishAlert(AlertType.Danger, 'Email message sent failed!');
        }
      );
  }

  openSendEmailModal(year) {
    let dataset = {
      'LAST_YEAR': year,
      'RT_NAME': this.restaurant.name
    }
    this.email = '';
    this.template = {
      value: this.email,
      subject: `1099-K Form for ${year}`,
      html: this.fillMessageTemplate(form1099kEmailTemplate, dataset),
      year: year
    }
    this.sendEmailModal.show();
  }

  populateFormLinks() {
    this.formLinks = [];
    const years = [2020, 2021];
    for (let year of years) {
      let yearForm1099kData = (this.restaurant.form1099k || []).find(form => form.year === year);
      if (yearForm1099kData) {
        this.formLinks.push([yearForm1099kData, year]);
      } else {
        this.formLinks.push([null, year]);
      }
    }
  }

  populateEmails() {
    this.emails = (this.restaurant.channels || []).filter(ch => ch.type === 'Email' && (ch.notifications || []).includes('Invoice')).map(ch => ch.value); // RT *must* have an invoice email channel
  }

  allAttributesPresent() {
    const emailExists = this.emails.length > 0;
    const payeeNameExists = (this.restaurant.payeeName || "").length > 0;
    const tinExists = (this.restaurant.tin || "").length > 0;
    return emailExists && payeeNameExists && tinExists;
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
  mongoIdToDate(id) {
    const timestamp = id.substring(0, 8);
    return new Date(parseInt(timestamp, 16) * 1000);
  }

  round(num) {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }

  tabulateMonthlyData(orders) {
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
      let month = new Date(this.mongoIdToDate(order._id)).getMonth();
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

  // calculates form1099k of rt, and repopulates formLinks
  async calculateForm1099k(year) {
    const orders = await this.populateOrdersForYear(year);

    let rt1099KData = {
      year: year,
      required: false,
      createdAt: new Date()
    } as any;

    if (orders.length >= 200) {
      const monthlyDataAndTotal = this.tabulateMonthlyData(orders);
      if (monthlyDataAndTotal.total >= 20000) {
        rt1099KData.required = true
        rt1099KData = { transactions: orders.length, ...rt1099KData, ...monthlyDataAndTotal };
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

  // download PDF according to target
  async renderPDFForm(target, year) {
    const rtTIN = this.restaurant.tin || null;
    const payeeName = this.restaurant.payeeName || null;
    const email = (this.restaurant.channels || []).filter(ch => ch.type === 'Email' && (ch.notifications || []).includes('Invoice')).map(ch => ch.value); // RT *must* have an invoice email channel
    const ga = this.restaurant.googleAddress;
    const streetAddress = `${ga.street_number} ${ga.route}`;
    const cityStateZip = `${ga.locality}, ${ga.administrative_area_level_1} ${ga.postal_code}`
    let rt = {
      name: this.restaurant.name,
      email,
      streetAddress,
      cityStateZip,
      form1099k: this.restaurant.form1099k,
      payeeName,
      rtTIN,
    }
    let yearForm1099kData = (rt.form1099k || []).find(form => form.year === year);

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
    form.getTextField(`topmostSubform[0].CopyB[0].CopyBHeader[0].CalendarYear[0].f2_1[0]`).setText(yearForm1099kData.year.toString().slice(-2));
    // Filer checkbox
    form.getCheckBox(`topmostSubform[0].CopyB[0].LeftCol[0].FILERCheckbox_ReadOrder[0].c2_3[0]`).check();

    // Transaction reporting checkbox:
    form.getCheckBox(`topmostSubform[0].CopyB[0].LeftCol[0].c2_5[0]`).check();
    // Payee's name:
    form.getTextField(`topmostSubform[0].CopyB[0].LeftCol[0].f2_2[0]`).setText(qMenuAddress);
    // Payee's Name:
    form.getTextField(`topmostSubform[0].CopyB[0].LeftCol[0].f2_3[0]`).setText(rt.payeeName);
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
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_9[0]`).setText(rt.rtTIN)
    // Box 1b card not present transactions
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].Box1b_ReadOrder[0].f2_11[0]`).setText(yearForm1099kData.total.toFixed(2));
    // Box 2 - Merchant category code (Always 5812 for restaurants)
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_12[0]`).setText('5812');
    // Box 3 - Number of payment transactions
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_13[0]`).setText(yearForm1099kData.transactions.toString());
    // Box 4 - Federal income tax withheld
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_14[0]`).setText('');
    // Box 5a - January income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].Box5a_ReadOrder[0].f2_15[0]`).setText(yearForm1099kData[0].toFixed(2));
    // Box 5b - February income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_16[0]`).setText(yearForm1099kData[1].toFixed(2));
    // Box 5c - March income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].Box5c_ReadOrder[0].f2_17[0]`).setText(yearForm1099kData[2].toFixed(2))
    // Box 5d - April income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_18[0]`).setText(yearForm1099kData[3].toFixed(2))
    // Box 5e - May income

    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].Box5e_ReadOrder[0].f2_19[0]`).setText(yearForm1099kData[4].toFixed(2));
    // Box 5f - June income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_20[0]`).setText(yearForm1099kData[5].toFixed(2));
    // Box 5g - July income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].Box5g_ReadOrder[0].f2_21[0]`).setText(yearForm1099kData[6].toFixed(2));
    // Box 5h - August income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_22[0]`).setText(yearForm1099kData[7].toFixed(2));
    // Box 5i - September income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].Box5i_ReadOrder[0].f2_23[0]`).setText(yearForm1099kData[8].toFixed(2));
    // Box 5j - October income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_24[0]`).setText(yearForm1099kData[9].toFixed(2));
    // Box 5k - November income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].Box5k_ReadOrder[0].f2_25[0]`).setText(yearForm1099kData[10].toFixed(2));
    // Box 5l - December income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_26[0]`).setText(yearForm1099kData[11].toFixed(2));
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

    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `f1099k_${yearForm1099kData.year}_${rt.name}_for${target === 'qmenu' ? '_qmenu' : '_restaurant'}.pdf`;
    link.click();
  }

}

