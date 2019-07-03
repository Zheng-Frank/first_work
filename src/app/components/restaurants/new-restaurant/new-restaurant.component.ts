import { Component, OnInit, EventEmitter, Output, Input } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";
import { Restaurant } from '@qmenu/ui';
import { Router } from '@angular/router';
@Component({
  selector: 'app-new-restaurant',
  templateUrl: './new-restaurant.component.html',
  styleUrls: ['./new-restaurant.component.css']
})
export class NewRestaurantComponent implements OnInit {
  @Output() cancel = new EventEmitter();
  @Output() success = new EventEmitter<Restaurant>();
  @Input() restaurant: any = {
    name: '',
    googleAddress: { formatted_address: '' }
  };
  skipApplyGmb = false;
  isDirectSignUp = false;
  restaurantFieldDescriptors = [
    {
      field: "name",
      label: "Restaurant Name",
      required: true,
      inputType: "text"
    },
    {
      field: "address",
      label: "Restaurant Address",
      required: true,
      inputType: "text"
    },
    {
      field: "alias",
      label: "Alias",
      required: true,
      inputType: "text"
    }
  ];

  checkExistenceError;
  apiRequesting = false;

  constructor(private _api: ApiService, private _global: GlobalService, private _router: Router) { }

  ngOnInit() {
  }

  formInputChanged(event) {
    this.checkExistenceError = undefined;
  }

  async checkExistence() {
    this.restaurant.googleListing = {};
    this.restaurant.channels = [];

    this.checkExistenceError = undefined;
    if (!this.restaurant.name) {
      this.checkExistenceError = 'Please input restaurant name';
      return;
    }
    if (!this.restaurant.googleAddress.formatted_address) {
      this.checkExistenceError = 'Please input restaurant address';
      return;
    }


    this.apiRequesting = true;
    let crawledResult;
    try {
      crawledResult = await this._api.get(environment.adminApiUrl + "utils/scan-gmb", { q: [this.restaurant.name, this.restaurant.googleAddress.formatted_address].join(" ") }).toPromise();
    }
    catch (error) {
      // try to use only city state and zip code!
      // "#4, 6201 Whittier Boulevard, Los Angeles, CA 90022" -->  Los Angeles, CA 90022
      const addressTokens = this.restaurant.googleAddress.formatted_address.split(", ");
      const q = this.restaurant.name + ' ' + addressTokens[addressTokens.length - 2] + ', ' + addressTokens[addressTokens.length - 1];
      try {
        crawledResult = await this._api.get(environment.adminApiUrl + "utils/scan-gmb", { q: q }).toPromise();
      } catch (error) { }
    }

    if (!crawledResult || !crawledResult.place_id) {
      console.log(crawledResult);
      this.apiRequesting = false;
      this.checkExistenceError = "Error: not able to locate google listing.";
      return;
    }


    crawledResult.crawledAt = new Date();

    // query address details by place_id
    try {
      const addressDetails = await this._api.get(environment.adminApiUrl + "utils/google-address", {
        place_id: crawledResult.place_id
      }).toPromise();
      this.restaurant.googleAddress = addressDetails;
    } catch (error) {
      this.apiRequesting = false;
      this.checkExistenceError = "Error: google address query.";
      return;
    }

    // query existing restaurant with SAME phone number!
    const allExistingRestaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: "restaurant",
      query: {
        "channels.value": crawledResult.phone || 'non-existing'
      },
      projection: {
        channels: 1,
        name: 1,
        disabled: 1
      },
      limit: 5
    }).toPromise();

    const existingRestaurants = allExistingRestaurants.filter(r => !r.disabled);
    if (existingRestaurants.length > 0) {
      this.restaurant.relatedTo = existingRestaurants.map(r => r._id);
    } else {
      this.restaurant.relatedTo = undefined;
    }
    this.apiRequesting = false;

    this.restaurant.googleListing = crawledResult;

    this.restaurant.name = crawledResult.name;

    // suggest and alias!
    const nameParts = this.restaurant.name.toLowerCase().split(/[^0-9A-Za-z_]/).filter(each => each);
    const addressParts = (this.restaurant.googleAddress.locality || this.restaurant.googleAddress.postal_code).split(/[^0-9A-Za-z_]/).filter(each => each);;

    const alias = nameParts.concat(addressParts).join('-').toLowerCase();

    this.restaurant.alias = alias;
    if (crawledResult.cuisine) {
      this.restaurant.cuisine = crawledResult.cuisine.split(' ').filter(c => c);
    }
    // handle phone, as business type
    if (crawledResult.phone) {
      // handle phone, as business type
      this.restaurant.channels = [
        {
          "value": crawledResult.phone,
          "type": 'Phone',
          "notifications": ['Order']
        }
      ];
    }

  }

  clickCancel() {
    this.cancel.emit();
  }

  async clickCreate() {
    if (!this.restaurant.name || !this.restaurant.alias) {
      return alert('Please input Name and Alias!');
    }
    this.apiRequesting = true;

    // making sure we are creating a unique alias!
    let counter = 0;
    while (true) {
      counter++;
      const existingAlias = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: "restaurant",
        query: { alias: this.restaurant.alias },
        projection: { name: 1, alias: 1 }
      }).toPromise();
      if (existingAlias.length === 0) {
        break;
      } else {
        this.restaurant.alias = this.restaurant.alias + counter;
      }
      if (counter > 10) {
        this._global.publishAlert(AlertType.Danger, 'No unique alias found');
        this.apiRequesting = false;
        return;
      }
    }

    try {
      // set rateSchedule's agent, if he is an MARKETER
      if (this._global.user.roles.indexOf('MARKETER') >= 0) {
        this.restaurant['rateSchedules'] = [{
          "agent": this._global.user.username,
          "date": new Date().toISOString().slice(0, 10)
        }];
      }
      if (this.isDirectSignUp) {
        this.restaurant.isDirectSignUp = this.isDirectSignUp;
      }

      this.restaurant.web = this.restaurant.web || {};
      if (this.restaurant.googleListing && this.restaurant.googleListing.gmbWebsite) {
        this.restaurant.web.bizManagedWebsite = this.restaurant.googleListing.gmbWebsite;
      }
      if (this.skipApplyGmb) {
        this.restaurant.web.disableAutoTask = true;
      }

      const newRestaurants = await this._api.post(environment.qmenuApiUrl + 'generic?resource=restaurant', [this.restaurant]).toPromise();
      // assign newly created id back to original object
      this.restaurant._id = newRestaurants[0];

      this._global.publishAlert(AlertType.Success, 'Created restaurant');

      // force refreshing global restaurant list!
      await this._global.getCachedVisibleRestaurantList(true);
      // create GMB here!
      const existingGmbs = await this._api.get(environment.adminApiUrl + 'generic', {
        resource: 'gmbBiz',
        query: {
          cid: this.restaurant.googleListing.cid
        },
        projection: {
          name: 1
        }
      }).toPromise();


      let gmbBiz;
      if (existingGmbs.length > 0) {

        // update qmenuId!
        await this._api.patch(environment.adminApiUrl + 'generic?resource=gmbBiz', existingGmbs.map(biz =>
          ({
            old: { _id: biz._id },
            new: { _id: biz._id, qmenuId: this.restaurant._id }
          }))).toPromise();
        this._global.publishAlert(AlertType.Info, 'Found matching GMB Biz');
        // assign newly created id back to original object
        gmbBiz = existingGmbs[0];

      } else {
        // create new gmbBiz!

        const newGmbBiz = { ...this.restaurant.googleListing, qmenuId: this.restaurant._id };

        if (this.isDirectSignUp) {
          newGmbBiz['isDirectSignUp'] = true;
        }

        const bizs = await this._api.post(environment.adminApiUrl + 'generic?resource=gmbBiz', [newGmbBiz]).toPromise();
        this._global.publishAlert(AlertType.Success, 'Created new GMB');
        newGmbBiz['_id'] = bizs[0];

        gmbBiz = newGmbBiz;

      }

      // see if we need to create Apply GMB task!
      if (!this.skipApplyGmb) {
        // making sure it's not already published somewhere!
        const relevantAccounts = await this._api.get(environment.adminApiUrl + 'generic', {
          resource: 'gmbAccount',
          query: {
            "locations.status": "Published",
            "locations.cid": this.restaurant.googleListing.cid
          },
          projection: {
            "locations.status": 1
          },
          limit: 100
        }).toPromise();

        if (relevantAccounts.length > 0) {
          this._global.publishAlert(AlertType.Success, 'GMB already published!');
        } else {
          const task = {
            name: 'Apply GMB Ownership',
            scheduledAt: { $date: new Date() },
            description: gmbBiz.name,
            roles: ['GMB', 'ADMIN'],
            relatedMap: { gmbBizId: gmbBiz._id, cid: gmbBiz.cid, qmenuId: gmbBiz.qmenuId },
            transfer: {}
          };

          await this._api.post(environment.adminApiUrl + 'generic?resource=task', [task]).toPromise();
          this._global.publishAlert(AlertType.Success, 'Created new Apply GMB Ownership task');
        }


      } else {

        this._global.publishAlert(AlertType.Info, 'No apply GMB ownership task is created!');
      }

      // redirect to details page
      this._router.navigate(['/restaurants/' + this.restaurant._id]);
      this.apiRequesting = false;
    } catch (error) {
      this.apiRequesting = false;
      this._global.publishAlert(AlertType.Danger, JSON.stringify(error));
    }
  }

}
