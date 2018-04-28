import { Component, OnInit } from "@angular/core";
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";
import { zip } from "rxjs";
import { Helper } from "../../../classes/helper";

@Component({
  selector: 'app-sync-buttons',
  templateUrl: './sync-buttons.component.html',
  styleUrls: ['./sync-buttons.component.scss']
})
export class SyncButtonsComponent implements OnInit {
  restaurantToGmbSyncing = false;
  restaurantToLeadSyncing = false;
  gmbToLeadSyncing = false;

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() { }

  syncFromRestaurantsToGmbs() {
    this.restaurantToGmbSyncing = true;
    zip(
      this._api.get(environment.qmenuApiUrl + "generic2", {
        resource: "gmb",
        projection: {
          "businesses.ownershipRequests": 0
        },
        limit: 500
      }),
      this._api.get(environment.qmenuApiUrl + "generic2", {
        resource: "restaurant",
        projection: {
          name: 1,
          address: 1
        },
        limit: 1000
      }),
      this._api.get(environment.qmenuApiUrl + "generic2", {
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
    if (Helper.areObjectsEqual(originalGmb, newGmb)) {
      this._global.publishAlert(AlertType.Info, "Nothing to update");
    } else {
      // api update here...
      this._api
        .patch(environment.qmenuApiUrl + "generic2?resource=gmb", [{ old: originalGmb, new: newGmb }])
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
    zip(
      this._api.get(environment.adminApiUrl + "generic2", {
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
      this._api.get(environment.qmenuApiUrl + "generic2", {
        resource: "restaurant",
        projection: {
          name: 1,
          address: 1,
          email: 1,
          alias: 1
        },
        limit: 1000
      }),
      this._api.get(environment.qmenuApiUrl + "generic2", {
        resource: "phone",
        projection: {},
        limit: 5000
      }),
      this._api.get(environment.qmenuApiUrl + "generic2", {
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

        const restaurantsRemaining = restaurants.filter(
          r => !leadsWithRestaurantIdSet.has(r._id)
        );

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
      .post(environment.adminApiUrl + "generic2?resource=lead", leadsArray)
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
    zip(
      this._api.get(environment.adminApiUrl + "generic2", {
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
      this._api.get(environment.qmenuApiUrl + "generic2", {
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

        // remove ALL leadsClone's gmbAccountOwner if there is any
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

        const pairs = [];
        for (let i = 0; i < leadsClone.length; i++) {
          const lead = leads[i];
          const leadClone = leadsClone[i];
          if (!Helper.areObjectsEqual(lead, leadClone)) {
            const pair = { old: lead, new: leadClone };
            pairs.push(pair);
          }
        }
        if (pairs.length == 0) {
          this._global.publishAlert(
            AlertType.Info,
            "Nothing to sync"
          );
        } else {
          this.patchLeadDiff(pairs);
        }
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

  patchLeadDiff(pairs) {
    this._api
      .patch(environment.adminApiUrl + "generic2?resource=lead", pairs)
      .subscribe(
        result => {
          this._global.publishAlert(
            AlertType.Success,
            pairs.length + " was updated"
          );
        },
        error => {
          this._global.publishAlert(AlertType.Danger, "Error updating to DB");
        }
      );
  }
}
