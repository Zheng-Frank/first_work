import { Component, OnInit, ViewChild, Input, SimpleChanges, OnChanges } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { Invoice } from '../../../classes/invoice';
import { ModalComponent } from "@qmenu/ui/bundles/qmenu-ui.umd";
import { PDFDocument } from 'pdf-lib';


import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";
import { mergeMap, observeOn } from 'rxjs/operators';
import { FeeSchedule, Restaurant, Order } from '@qmenu/ui';
import { Log } from "../../../classes/log";
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Channel } from '../../../classes/channel';
import { Helper } from "../../../classes/helper";

@Component({
  selector: 'app-restaurant-form1099-k',
  templateUrl: './restaurant-form1099-k.component.html',
  styleUrls: ['./restaurant-form1099-k.component.css'],
  providers: [CurrencyPipe, DatePipe]
})

export class Form1099KComponent implements OnInit {

  orders: Order[] = [];
  calculationComplete = false;
  form1099kRequired = false;
  displayMessage = false;

  orderCount = 0;
  sumOfTransactions = 0;

  formLink;

  @Input() restaurant: Restaurant;


  constructor(private _route: ActivatedRoute, private _api: ApiService, private _global: GlobalService, private currencyPipe: CurrencyPipe, private datePipe: DatePipe, private sanitizer: DomSanitizer) { }

  ngOnInit() {
  }

  async populateOrders() {
    const lastYear = new Date().getFullYear() - 1;

    const query = {
      restaurant: {
        $oid: this.restaurant._id
      },
      "paymentObj.method": "QMENU",
      $expr: {
        $eq: [{ $year: "$createdAt" }, lastYear]
      }
    }

    const orders = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "order",
      query: query,
      projection: {
        logs: 0,
      },
      sort: {
        createdAt: -1
      },
      limit: 25000
    }).toPromise();

    // assemble back to order:
    this.orders = orders.map(order => {
      order.customer = order.customerObj;
      order.payment = order.paymentObj;
      order.orderStatuses = order.statuses;
      order.id = order._id;
      order.customerNotice = order.customerNotice || '';
      order.restaurantNotie = order.restaurantNotie || '';
      // making it back-compatible to display bannedReasons

      return new Order(order);
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.restaurant) {
      this.populateOrders();
    }
  }

  async checkIndividualRestaurant() {
    // Eventually: query db for this restaurant for an already existing 1099k for this year
    const restaurantTotals = {
      orderCount: 0,
      sumOfTransactions: 0
    };

    for (const order of this.orders) {
      if (order.orderStatuses[order.orderStatuses.length - 1].status !== "CANCELED") {
        const total = order.getTotal();
        const roundedTotal = Math.round(100 * (total + Number.EPSILON)) / 100;
        restaurantTotals.sumOfTransactions += roundedTotal;
        restaurantTotals.orderCount += 1;
      }
    }

    this.calculationComplete = true;

    // THESE ARE NOT THE CORRECT VALUES. orderCount should be 200 and sumOfTransactions should be 20000
    if (restaurantTotals.orderCount >= 50 && restaurantTotals.sumOfTransactions >= 1500) {
      this.form1099kRequired = true;
      const restaurantAddress = this.restaurant.googleAddress;
      const form1099KData = {
        name: this.restaurant.name,
        formUrl: '',
        year: new Date().getFullYear() - 1,
        orderCount: restaurantTotals.orderCount,
        sumOfTransactions: restaurantTotals.sumOfTransactions,
        streetAddress: restaurantAddress.street_number + " " + restaurantAddress.route,
        cityStateAndZip: restaurantAddress.locality + ", " + restaurantAddress.administrative_area_level_1 + " " + restaurantAddress.postal_code,
        monthlyTotals: {
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
        }
      };

      for (const order of this.orders) {
        if (order.orderStatuses[order.orderStatuses.length - 1].status !== "CANCELED") {
          const total = order.getTotal();
          const roundedTotal = Math.round(100 * (total + Number.EPSILON)) / 100;
          form1099KData.monthlyTotals[new Date(order.createdAt).getMonth()] += roundedTotal;
        }
      }

      this.generateForm1099kPDF(form1099KData);
    } else {
      this.displayMessage = true;
    }
  }
  async generateForm1099kPDF(form1099KData) {
    const formTemplateUrl = "../../../../assets/form1099k/f1099k.pdf"
    const formBytes = await fetch(formTemplateUrl).then((res) => res.arrayBuffer());
    const pdfDoc = await PDFDocument.load(formBytes);
    const form = pdfDoc.getForm();

    // This block of code will retrieve all the field names in a file, but isn't necessrary to
    // actually generate the form if you already know the names.

    // const fields = form.getFields();
    // fields.forEach(field => {
    //   const name = field.getName();
    //   console.log('Field name: ', name);
    // })

    const qMenuAddress = `
    qMenu, Inc.
    107 Technology Pkwy NW, Ste. 211
    Peachtree Corners, GA 30092`;

    // Filer's name
    form.getTextField('topmostSubform[0].Copy1[0].LeftCol[0].f2_1[0]').setText(qMenuAddress);
    // Filer checkbox
    form.getCheckBox('topmostSubform[0].Copy1[0].LeftCol[0].FILERCheckbox_ReadOrder[0].c2_3[0]').check();

    // Transaction reporting checkbox
    form.getCheckBox('topmostSubform[0].Copy1[0].LeftCol[0].c2_5[0]').check();
    // Payee's name
    form.getTextField('topmostSubform[0].Copy1[0].LeftCol[0].f2_2[0]').setText(form1099KData.name);
    // Street address
    form.getTextField('topmostSubform[0].Copy1[0].LeftCol[0].f2_3[0]').setText(form1099KData.streetAddress);
    // City, State, and ZIP code
    form.getTextField('topmostSubform[0].Copy1[0].LeftCol[0].f2_4[0]').setText(form1099KData.cityStateAndZip);
    // PSE name and telephone
    form.getTextField('topmostSubform[0].Copy1[0].LeftCol[0].f2_5[0]').setText('Name and phone');
    // Account number
    form.getTextField('topmostSubform[0].Copy1[0].LeftCol[0].f2_6[0]').setText('account number');
    // Filer's TIN
    form.getTextField('topmostSubform[0].Copy1[0].RghtCol[0].f2_7[0]').setText('Filer TIN');
    // Payee's TIN
    form.getTextField('topmostSubform[0].Copy1[0].RghtCol[0].f2_8[0]').setText('Payee TIN');
    // Box 1a Gross amount
    form.getTextField('topmostSubform[0].Copy1[0].RghtCol[0].f2_9[0]').setText(form1099KData.sumOfTransactions.toString())
    // Box 1b card not present transactions
    form.getTextField('topmostSubform[0].Copy1[0].RghtCol[0].Box1b_ReadOrder[0].f2_10[0]').setText(form1099KData.sumOfTransactions.toString())
    // Box 2 - Merchant category code (Always 5812 for restaurants)
    form.getTextField('topmostSubform[0].Copy1[0].RghtCol[0].f2_11[0]').setText('5812');
    // Box 3 - Number of payment transactions
    form.getTextField('topmostSubform[0].Copy1[0].RghtCol[0].f2_12[0]').setText(form1099KData.orderCount.toString())
    // Box 4 - Federal income tax withheld
    form.getTextField('topmostSubform[0].Copy1[0].RghtCol[0].f2_13[0]').setText('');
    // Box 5a - January income
    form.getTextField('topmostSubform[0].Copy1[0].RghtCol[0].Box5a_ReadOrder[0].f2_14[0]').setText(form1099KData.monthlyTotals[0].toString());
    // Box 5b - February income
    form.getTextField('topmostSubform[0].Copy1[0].RghtCol[0].f2_15[0]').setText(form1099KData.monthlyTotals[1].toString());
    // Box 5c - March income
    form.getTextField('topmostSubform[0].Copy1[0].RghtCol[0].Box5c_ReadOrder[0].f2_16[0]').setText(form1099KData.monthlyTotals[2].toString())
    // Box 5d - April income
    form.getTextField('topmostSubform[0].Copy1[0].RghtCol[0].f2_17[0]').setText(form1099KData.monthlyTotals[3].toString())
    // Box 5e - May income
    form.getTextField('topmostSubform[0].Copy1[0].RghtCol[0].Box5e_ReadOrder[0].f2_18[0]').setText(form1099KData.monthlyTotals[4].toString());
    // Box 5f - June income
    form.getTextField('topmostSubform[0].Copy1[0].RghtCol[0].f2_19[0]').setText(form1099KData.monthlyTotals[5].toString());
    // Box 5g - July income
    form.getTextField('topmostSubform[0].Copy1[0].RghtCol[0].Box5g_ReadOrder[0].f2_20[0]').setText(form1099KData.monthlyTotals[6].toString());
    // Box 5h - August income
    form.getTextField('topmostSubform[0].Copy1[0].RghtCol[0].f2_21[0]').setText(form1099KData.monthlyTotals[7].toString());
    // Box 5i - September income
    form.getTextField('topmostSubform[0].Copy1[0].RghtCol[0].Box5i_ReadOrder[0].f2_22[0]').setText(form1099KData.monthlyTotals[8].toString());
    // Box 5j - October income
    form.getTextField('topmostSubform[0].Copy1[0].RghtCol[0].f2_23[0]').setText(form1099KData.monthlyTotals[9].toString());
    // Box 5k - November income
    form.getTextField('topmostSubform[0].Copy1[0].RghtCol[0].Box5k_ReadOrder[0].f2_24[0]').setText(form1099KData.monthlyTotals[10].toString());
    // Box 5l - December income
    form.getTextField('topmostSubform[0].Copy1[0].RghtCol[0].f2_25[0]').setText(form1099KData.monthlyTotals[11].toString());

    const pdfBytes = await pdfDoc.save();

    const blob = new Blob([pdfBytes], { type: "application/pdf" });

    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = "Form1099K.pdf";
    this.formLink = link;
    link.click();
  }

  sanitizeLink(url: string) {
    return this.sanitizer.bypassSecurityTrustUrl(url);
  }
}