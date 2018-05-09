import { Component, OnInit } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";
import { zip, Observable, from } from "rxjs";
import { mergeMap } from "rxjs/operators";
import { Restaurant } from '@qmenu/ui';
import { Invoice } from "../../../classes/invoice";

@Component({
  selector: 'app-data-health',
  templateUrl: './data-health.component.html',
  styleUrls: ['./data-health.component.css']
})
export class DataHealthComponent implements OnInit {

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
  }

  checkDataHealth() {
    // find orders missing customers

  }

  getRestaurantsWithAutoPrint() {
    let date = new Date();
    date.setDate(date.getDate() - 2);
    // last two days!
    zip(
      this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "order",
        query: {
          createdAt: { $gte: { $date: date } }
        },
        projection: {
          restaurant: 1
        },
        limit: 200000
      }),
      this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "restaurant",
        query: {
          printers: { $exists: true }
        },
        projection: {
          name: 1,
          autoPrintVersion: 1,
          "printers.name": 1
        },
        limit: 100000
      })).subscribe(results => {
        // save orders to each restaurant!
        const orders = results[0];
        const restaurants = results[1];
        const restaurantsWithoutLonghorn = restaurants.filter(r => r.printers.length > 0 && r.autoPrintVersion !== 'Longhorn');
        restaurantsWithoutLonghorn.map(r => r.orders = 0);
        orders.map(o => restaurantsWithoutLonghorn.map(r => { if (r._id === o.restaurant) { r.orders += 1; } }));

        console.log(restaurantsWithoutLonghorn.map(r => ({
          name: r.name,
          orders: r.orders,
          printer: r.printers[0].name
        })));

      });
  }

}
