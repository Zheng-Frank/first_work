import { Component, OnInit } from "@angular/core";
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";
import { zip, Observable, from } from "rxjs";
import { mergeMap } from "rxjs/operators";
import { Restaurant } from '@qmenu/ui';
@Component({
  selector: "app-db-scripts",
  templateUrl: "./db-scripts.component.html",
  styleUrls: ["./db-scripts.component.scss"]
})
export class DbScriptsComponent implements OnInit {
  removingOrphanPhones = false;
  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() { }

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
            _id: { $in: restaurants.filter(r => r.address).map(r => r.address._id || r.address) },
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
      .get(environment.adminApiUrl + "generic", {
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
    this._api
      .delete(environment.adminApiUrl + "generic", {
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

  removeOrphanPhones() {
    this.removingOrphanPhones = true;
    // load ALL phones and restaurants
    zip(
      this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "phone",
        projection: {
          restaurant: 1
        },
        limit: 50000
      }),
      this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "restaurant",
        projection: {
          name: 1
        },
        limit: 10000
      })
    ).pipe(mergeMap(result => {
      const restaurantSet = new Set(result[1].map(r => r._id));
      const phones = result[0];
      const goodPhones = phones.filter(p => restaurantSet.has(p.restaurant));
      const badPhones = phones.filter(p => !restaurantSet.has(p.restaurant));
      // get phones with restaurant id missin in restaurants

      return this._api.delete(
        environment.qmenuApiUrl + "generic",
        {
          resource: 'phone',
          ids: badPhones.map(phone => phone._id)
        }
      );
    }))
      .subscribe(
        result => {

          this.removingOrphanPhones = false;

          // let's remove bad phones!
        },
        error => {
          this.removingOrphanPhones = false;
          this._global.publishAlert(
            AlertType.Danger,
            "Error pulling gmb from API"
          );
        }
      );
  }

  fixCallLogs() {
    this._api.get(environment.adminApiUrl + 'generic', {
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
            this._api.patch(environment.adminApiUrl + "generic?resource=lead", [{ old: original, new: changed }]).subscribe(patched => console.log(patched));
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

  migratePhones() {
    // let's batch 5 every time
    const batchSize = 100;
    let myRestaurants;
    this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query: {
        phones: { $exists: false },
      },
      projection: {
        name: 1
      },
      limit: batchSize
    }).pipe(mergeMap(restaurants => {
      myRestaurants = restaurants;
      return this._api
        .get(environment.qmenuApiUrl + "generic", {
          resource: "phone",
          query: {
            restaurant: { $in: restaurants.map(r => r._id) },
          },
          limit: batchSize
        });
    })).pipe(mergeMap(phones => {
      if (phones.length === 0) {
        throw 'No referenced phones found for restaurants ' + myRestaurants.map(r => r.name).join(', ');
      }
      const myRestaurantsOriginal = JSON.parse(JSON.stringify(myRestaurants));
      const myRestaurantsChanged = JSON.parse(JSON.stringify(myRestaurants));

      const rMap = {};
      myRestaurantsChanged.map(r => rMap[r._id] = r);

      phones.map(p => {
        let r = rMap[p.restaurant];
        r.phones = r.phones || [];
        r.phones.push(p);
      });

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

  backup() {
    // query all phones from backup and prod
    // load ALL phones and restaurants
    zip(
      this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "phone",
        projection: {
          "phoneNumber": 1,
          "callable": 1,
          "faxable": 1,
          "textable": 1,
          "type": 1,
          "restaurant": 1,
          "createdAt": 1,
          "updatedAt": 1
        },
        limit: 50000
      }),
      this._api.get(environment.qmenuBackupApiUrl + "generic", {
        resource: "phone",
        projection: {
          "phoneNumber": 1,
          "callable": 1,
          "faxable": 1,
          "textable": 1,
          "type": 1,
          "restaurant": 1,
          "createdAt": 1,
          "updatedAt": 1
        },
        limit: 50000
      }),
      this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "restaurant",
        projection: {
          "name": 1,
          "phones": 1
        },
        limit: 50000
      })
    ).pipe(mergeMap(result => {

      const missing = result[1].filter(p1 => !result[0].some(p0 => p0.phoneNumber === p1.phoneNumber));

      const added = result[0].filter(p1 => !result[1].some(p0 => p0.phoneNumber === p1.phoneNumber));
      console.log('missed', missing);
      console.log('added', added);
      const rMap = {};

      result[2].map(r => {
        rMap[r._id] = {
          old: JSON.parse(JSON.stringify(r)),
          new: JSON.parse(JSON.stringify(r))
        };
      });

      result[0].map(p => {
        const r = rMap[p.restaurant];
        if (r && !(r.new.phones || []).some(p2 => p2.phoneNumber === p.phoneNumber)) {
          // console.log(r.new.name, p.phoneNumber);
          r.new.phones.push(p);
          // console.log(r.new.name)
        }
      });

      const updated = Object
        .keys(rMap)
        .filter(k => rMap[k].old.phones && rMap[k].new.phones && rMap[k].old.phones.length !== rMap[k].new.phones.length)
        .map(k => rMap[k]);

      console.log('updated:-----------------', updated);
return from([1,2, 3]);
      // return this._api
      //   .patch(
      //     environment.qmenuApiUrl + "generic?resource=restaurant", updated);
    }))
      .subscribe(
        result => {

          this.removingOrphanPhones = false;

          // let's remove bad phones!
        },
        error => {
          console.log(error);
          this.removingOrphanPhones = false;
          this._global.publishAlert(
            AlertType.Danger,
            "Error pulling gmb from API"
          );
        }
      );
    // compare and inejct missing

    let json = { "old": { "_id": "5a31c981fa88ff1400233c9a", "name": "B.B'S Wings", "phones": [{ "_id": "5a31c981fa88ff1400233c9b", "phoneNumber": "7706766666", "callable": true, "type": "Business", "restaurant": "5a31c981fa88ff1400233c9a", "createdAt": "2017-12-14T00:44:49.315Z", "updatedAt": "2017-12-14T00:44:49.315Z" }, { "phoneNumber": "6786505577", "callable": false, "faxable": false, "textable": false, "type": "Mobile", "restaurant": "5a31c981fa88ff1400233c9a", "createdAt": "2018-04-16T17:55:00.240Z", "updatedAt": "2018-04-16T17:55:00.241Z", "id": "5ad4e37475287e3f789bd61e", "_id": "5ad4e37475287e3f789bd61e" }] }, "new": { "_id": "5a31c981fa88ff1400233c9a", "name": "B.B'S Wings", "phones": [{ "_id": "5a31c981fa88ff1400233c9b", "phoneNumber": "7706766666", "callable": true, "type": "Business", "restaurant": "5a31c981fa88ff1400233c9a", "createdAt": "2017-12-14T00:44:49.315Z", "updatedAt": "2017-12-14T00:44:49.315Z" }, { "phoneNumber": "6786505577", "callable": false, "faxable": false, "textable": false, "type": "Mobile", "restaurant": "5a31c981fa88ff1400233c9a", "createdAt": "2018-04-16T17:55:00.240Z", "updatedAt": "2018-04-16T17:55:00.241Z", "id": "5ad4e37475287e3f789bd61e", "_id": "5ad4e37475287e3f789bd61e" }, { "_id": "5a32a55cecda4214000842ff", "phoneNumber": "7706766661", "callable": false, "faxable": true, "textable": false, "type": "Business", "restaurant": "5a31c981fa88ff1400233c9a", "createdAt": "2017-12-14T16:22:52.112Z", "updatedAt": "2017-12-14T16:22:52.112Z" }, { "_id": "5a3330a203b1d0df208795f0", "phoneNumber": "6787991798", "callable": false, "faxable": false, "textable": false, "type": "Mobile", "restaurant": "5a31c981fa88ff1400233c9a", "createdAt": "2017-12-15T02:17:06.999Z", "updatedAt": "2017-12-15T02:17:06.999Z" }] } }

  }

}
