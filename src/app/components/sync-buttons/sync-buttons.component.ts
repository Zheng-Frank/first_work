import { Component, OnInit } from "@angular/core";
import { ApiService } from "../../services/api.service";
import { environment } from "../../../environments/environment";
import { GlobalService } from "../../services/global.service";
import { AlertType } from "../../classes/alert-type";
import { Observable } from "rxjs/Rx";
import { DeepDiff } from "../../classes/deep-diff";

@Component({
  selector: 'app-sync-buttons',
  templateUrl: './sync-buttons.component.html',
  styleUrls: ['./sync-buttons.component.scss']
})
export class SyncButtonsComponent implements OnInit {
  restaurantToGmbSyncing = false;
  restaurantToLeadSyncing = false;
  gmbToLeadSyncing = false;
  
  constructor(private _api: ApiService, private _global: GlobalService) {}

  ngOnInit() {}

  syncFromRestaurantsToGmbs() {
    this.restaurantToGmbSyncing = true;
    Observable.zip(
      this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "gmb",
        projection: {
          "businesses.ownershipRequests": 0
        },
        limit: 500
      }),
      this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "restaurant",
        projection: {
          name: 1,
          address: 1
        },
        limit: 1000
      }),
      this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "phone",
        projection: {},
        limit: 5000
      })
    ).subscribe(
      result => {
        this.restaurantToGmbSyncing = false;
        const matched = [];
        const nonmatched = [];

        const gmbs = result[0];
        const restaurants = result[1];
        const phones = result[2];

        const gmbsClone = JSON.parse(JSON.stringify(gmbs));
        // let's match by phone number!
        gmbsClone.map(gmb =>
          (gmb.businesses || []).map(business => {
            let foundOne = false;
            for (let i = 0; i < phones.length; i++) {
              if (phones[i].phoneNumber === business.phone) {
                foundOne = true;
                business.restaurantId = phones[i].restaurant;
                matched.push(business);
                break;
              }
            }
            if (!foundOne) {
              nonmatched.push(business);
            }
          })
        );
        this._global.publishAlert(AlertType.Info, "Matched: " + matched.length);
        if (nonmatched.length > 0) {
          this._global.publishAlert(
            AlertType.Danger,
            "Non-matched: " + nonmatched.length
          );
          console.log("nonmatched=",nonmatched);
        }

        for (let i = 0; i < gmbs.length; i++) {
          this.patchGmbDiff(gmbs[i], gmbsClone[i]);
        }
      },
      error => {
        this.restaurantToGmbSyncing = false;
        this._global.publishAlert(
          AlertType.Danger,
          "Error pulling gmb from API"
        );
      }
    );
  }

  patchGmbDiff(originalGmb, newGmb) {
    const diffs = DeepDiff.getDiff(originalGmb._id, originalGmb, newGmb);
    console.log(diffs);
    if (diffs.length > 0) {
      // api update here...
      this._api
        .patch(environment.qmenuApiUrl + "generic?resource=gmb", diffs)
        .subscribe(
          result => {
            this._global.publishAlert(
              AlertType.Success,
              originalGmb.email + " was updated"
            );
          },
          error => {
            this._global.publishAlert(AlertType.Danger, "Error updating to DB");
          }
        );
    }
  }

  syncFromRestaurantsToLeads() {
    // 1. get existing leads with restaurantIds
    // 2. get all restaurants
    // 3. get restaurants without lead.restaurantId counter part
    // 4. if not matched, create new lead!

    this.restaurantToLeadSyncing = true;
    Observable.zip(
      this._api.get(environment.adminApiUrl + "generic", {
        resource: "lead",
        query: {
          restaurantId: { $exists: true }
        },
        projection: {
          name: 1,
          address: 1,
          phones: 1,
          restaurantId: 1
        },
        limit: 4000
      }),
      this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "restaurant",
        projection: {
          name: 1,
          address: 1,
          email: 1,
          alias: 1
        },
        limit: 1000
      }),
      this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "phone",
        projection: {},
        limit: 5000
      }),
      this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "address",
        projection: {},
        limit: 5000
      })
    ).subscribe(
      result => {
        this.restaurantToLeadSyncing = false;
        const matched = [];
        const nonmatched = [];

        const leadsWithRestaurantIdSet = new Set(
          result[0].map(lead => lead.restaurantId)
        );
        const restaurants = result[1];
        const phones = result[2];
        const addresses = result[3];

        console.log(leadsWithRestaurantIdSet);
        console.log("before", restaurants.length);

        const restaurantsRemaining = restaurants.filter(
          r => !leadsWithRestaurantIdSet.has(r._id)
        );

        console.log("after", restaurantsRemaining.length);

        // mary restaurant and phones
        const restaurantMap = {};
        restaurantsRemaining.map(r => (restaurantMap[r._id] = r));
        phones.map(phone => {
          if (phone.restaurant && restaurantMap[phone.restaurant]) {
            const r = restaurantMap[phone.restaurant];
            r.phones = r.phones || [];
            r.phones.push(phone.phoneNumber);
          }
        });

        // mary restaurant and address

        addresses.map(address => {
          restaurantsRemaining.map(r => {
            if (r.address === address._id) {
              r.address = address;
            }
          });
        });

        // inject a field to indicate in qmenu
        restaurantsRemaining.map(r => {
          r.inQmenu = true;
          r.restaurantId = r._id;
          // remove _id so that lead will create new id!
          delete r._id;
        });
        // inject those restaurants to leads!
        console.log(restaurantsRemaining)
        this.injectLeads(restaurantsRemaining);
      },
      error => {
        this.restaurantToLeadSyncing = false;
        this._global.publishAlert(
          AlertType.Danger,
          "Error pulling gmb from API"
        );
      }
    );
  }

  injectLeads(leadsArray) {
    // api update here...
    this._api
      .post(environment.adminApiUrl + "generic?resource=lead", leadsArray)
      .subscribe(
        result => {
          this._global.publishAlert(
            AlertType.Success,
            result.length + " was updated"
          );
        },
        error => {
          this._global.publishAlert(AlertType.Danger, "Error updating to DB");
        }
      );
  }

  syncFromGmbsToLeads() {
    // 1. get all gmb businesses, published, with restaurantId
    // 2. get existing leads with restaurantIds
    // 3. compare and patch (add field gmbAccountOwner = true)

    this.gmbToLeadSyncing = true;
    Observable.zip(
      this._api.get(environment.adminApiUrl + "generic", {
        resource: "lead",
        query: {
          restaurantId: { $exists: true }
        },
        projection: {
          name: 1,
          restaurantId: 1,
          gmbAccountOwner: 1
        },
        limit: 1000
      }),
      this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "gmb",
        projection: {
          "businesses.ownershipRequests": 0
        },
        limit: 500
      })
    ).subscribe(
      result => {
        this.gmbToLeadSyncing = false;

        const leads = result[0];
        const leadsClone = JSON.parse(JSON.stringify(leads));

        const gmbs = result[1];
        const publishedIds = new Set();

        // remove ALL leadsClone's gmbAccountOwner is there is any
        leadsClone.map(lead => delete lead.gmbAccountOwner);

        gmbs.map(gmb =>
          (gmb.businesses || []).map(biz => {
            if (biz.restaurantId && biz.isPublished) {
              publishedIds.add(biz.restaurantId);
            }
          })
        );
        leadsClone.map(lead => {
          if (publishedIds.has(lead.restaurantId)) {
            lead.gmbAccountOwner = "qmenu";
          }
        });

        const leadDiffs = [];
        for (let i = 0; i < leadsClone.length; i++) {
          const lead = leads[i];
          const leadClone = leadsClone[i];
          const diffs = DeepDiff.getDiff(lead._id, lead, leadClone);
          leadDiffs.push(...diffs);
        }
        this.patchLeadDiff(leadDiffs);
      },

      error => {
        this.gmbToLeadSyncing = false;
        this._global.publishAlert(
          AlertType.Danger,
          "Error pulling gmb from API"
        );
      }
    );
  }

  patchLeadDiff(leadDiffs) {
    console.log(leadDiffs);
    this._api
      .patch(environment.adminApiUrl + "generic?resource=lead", leadDiffs)
      .subscribe(
        result => {
          this._global.publishAlert(
            AlertType.Success,
            leadDiffs.length + " was updated"
          );
        },
        error => {
          this._global.publishAlert(AlertType.Danger, "Error updating to DB");
        }
      );
  }
}
