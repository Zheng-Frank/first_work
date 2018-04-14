import { Component, OnInit } from "@angular/core";
import { ApiService } from "../../services/api.service";
import { environment } from "../../../environments/environment";
import { GlobalService } from "../../services/global.service";
import { AlertType } from "../../classes/alert-type";
import { zip } from "rxjs";
import { mergeMap } from "rxjs/operators";
@Component({
  selector: "app-system",
  templateUrl: "./system.component.html",
  styleUrls: ["./system.component.scss"]
})
export class SystemComponent implements OnInit {
  removingOrphanPhones = false;
  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() { }

  migrateAddress() {
    // let's batch 20 every time
    // const batchSize = 20;
    //   .get(environment.qmenuApiUrl + "generic", {
    //     resource: "restaurant",
    //     query: {
    // let myRestaurants;
    // this._api
    //       address: { $exists: true },
    //       googleAddress: { $exists: false },
    //     },
    //     projection: {
    //       address: 1,
    //       name: 1
    //     },
    //     limit: batchSize
    //   }).flatMap(restaurants => {
    //     myRestaurants = restaurants;
    //     return this._api
    //       .get(environment.qmenuApiUrl + "generic", {
    //         resource: "address",
    //         query: {
    //           _id: { $in: restaurants.filter(r => r.address).map(r => r.address._id || r.address) },
    //         },
    //         limit: batchSize
    //       });
    //   }).flatMap(addresses => {
    //     const myRestaurantsClone = JSON.parse(JSON.stringify(myRestaurants))
    //     const addressMap = {};
    //     addresses.map(a => addressMap[a._id] = a);
    //     myRestaurantsClone.map(r => r.googleAddress = addressMap[r.address]);
        
    //   }
    //   ).subscribe(
    //     addresses => {
    //       console.log('address')
    //       console.log(addresses);
    //       console.log('restaurant')
    //       console.log(myRestaurants);
    //       // now update restaurant to insert the addresses returned!

    //     },
    //     error => {
    //       this._global.publishAlert(
    //         AlertType.Danger,
    //         "Error running script from API"
    //       );
    //     });
    //query restaurants without googleAddress field but having address
    // query address

    // this._api
    //   .post(environment.qmenuApiUrl + "scripts/migrate-address", {})
    //   .subscribe(
    //     result => {
    //       this._global.publishAlert(
    //         AlertType.Info,
    //         "Migrated: " + result.length
    //       );
    //     },
    //     error => {

    //     }
    //   );
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
        console.log(result);
        console.log(goodPhones);
        console.log(badPhones);

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
          console.log("resullt");
          console.log(result);

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

  fixCallLogs() {}
}
