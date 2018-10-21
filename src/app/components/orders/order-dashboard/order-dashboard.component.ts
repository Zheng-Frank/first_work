import { Component, OnInit } from "@angular/core";
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { Lead } from "../../../classes/lead";
import { AlertType } from "../../../classes/alert-type";
import { CallLog } from "../../../classes/call-log";
import {
  ModalComponent,
  AddressPickerComponent
} from "@qmenu/ui/bundles/qmenu-ui.umd";
import { GmbInfo } from "../../../classes/gmb-info";
import { Address } from "@qmenu/ui";
import { User } from "../../../classes/user";
import { Order, Restaurant } from "@qmenu/ui/classes";
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
  restaurantsWithOrders = 0;
  restaurantsWithoutOrders = 0;

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
    this.refresh();
  }

  refresh() {
    const start = new Date();
    start.setDate(start.getDate() - 2);
    this.searchOrders(start);
  }

  searchOrders(startDate: Date) {
    zip(
      this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "order",
        query: {
          createdAt: {
            $gte: {$date: startDate}
          }
        },
        projection: {
          restaurant: 1,
          total: 1,
          createdAt: 1,
          orderNumber: 1,
          type: 1
        },
        limit: 6000
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
          rateSchedules: 1
        },
        limit: 6000
      }),
      this._api.get(environment.adminApiUrl + "generic", {
        resource: "lead",
        query: {
          restaurantId: {
            $exists: true
          }
        },
        projection: {
          restaurantId: 1,
          gmbAccountOwner: 1,
          gmbOwner: 1,
          gmbWebsite: 1,
          phones: 1,
          address: 1,
          fax: 1
        },
        limit: 6000
      })
    ).subscribe(
      result => {
        const orders = result[0];
        const restaurants = result[1];
        const leads = result[2];
        this.rows = [];
        const restaurantMap = {};
        restaurants.map(r => {
          restaurantMap[r._id] = {
            restaurant: r,
            orders: [],
            yesterdayOrders: []
          };
        });
        const now = new Date();
        const daySpan = 24 * 3600 * 1000;
        this.totalOrders = 0;
        orders.map(o => {
          if (restaurantMap[o.restaurant]) {
            if (now.valueOf() - new Date(o.createdAt).valueOf() > daySpan) {
              restaurantMap[o.restaurant].yesterdayOrders.push(o);
            } else {
              restaurantMap[o.restaurant].orders.push(o);
              this.totalOrders++;
            }
          }
        });

        leads.map(lead => {
          if (restaurantMap[lead.restaurantId]) {
            restaurantMap[lead.restaurantId].lead = lead;
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
          if(row.restaurant.rateSchedules && row.restaurant.rateSchedules.length > 0) {
            agent = row.restaurant.rateSchedules[0].agent;
          }
          agentDict[agent] = agentDict[agent] || {

            restaurant: 0,
            restaurantWithOrders: 0,
            orders: 0
          };
          agentDict[agent].restaurant = agentDict[agent].restaurant + 1;
          agentDict[agent].orders = agentDict[agent].orders + row.orders.length + row.yesterdayOrders.length;
          agentDict[agent].restaurantWithOrders = agentDict[agent].restaurantWithOrders + (row.orders.length + row.yesterdayOrders.length > 0 ? 1: 0) ;
        });
        // console.log(agentDict);
      },
      error =>
        this._global.publishAlert(
          AlertType.Danger,
          "Error pulling orders & restaurants"
        )
    );
  }

  getLogo(lead) {
    return GlobalService.serviceProviderMap[lead.gmbOwner];
  }
  getGoogleQuery(row) {
    if (row.lead && row.lead.address) {
      return (
        "https://www.google.com/search?q=" +
        encodeURIComponent(
          row.restaurant["name"] + " " + row.lead["address"]["formatted_address"]
        )
      );
    }
    return (
      "https://www.google.com/search?q=" +
      encodeURIComponent(row.restaurant["name"])
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
    // this._api.get(environment.legacyApiUrl + "order/stat", {
    //   limit: 500000
    // })
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
      const blob = new Blob([JSON.stringify({daily: dMap, weekly: wMap})], { type: 'text/plain' });
      saveAs(blob, filename);
    }, error => {
      this._global.publishAlert(
        AlertType.Danger,
        "Error pulling orders"
      )
    })
  }
}
