import { Component, OnInit } from "@angular/core";
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";
import { zip } from "rxjs";
import { saveAs } from 'file-saver/FileSaver';

@Component({
  selector: "app-order-dashboard",
  templateUrl: "./order-dashboard.component.html",
  styleUrls: ["./order-dashboard.component.scss"]
})
export class OrderDashboardComponent implements OnInit {
  rows = []; // restaurant, total, [orders by createdAt DESC]
  totalOrders = 0;
  lastWeekTotalOrders = 0;
  restaurantsWithOrders = 0;
  restaurantsWithoutOrders = 0;

  start1;
  to1;
  start2;
  to2;

  constructor(private _api: ApiService, private _global: GlobalService) {
    this.start1 = new Date();
    this.start1.setDate(this.start1.getDate() - 8);

    this.to1 = new Date();
    this.to1.setDate(this.to1.getDate() - 7);

    this.start2 = new Date();
    this.start2.setDate(this.start2.getDate() - 1);

    this.to2 = new Date();
  }

  ngOnInit() {
    this.refresh();
  }

  refresh() {
    this.totalOrders = 0;
    this.lastWeekTotalOrders = 0;
    this.restaurantsWithOrders = 0;
    this.restaurantsWithoutOrders = 0;
    this.rows = [];
    this.searchOrders();
  }

  searchOrders() {
    zip(
      this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "order",
        query: {
          $or: [
            {
              $and: [
                {
                  createdAt: {
                    $gte: { $date: this.start1 }
                  }
                },
                {
                  createdAt: {
                    $lte: { $date: this.to1 }
                  }
                }
              ]
            },
            {
              $and: [
                {
                  createdAt: {
                    $gte: { $date: this.start2 }
                  }
                },
                {
                  createdAt: {
                    $lte: { $date: this.to2 }
                  }
                }
              ]
            }
          ],

        },
        projection: {
          restaurant: 1,
          createdAt: 1,
          orderNumber: 1
        },
        limit: 10000
      }),

      this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "restaurant",
        query: {
          disabled: {
            $ne: true
          }
        },
        projection: {
          name: 1,
          rateSchedules: 1,
          "googleAddress.formatted_address": 1,
          "googleListing.cid": 1
        },
        limit: 6000
      }),
      this._api.get(environment.adminApiUrl + "generic", {
        resource: "gmbAccount",
        query: {
          published: { $gt: 0 }
        },
        projection: {
          "locations.status": 1,
          "locations.cid": 1
        },
        limit: 6000
      })
    ).subscribe(
      result => {
        const orders = result[0];
        const restaurants = result[1];
        const gmbAccountsWithPublishedLocations = result[2];
        const publishedCids = gmbAccountsWithPublishedLocations.reduce((myset, account) => ((account.locations || []).map(loc => loc.status === 'Published' && myset.add(loc.cid)), myset), new Set());

        this.rows = [];
        const restaurantMap = {};
        restaurants.map(r => {
          restaurantMap[r._id] = {
            restaurant: r,
            orders: [],
            lastWeekOrders: [],
            ownedGmb: r.googleListing && publishedCids.has(r.googleListing.cid)
          };
        });
        this.totalOrders = 0;
        orders.map(o => {
          if (restaurantMap[o.restaurant]) {
            if (new Date(o.createdAt).valueOf() > this.start2.valueOf()) {
              restaurantMap[o.restaurant].orders.push(o);
              this.totalOrders++;
            } else {
              restaurantMap[o.restaurant].lastWeekOrders.push(o);
              this.lastWeekTotalOrders++;
            }
          }
        });

        // sort by total orders, then name
        this.rows = Object.values(restaurantMap).sort((r1, r2) => {
          let diff = r2["orders"].length - r1["orders"].length;
          if (diff) {
            return diff;
          } else {
            // no difference, let's order by name
            if (r1["restaurant"].name > r2["restaurant"].name) {
              return 1;
            } else if (r1["restaurant"].name === r2["restaurant"].name) {
              return 0;
            } else {
              return -1;
            }
          }
        });

        this.restaurantsWithOrders = this.rows.filter(
          r => r["orders"].length > 0
        ).length;
        this.restaurantsWithoutOrders = this.rows.filter(
          r => r["orders"].length === 0
        ).length;

        // stats of agents
        const agentDict = {};
        this.rows.map(row => {
          let agent = 'none';
          if (row.restaurant.rateSchedules && row.restaurant.rateSchedules.length > 0) {
            agent = row.restaurant.rateSchedules[0].agent;
          }
          agentDict[agent] = agentDict[agent] || {
            restaurant: 0,
            restaurantWithOrders: 0,
            orders: 0
          };
          agentDict[agent].restaurant = agentDict[agent].restaurant + 1;
          agentDict[agent].orders = agentDict[agent].orders + row.orders.length + row.lastWeekOrders.length;
          agentDict[agent].restaurantWithOrders = agentDict[agent].restaurantWithOrders + (row.orders.length + row.lastWeekOrders.length > 0 ? 1 : 0);
        });
        console.log(agentDict);

      },
      error =>
        this._global.publishAlert(
          AlertType.Danger,
          "Error pulling orders & restaurants"
        )
    );
  }

  getGoogleQuery(row) {
    return (
      "https://www.google.com/search?q=" +
      encodeURIComponent(row.restaurant["name"] + " " + (row.restaurant.googleAddress || {}).formatted_address)
    );
  }


  downloadStats() {
    // alert('not enabled');
    this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "order",
      query: {
      },
      projection: {
        createdAt: 1
      },
      limit: 30000,
      sort: { createdAt: -1 }
    })
      .subscribe(orders => {
        let dMap = {};
        let wMap = {};
        let d = new Date(orders[0].createdAt);
        let w = new Date(orders[0].createdAt);

        const DAY_SPAN = 24 * 3600 * 1000;
        const WEEK_SPAN = 7 * 24 * 3600 * 1000;

        for (let i = 0; i < orders.length; i++) {
          let t = new Date(orders[i].createdAt);
          d.setDate(d.getDate() - Math.floor((d.valueOf() - t.valueOf()) / DAY_SPAN));
          if (!dMap[d.toLocaleDateString()]) {
            dMap[d.toLocaleDateString()] = 1;
          } else {
            dMap[d.toLocaleDateString()] = dMap[d.toLocaleDateString()] + 1;
          }

          w.setDate(w.getDate() - 7 * (Math.floor((w.valueOf() - t.valueOf()) / WEEK_SPAN)));
          if (!wMap[w.toLocaleDateString()]) {
            wMap[w.toLocaleDateString()] = 1;
          } else {
            wMap[w.toLocaleDateString()] = wMap[w.toLocaleDateString()] + 1;
          }
        }

        const filename = 'order-stats.json';
        const blob = new Blob([JSON.stringify({ daily: dMap, weekly: wMap })], { type: 'text/plain' });
        saveAs(blob, filename);
      }, error => {
        this._global.publishAlert(
          AlertType.Danger,
          "Error pulling orders"
        )
      })
  }
}
