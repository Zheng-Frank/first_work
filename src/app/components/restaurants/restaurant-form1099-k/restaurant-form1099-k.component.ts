import { Component, OnInit, Input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { PDFDocument } from 'pdf-lib';

import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { Restaurant, Order } from '@qmenu/ui';
import { CurrencyPipe, DatePipe } from '@angular/common';

@Component({
  selector: 'app-restaurant-form1099-k',
  templateUrl: './restaurant-form1099-k.component.html',
  styleUrls: ['./restaurant-form1099-k.component.css'],
  providers: [CurrencyPipe, DatePipe]
})

export class Form1099KComponent implements OnInit {
  orders: Order[] = [];
  formLinks = [];

  @Input() restaurant: Restaurant;

  constructor(private _api: ApiService, private sanitizer: DomSanitizer) { }

  async ngOnInit() {
    // const years = [2020, 2021];

    // for (let year of years) {
    //   await this.populateOrdersForYear(year);
    //   await this.calculateRestaurantTransactionsForYear(year);
    // }
    await this.getFormFields();

  }

  async populateOrdersForYear(year) {
    const query = {
      restaurant: {
        $oid: this.restaurant._id
      },
      "paymentObj.method": "QMENU",
      $expr: {
        $eq: [{ $year: "$createdAt" }, year]
      }
    } as any;

    const orders = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: "order",
      query: query,
      projection: {
        // Fields that cannot be omitted:
        // paymentObj
        logs: 0,
        timeToDeliver: 0,
        sendNotificationOnReady: 0,
        runtime: 0,
        address: 0,
        courierName: 0,
        customerPreviousOrderStatus: 0,
        restauranceNotie: 0,
        customerNotice: 0,
        customerObj: 0,
        _id: 0,
        delivery: 0
      },
      sort: {
        createdAt: -1
      }
    }, 250);

    console.log(orders);
    this.orders = orders.map(order => {
      order.payment = order.paymentObj;
      order.id = order._id;
      return new Order(order);
    });
  }

  async calculateRestaurantTransactionsForYear(year) {
    let restaurantTotals = {
      orderCount: 0,
      sumOfTransactions: 0
    };

    for (const order of this.orders) {
      if (order.statuses[order.statuses.length - 1].status !== "CANCELED") {
        const total = order.getTotal();
        const roundedTotal = this.round(total);
        restaurantTotals.sumOfTransactions += roundedTotal;
        restaurantTotals.orderCount += 1;
      }
    }
    restaurantTotals.sumOfTransactions = this.round(restaurantTotals.sumOfTransactions);


    // Make sure the values on the line below are actually 200 and 20000, respectively.
    if (restaurantTotals.orderCount >= 1 && restaurantTotals.sumOfTransactions >= 1) {
      const restaurantAddress = this.restaurant.googleAddress;
      const form1099KData = {
        name: this.restaurant.name,
        year: year,
        required: true,
        orderCount: restaurantTotals.orderCount,
        sumOfTransactions: restaurantTotals.sumOfTransactions,
        streetAddress: restaurantAddress.street_number + " " + restaurantAddress.route,
        state: restaurantAddress.administrative_area_level_1,
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
        if (order.statuses[order.statuses.length - 1].status !== "CANCELED") {
          const total = this.round(order.getTotal());
          form1099KData.monthlyTotals[new Date(order.createdAt).getMonth()] += total;
        }
      }
      this.generateForm1099kPDF(form1099KData);
    } else {
      this.formLinks.push([null, year]);
    }
  }

  async generateForm1099kPDF(form1099KData) {
    let formTemplateUrl;
    switch (form1099KData.year) {
      case 2021:
        formTemplateUrl = "../../../../assets/form1099k/f1099k_2021.pdf";
        break;
      case 2020:
        formTemplateUrl = "../../../../assets/form1099k/f1099k_2020.pdf";
        break;
      default:
        console.log(`Form generation is not supported for ${form1099KData.year}`);
    }

    const formBytes = await fetch(formTemplateUrl).then((res) => res.arrayBuffer());
    const pdfDoc = await PDFDocument.load(formBytes);
    const form = pdfDoc.getForm();

    const qMenuAddress = `
    qMenu, Inc.
    107 Technology Pkwy NW, Ste. 211
    Peachtree Corners, GA 30092`;

    // Filer's name
    form.getTextField(`topmostSubform[0].CopyB[0].LeftCol[0].f2_1[0]`).setText(qMenuAddress);
    // Filer checkbox
    form.getCheckBox(`topmostSubform[0].CopyB[0].LeftCol[0].FILERCheckbox_ReadOrder[0].c2_3[0]`).check();

    // Transaction reporting checkbox
    form.getCheckBox(`topmostSubform[0].CopyB[0].LeftCol[0].c2_5[0]`).check();
    // Payee's name
    form.getTextField(`topmostSubform[0].CopyB[0].LeftCol[0].f2_2[0]`).setText(form1099KData.name);
    // Street address
    form.getTextField(`topmostSubform[0].CopyB[0].LeftCol[0].f2_3[0]`).setText(form1099KData.streetAddress);
    // City, State, and ZIP code
    form.getTextField(`topmostSubform[0].CopyB[0].LeftCol[0].f2_4[0]`).setText(form1099KData.cityStateAndZip);
    // PSE name and telephone
    form.getTextField(`topmostSubform[0].CopyB[0].LeftCol[0].f2_5[0]`).setText('');
    // Account number
    form.getTextField(`topmostSubform[0].CopyB[0].LeftCol[0].f2_6[0]`).setText('');
    // Filer's TIN
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_7[0]`).setText('81-4208444');
    // Payee's TIN
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_8[0]`).setText('');
    // Box 1a Gross amount
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_9[0]`).setText(form1099KData.sumOfTransactions.toFixed(2))
    // Box 1b card not present transactions
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].Box1b_ReadOrder[0].f2_10[0]`).setText(form1099KData.sumOfTransactions.toFixed(2))
    // Box 2 - Merchant category code (Always 5812 for restaurants)
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_11[0]`).setText('5812');
    // Box 3 - Number of payment transactions
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_12[0]`).setText(form1099KData.orderCount.toString())
    // Box 4 - Federal income tax withheld
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_13[0]`).setText('');
    // Box 5a - January income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].Box5a_ReadOrder[0].f2_14[0]`).setText(form1099KData.monthlyTotals[0].toFixed(2));
    // Box 5b - February income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_15[0]`).setText(form1099KData.monthlyTotals[1].toFixed(2));
    // Box 5c - March income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].Box5c_ReadOrder[0].f2_16[0]`).setText(form1099KData.monthlyTotals[2].toFixed(2))
    // Box 5d - April income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_17[0]`).setText(form1099KData.monthlyTotals[3].toFixed(2))
    // Box 5e - May income

    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].Box5e_ReadOrder[0].f2_18[0]`).setText(form1099KData.monthlyTotals[4].toFixed(2));
    // Box 5f - June income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_19[0]`).setText(form1099KData.monthlyTotals[5].toFixed(2));
    // Box 5g - July income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].Box5g_ReadOrder[0].f2_20[0]`).setText(form1099KData.monthlyTotals[6].toFixed(2));
    // Box 5h - August income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_21[0]`).setText(form1099KData.monthlyTotals[7].toFixed(2));
    // Box 5i - September income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].Box5i_ReadOrder[0].f2_22[0]`).setText(form1099KData.monthlyTotals[8].toFixed(2));
    // Box 5j - October income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_23[0]`).setText(form1099KData.monthlyTotals[9].toFixed(2));
    // Box 5k - November income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].Box5k_ReadOrder[0].f2_24[0]`).setText(form1099KData.monthlyTotals[10].toFixed(2));
    // Box 5l - December income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_25[0]`).setText(form1099KData.monthlyTotals[11].toFixed(2));
    // Box 6 - State
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].Box6_ReadOrder[0].f2_26[0]`).setText(form1099KData.state);
    // Box 7 - State ID
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].Box7_ReadOrder[0].f2_28[0]`).setText('');

    form.updateFieldAppearances();


    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });

    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `f1099k_${form1099KData.year}_${form1099KData.name}.pdf`;
    this.formLinks.push([link, form1099KData.year]);
  }

  sanitizeLink(url: string) {
    return this.sanitizer.bypassSecurityTrustUrl(url);
  }

  round(num) {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }

  async getFormFields() {
    let formTemplateUrl = "../../../../assets/form1099k/form1099k.pdf";
    const formBytes = await fetch(formTemplateUrl).then((res) => res.arrayBuffer());
    const pdfDoc = await PDFDocument.load(formBytes);
    const form = pdfDoc.getForm();

    const fields = await form.getFields();

    let allFields = '';
    fields.forEach(field => {

      allFields += field.getName() + '\n';
    })



    console.log(allFields);
  }
}


/* 
restaurant: {
name: '', 
payeeName: 'John Doe',
TIN: '123',
1099k: [
  {
  year: 2020, 
  
 }, 

]
}


*/