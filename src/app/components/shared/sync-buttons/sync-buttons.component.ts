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
          address: 1,
          channels: 1
        },
        limit: 700000
      })
    ).subscribe(
      result => {
        this.restaurantToGmbSyncing = false;
        const matched = [];
        const nonmatched = [];

        const gmbs = result[0];
        const restaurants = result[1];

        const gmbsClone = JSON.parse(JSON.stringify(gmbs));
        // let's match by phone number!
        gmbsClone.map(gmb =>
          (gmb.businesses || []).map(business => {
            let foundOne = false;
            for (let i = 0; i < restaurants.length; i++) {
              if ((restaurants[i].channels || []).some(c => c.value === business.phone)) {
                foundOne = true;
                business.restaurantId = restaurants[i]._id;
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
        .patch(environment.qmenuApiUrl + "generic?resource=gmb", [{ old: originalGmb, new: newGmb }])
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
    alert('to be implemented')
  }

  injectLeads(leadsArray) {
    // api update here...
    this._api
      .post(environment.qmenuApiUrl + "generic?resource=lead", leadsArray)
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
      this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "lead",
        query: {
          restaurantId: { $exists: true }
        },
        projection: {
          name: 1,
          restaurantId: 1,
          gmbAccountOwner: 1
        },
        limit: 700000
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
      .patch(environment.qmenuApiUrl + "generic?resource=lead", pairs)
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
