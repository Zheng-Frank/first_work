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
    this.skipApplyGmb = this._global.user.roles.some(r => r === 'MARKETER_INTERNAL' || r === 'MARKETER_EXTERNAL');
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
      crawledResult = await this._api.get(environment.qmenuApiUrl + "utils/scan-gmb", { q: [this.restaurant.name, this.restaurant.googleAddress.formatted_address].join(" ") }).toPromise();
    }
    catch (error) {
      console.log(error);
      // try to use only city state and zip code!
      // "#4, 6201 Whittier Boulevard, Los Angeles, CA 90022" -->  Los Angeles, CA 90022
      const addressTokens = this.restaurant.googleAddress.formatted_address.split(", ");
      const q = this.restaurant.name + ' ' + addressTokens[addressTokens.length - 2] + ', ' + addressTokens[addressTokens.length - 1];
      try {
        crawledResult = await this._api.get(environment.appApiUrl + "utils/scan-gmb", { q: q }).toPromise();
      } catch (error) {
        console.log(error);
      }
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
      const addressDetails = await this._api.get(environment.qmenuApiUrl + "utils/google-address", {
        place_id: crawledResult.place_id
      }).toPromise();
      // crawledResult.address MAY have wrong city name! eg. 52-35 Metropolitan Ave, Ridgewood, NY 11385
      // in this case, addressDetails doesn't have locality and sublocality_level_1.
      // we can try our luck with another API call, using address instead of place_id, without the city
      //commented out on 02/08/21, since we w
      // if (!(addressDetails.locality || addressDetails.sublocality_level_1 || addressDetails.postal_code_suffix)) {
      //   const addressTokens = crawledResult.address.replace(", USA", "").split(",");
      //   // remove city
      //   addressTokens.splice(addressTokens.length - 2, 1);
      //   const addressWithoutCity = addressTokens.join(",");
      //   const a2 = await this._api.get(environment.qmenuApiUrl + "utils/google-address", {
      //     formatted_address: addressWithoutCity
      //   }).toPromise();

      //   if (!(a2.locality || a2.sublocality_level_1 || a2.postal_code_suffix)) {
      //     alert("Bad address, please notify your manager! 地址查询出错，请通知经理");
      //     throw "still bad address"
      //   }
      //   this.restaurant.googleAddress = a2;

      // } else {
      //   this.restaurant.googleAddress = addressDetails;
      // }
      this.restaurant.googleAddress = addressDetails;

    } catch (error) {
      this.apiRequesting = false;
      this.checkExistenceError = "Error: google address query.";
      return;
    }

    // query existing restaurant with SAME phone number!
    // const allExistingRestaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
    //   resource: "restaurant",
    //   query: {
    //     "channels.value": crawledResult.phone || 'non-existing',
    //     "googleAddress.postal_code": this.restaurant.googleAddress.postal_code
    //   },
    //   projection: {
    //     channels: 1,
    //     name: 1,
    //     disabled: 1,
    //     googleAddress: 1
    //   },
    //   limit: 5
    // }).toPromise();
    // query existing restaurant with SAME place_id or phone number
    const allExistingRestaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: "restaurant",
      query: {
        $or: [
          {
            "channels.value": crawledResult.phone || 'non-existing',
            "googleAddress.postal_code": this.restaurant.googleAddress.postal_code
          },
          {
            "googleAddress.place_id": crawledResult.place_id
          },
          {
            "googleListing.place_id": crawledResult.place_id
          }
        ]
      },
      projection: {
        channels: 1,
        name: 1,
        disabled: 1,
        googleAddress: 1
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
          "notifications": ['Order', 'Business']
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

    const place_id = (this.restaurant.googleListing || {}).place_id;
    // one more time to check existence
    const allExistingRestaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: "restaurant",
      query: {
        $or: [
          {
            "googleAddress.place_id": place_id
          },
          {
            "googleListing.place_id": place_id
          }
        ]
      },
      projection: {
        name: 1,
        disabled: 1
      },
      limit: 5
    }).toPromise();

    const nonDisabled = allExistingRestaurants.filter(r => !r.disabled);
    if (nonDisabled.length > 0) {
      this._global.publishAlert(AlertType.Danger, `Already existed in DB, ID: ${nonDisabled[0]._id}`, 30000);
      return;
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

      const newRestaurants = await this._api.post(environment.qmenuApiUrl + 'generic?resource=restaurant', [this.restaurant]).toPromise();
      // assign newly created id back to original object
      this.restaurant._id = newRestaurants[0];

      // add event to craw menus
      await this.crawlMenus();

      this._global.publishAlert(AlertType.Success, 'Created restaurant');

      // force refreshing global restaurant list!
      await this._global.getCachedRestaurantListForPicker(true);
      // create GMB here!
      const existingGmbs = await this._api.get(environment.qmenuApiUrl + 'generic', {
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
        await this._api.patch(environment.qmenuApiUrl + 'generic?resource=gmbBiz', existingGmbs.map(biz =>
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

        const bizs = await this._api.post(environment.qmenuApiUrl + 'generic?resource=gmbBiz', [newGmbBiz]).toPromise();
        this._global.publishAlert(AlertType.Success, 'Created new GMB');
        newGmbBiz['_id'] = bizs[0];

        gmbBiz = newGmbBiz;

      }

      /** not needed anymore A.X. 10/1/2020
            // see if we need to create Apply GMB task!
            if (!this.skipApplyGmb) {
              // making sure it's not already published somewhere!
              const relevantAccounts = await this._api.get(environment.qmenuApiUrl + 'generic', {
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
      
                await this._api.post(environment.qmenuApiUrl + 'generic?resource=task', [task]).toPromise();
                this._global.publishAlert(AlertType.Success, 'Created new Apply GMB Ownership task');
              }
      
      
            } else {
      
              this._global.publishAlert(AlertType.Info, 'No apply GMB ownership task is created!');
            }
      */
      // redirect to details page
      this._router.navigate(['/restaurants/' + this.restaurant._id]);
      this.apiRequesting = false;
    } catch (error) {
      this.apiRequesting = false;
      this._global.publishAlert(AlertType.Danger, JSON.stringify(error));
    }
  }
  isDisabled() {
    return this._global.user.roles.some(r => r === 'MARKETER_INTERNAL' || r === 'MARKETER_EXTERNAL');
  }

  async crawlMenus() {
    try {
      const providers = await this._api.post(environment.appApiUrl + "utils/menu", {
        name: "get-service-providers",
        payload: {
          name: this.restaurant.name,
          address: (this.restaurant.googleAddress || {} as any).formatted_address,
          phone: (this.restaurant.googleListing || {}).phone
        }
      }).toPromise();
      const [knownProvider] = providers.filter(p => ["slicelife", "grubhub", "beyondmenu", "chinesemenuonline", "redpassion", "menufy", "doordash"].indexOf(p.name || "bad-unknown") >= 0).map(p => ({
        name: p.name,
        url: (p.menuUrl && p.menuUrl !== "unknown") ? p.menuUrl : p.url
      }));
      if (knownProvider) {
        await this._api.post(environment.appApiUrl + 'events',
          [{ queueUrl: `https://sqs.us-east-1.amazonaws.com/449043523134/events-v3`, event: { name: 'populate-menus', params: { provider: knownProvider.name, restaurantId: this.restaurant._id, url: knownProvider.url } } }]
        ).toPromise();
      }
    } catch (error) {
      console.log(error);
    }
  }
}
