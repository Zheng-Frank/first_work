import { Component, OnInit } from "@angular/core";
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";
import { zip } from "rxjs";
import { mergeMap } from "rxjs/operators";
import * as FileSaver from 'file-saver';

// import { Address } from '@qmenu/ui/esm2015/classes/address.js';
import { Address } from '@qmenu/ui';

@Component({
  selector: "app-system-dashboard",
  templateUrl: "./system-dashboard.component.html",
  styleUrls: ["./system-dashboard.component.scss"]
})
export class SystemDashboardComponent implements OnInit {
  adminLinks = [
    { route: 'phone-ordering', text: 'Phone Ordering', adminOnly: true },
    { route: 'couriers', text: 'Couriers', adminOnly: true },
    // {route: 'payments', text: 'Payment Means', adminOnly: true},
    // {route: 'transaction', text: 'Transactions', adminOnly: true},

    { route: 'messaging', text: 'Messaging', adminOnly: true },
    { route: 'orders', text: 'Orders', adminOnly: true },
    { route: 'users', text: 'Users' },
    { route: 'routines-admin', text: 'Routines Admin' },
    { route: 'leads', text: 'Lead Funnels', adminOnly: true },
    { route: 'transactions', text: 'Transactions', adminOnly: true },
    { route: 'qm-bm-sst', text: 'BM/QM SST', adminOnly: true },
    { route: '1099k-dashboard', text: 'Form 1099K Dashboard', adminOnly: true },
  ];

  system: any;
  items = [];
  systemItem = 'SMS Providers';
  constructor(private _api: ApiService, private _global: GlobalService) { }

  async ngOnInit() {
    this.system = (await this._api.get(environment.qmenuApiUrl + 'generic', { resource: 'system' }).toPromise())[0];
    const roleMap = {
      "SMS Providers": ["ADMIN", "CSR_MANAGER"],
      "Fax Providers": ["ADMIN", "CSR_MANAGER"],
      "Voice Providers": ["ADMIN", "CSR_MANAGER"],
      "Credit Card Processors": ["ADMIN"],
      "Stats": ["ADMIN"]
    };
    const myRoles = this._global.user.roles;
    this.items = Object.keys(roleMap).filter(k => roleMap[k].some(role => myRoles.indexOf(role) >= 0));
  }

  isAdmin() {
    let roles = this._global.user.roles || [];
    return roles.includes('ADMIN');
  }

  getPhoneNumberStat() {
    this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      projection: {
        channels: 1,
        name: 1
      },
      limit: 700000
    }).subscribe(restaurants => {
      let phoneRestaurantsDict = {};

      restaurants.sort((r1, r2) => r1.name > r2.name ? 1 : -1);
      restaurants.map(r => (r.channels || []).map(channel => {
        if (channel.type !== 'Email') {
          phoneRestaurantsDict[channel.value] = phoneRestaurantsDict[channel.value] || [];
          phoneRestaurantsDict[channel.value].push(r);
        }
      }));

      const temp = Object.keys(phoneRestaurantsDict).map(p => ({
        phone: p,
        count: phoneRestaurantsDict[p].length,
        restaurants: phoneRestaurantsDict[p]
      }));

      temp.sort((p1, p2) => p2.restaurants.length - p1.restaurants.length);

      console.log(temp);

    });
  }
  getStates() {
    this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      projection: {
        googleAddress: 1,
        name: 1
      },
      limit: 700000
    }).subscribe(restaurants => {
      console.log(restaurants.length);
      let states = restaurants
        .filter(r => r.googleAddress && (r.googleAddress.state || r.googleAddress.administrative_area_level_1))
        .map(r => r.googleAddress.state || r.googleAddress.administrative_area_level_1).sort();
      let stateSet = new Set(states);
      console.log(stateSet);
    });
  }

  migrateAddress() {
    // let's batch 20 every time
    const batchSize = 200;
    let myRestaurants;
    this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query: {
        address: { $exists: true },
        googleAddress: { $exists: false },
      },
      projection: {
        address: 1,
        name: 1
      },
      limit: batchSize
    }).pipe(mergeMap(restaurants => {
      myRestaurants = restaurants;
      return this._api
        .get(environment.qmenuApiUrl + "generic", {
          resource: "address",
          query: {
            _id: { $in: restaurants.filter(r => r.address).map(r => ({ $oid: r.address._id || r.address })) },
          },
          limit: batchSize
        });
    })).pipe(mergeMap(addresses => {
      if (addresses.length === 0) {
        throw 'No referenced address found for restaurants ' + myRestaurants.map(r => r.name).join(', ');
      }
      const myRestaurantsOriginal = JSON.parse(JSON.stringify(myRestaurants));
      const myRestaurantsChanged = JSON.parse(JSON.stringify(myRestaurants))
      const addressMap = {};
      addresses.map(a => addressMap[a._id] = a);
      myRestaurantsChanged.map(r => r.googleAddress = addressMap[r.address ? (r.address._id || r.address) : 'non-exist']);

      return this._api
        .patch(
          environment.qmenuApiUrl + "generic?resource=restaurant",
          myRestaurantsChanged.map(clone => ({
            old: myRestaurantsOriginal.filter(r => r._id === clone._id)[0],
            new: clone
          }))
        );
    })
    ).subscribe(
      patchResult => {
        this._global.publishAlert(
          AlertType.Success,
          "Migrated: " + myRestaurants.filter(r => patchResult.indexOf(r._id) >= 0).map(r => r.name).join(', ')
        );
        this._global.publishAlert(
          AlertType.Danger,
          "Non-Migrated: " + myRestaurants.filter(r => patchResult.indexOf(r._id) < 0).map(r => r.name).join(', ')
        );
      },
      error => {
        console.log(error);
        this._global.publishAlert(
          AlertType.Danger,
          "Error: " + JSON.stringify(error)
        );
      });

  }

  removeDuplicates() {
    // 1. query ALL with restaurantIds
    // 2. calculate duplicated
    // 3. remove duplicated

    this._api
      .get(environment.qmenuApiUrl + "generic", {
        resource: "lead",
        query: {
          restaurantId: { $exists: true }
        },
        projection: {
          restaurantId: 1
        },
        limit: 6000
      })
      .subscribe(
        result => {
          console.log(result);
          const duplicatedIds = [];
          const existingRestaurantIdSet = new Set();
          result.map(lead => {
            if (existingRestaurantIdSet.has(lead.restaurantId)) {
              duplicatedIds.push(lead._id);
            } else {
              existingRestaurantIdSet.add(lead.restaurantId);
            }
          });
          this.removeLeads(duplicatedIds);
          console.log(duplicatedIds);
        },
        error => {
          this._global.publishAlert(
            AlertType.Danger,
            "Error pulling gmb from API"
          );
        }
      );
  }

  removeLeads(leadIds) {
    leadIds.length = 200;
    console.log("remove", leadIds);
    this._api
      .delete(environment.qmenuApiUrl + "generic", {
        resource: "lead",
        ids: leadIds
      })
      .subscribe(
        result => {
          this._global.publishAlert(
            AlertType.Success,
            result.length + " was removed"
          );
        },
        error => {
          this._global.publishAlert(AlertType.Danger, "Error updating to DB");
        }
      );
  }

  fixCallLogs() {
    this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'lead',
      query: {
        'callLogs.0': { $exists: true },
      },
      projection: {
        callLogs: 1
      },
      limit: 150000
    }).subscribe(
      leads => {
        let counter = 0;
        leads.map(lead => {
          if (!Array.isArray(lead.callLogs)) {
            counter++;
            const original = lead;
            const changed = JSON.parse(JSON.stringify(original));
            delete original.callLogs;
            changed.callLogs = [changed.callLogs['0']];
            this._api.patch(environment.qmenuApiUrl + "generic?resource=lead", [{ old: original, new: changed }]).subscribe(patched => console.log(patched));
          }
        })

        this._global.publishAlert(
          AlertType.Success,
          "Found/Fixed " + counter
        );
      },
      error => {
        this._global.publishAlert(
          AlertType.Danger,
          "Error pulling leads from API"
        );
      }
    )
  }

  async getRestaurantLocations() {

    const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      projection: {
        name: 1,
        "googleAddress.formatted_address": 1,
        "googleAddress.lat": 1,
        "googleAddress.lng": 1,
        "googleAddress.administrative_area_level_1": 1
      },
      limit: 700000
    }).toPromise();
    console.log(restaurants);
    FileSaver.saveAs(new Blob([JSON.stringify(restaurants)], { type: "text" }), 'data.txt');
  }

  async removePhone() {
    const phone = '6789951877';
    const restaurantIdToKeep = undefined; // "5ae6f70593fc1b14000708c2";
    let restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        "channels.value": phone
      },
      projection: {
        channels: 1,
        name: 1
      },
      limit: 700000
    }).toPromise();
    console.log(restaurants.length);

    restaurants = restaurants.filter(r => r._id !== restaurantIdToKeep);
    console.log(restaurants);

    const pairs = restaurants.map(r => {
      let newR = JSON.parse(JSON.stringify(r));
      newR.channels = newR.channels.filter(c => c.value !== phone);
      let oldR = r;
      delete oldR.phones;
      delete oldR.name;
      delete newR.name;

      return {
        old: oldR,
        new: newR
      };
    });

    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', pairs).toPromise();

  }

}
