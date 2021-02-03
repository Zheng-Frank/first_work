import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Invoice } from '../../../classes/invoice';
import { ModalComponent } from "@qmenu/ui/bundles/qmenu-ui.umd";


import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";
import { mergeMap, observeOn } from 'rxjs/operators';
import { FeeSchedule, Restaurant } from '@qmenu/ui';
import { Log } from "../../../classes/log";
import { PaymentMeans } from '@qmenu/ui';
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

  constructor(private _route: ActivatedRoute, private _api: ApiService, private _global: GlobalService, private currencyPipe: CurrencyPipe, private datePipe: DatePipe) { }

  ngOnInit() {
  }

  // checkAllRestaurants and checkIndividualRestaurant param "year" refers to the tax year
  // in question, not the current year

  async checkAllRestaurants(year) {
    const restaurantList = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
      },
      projection: {
        "name": 1,
        "alias": 1,
        "1099k": 1
      }
    }, 25000);

    for (const restaurant in restaurantList) {
      for (const form in restaurant["1099k"]) {
        if (form["year"] === year) {
          // A form for this restaurant and year already exists, so we don't need to generate another one
          // break this inner loop?
        }
      }
      this.checkIndividualRestaurant(restaurant["name"], year);
    }
  }

  async checkIndividualRestaurant(restaurantName, year) {
    const restaurantTotals = {
      orderCount: 0,
      sumOfTransactions: 0
    };

    const currentYear = new Date(year, 0, 1);
    const nextYear = new Date(year + 1, 0, 1);

    const invoices = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'invoice',
      query: {
        "restaurant.name": restaurantName,
        "orders.payee": "qMenu",
        "orders.createdAt": {
          "$gte": new Date(currentYear),
          "$lt": new Date(nextYear)
        }
      },
      projection: {
        createdAt: 1,
        fromDate: 1,
        toDate: 1,
        previousInvoiceId: 1,
        orders: 1,
        isPaymentCompleted: 1,
        isPaymentSent: 1,
        restaurant: 1
      }
    }, 30);

    for (const entry of invoices) {
      for (const order of entry.orders) {
        if (order.payee === 'qMenu' && order.canceled === false) {
          restaurantTotals.orderCount += 1;
          restaurantTotals.sumOfTransactions += order.total;
        }
      }
    }

    if (restaurantTotals.orderCount >= 200 && restaurantTotals.sumOfTransactions >= 20000) {
      // Only populate the form data for restaurants that actually need it
      const restaurantAddress = invoices[0].restaurant.address;
      const form1099KData = {
        name: restaurantName,
        formUrl: '',
        year: year,
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

      for (const entry of invoices) {
        for (const order of entry.orders) {
          if (order.payee === 'qMenu' && order.canceled === false) {
            form1099KData.monthlyTotals[new Date(order.createdAt).getMonth()] += order.total;
          }
        }
      }

      this.generateForm1099kPDF(form1099KData);
    } else {
      // message: "Based on a review of qMenu's records, you do not require a Form 1099-K for this year"
    }
  }
  async generateForm1099kPDF(form1099KData) {
    // 1) Use pdf-lib (maybe?) to generate a pdf
    // 2)
  }

  async downloadForm1099kPDF() {

  }
}