import { Component, OnInit, ViewChild } from "@angular/core";
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { RestaurantWithCourier } from "../../../classes/restaurant-courier";

@Component({
  selector: 'app-postmates-list',
  templateUrl: './postmates-list.component.html',
  styleUrls: ['./postmates-list.component.css']
})

/* // Not used yet.
export interface PostmatesInfo {
  _id: string;
  restaurantId: string;
  name: string;
  address: string;
  postmatesAvailabilityGZ: string;
  checkedAt: number;
}*/


export class PostmatesListComponent implements OnInit {
  restaurants;
  courier = { name: "Postmates" };
  postmatesListNew;
  postmatesListToCheck;

  constructor(private _api: ApiService, private _global: GlobalService) {
    console.log("constructing PostmatesListComponent");
    this.getCourierByName();
    this.refresh();
  }

  ngOnInit() {
  }

  async initDatabase() {
    // await this.getRestaurantList();
    console.log("Clearing database!!!");
    this.postmatesList = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: "postmates",
      query: {},
      limit: 100
    }, 8000);
    console.log(this.postmatesList);
    await this._api.delete(
      environment.qmenuApiUrl + "generic",
      {
        resource: 'postmates',
        ids: this.postmatesList.map(each => each._id)
      }
    );
    console.log("Deleted!!!")
    return;
  }

  async getCourierByName() {
    // console.log("loading couriers");
    const couriers = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "courier",
      query: { name: this.courier.name },
      projection: { name: 1 },
      limit: 10
    }).toPromise()
    console.log(couriers);
    if (couriers.length) {
      this.courier = couriers[0];
    }
    return;
  }

  postmatesList;
  async refresh() {
    console.log("Refreshing data");
    this.postmatesList = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: "postmates",
      query: {},
      // sort: {scanedAt: 1},
      // limit: 100000
    }, 8000);
    console.log(this.postmatesList);
    console.log("Refreshed data");
    return;
  }

  user = "";
  skeletalRestaurants;


  async scanPostmates() {
    // await this.updateRestaurantList(); //???

    const batchSize = 10;
    // Test Only!
    this.skeletalRestaurants = this.restaurants;

    this.postmatesListToCheck = await this.getListToCheck(batchSize);

    await this.checkPostmates(this.postmatesListToCheck);
    await this.patchManyToList(this.postmatesListToCheck);
    console.log("Scaned!");
    this.refresh();
  }

  async updateRestaurantList() {
    this.restaurants = await this.getRestaurantList();
    this.postmatesListNew = this.parseRestaurants(this.restaurants);
    await this.postManyToList(this.postmatesListNew);
  }

  // ref: D:\Codes\Web\admin\src\app\components\restaurants\restaurant-delivery-settings\restaurant-delivery-settings.component.ts
  async getRestaurantList(acknowledge?) {
    // get all users
    const query = {};
    const restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: query,
      limit: 300,
      projection: {
        _id: 1,
        "googleAddress._id": 1,
        "googleAddress.formatted_address": 1,
        name: 1,
        courier: 1
      }
    }, 3000);
    const restaurantsExisting = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'postmates',
      query: query,
      // limit: 10,
      projection: {
        restaurantId: 1
      }
    }, 3000);
    const restaurantIDsExisting = restaurantsExisting.map(restaurant => restaurant.restaurantId);
    const ret = restaurants.filter(restaurant => !(restaurantIDsExisting.includes(restaurant._id)));
    console.log(restaurants);
    console.log(ret);
    return ret;
  }

  parseRestaurants(restaurants) {
    const ret = restaurants.map(each => ({
      restaurantId: each._id,
      cid: each.googleAddress._id,
      name: each.name,
      address: each.googleAddress.formatted_address,
      postmatesAvailabilityGZ: (each.courier && each.courier.name === this.courier.name)? "signed up": null,
    }));
    return ret;
  }

  async getListToCheck(batchSize) {
    const availableStatusList = ["available", "signed up"];
    // Note that null is always "smallest"
    const restaurantsToCheck = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'postmates',
      query: { postmatesAvailabilityGZ: { $nin: availableStatusList } }, // check unavailable restaurants only (?)
      sort: { checkedAt: 1 }, //???
      limit: batchSize,
      projection: {
        restaurantId: 1,
        address: 1,
        checkedAt: 1
      }
    }).toPromise();
    console.log(restaurantsToCheck);
    const coolDownDays = 20;
    const coolDownDate = new Date(Date.now() - coolDownDays * 86400 * 1000);
    console.log(coolDownDate.toISOString());
    const ret = restaurantsToCheck.filter(restaurant => !(restaurant.checkedAt && restaurant.checkedAt > coolDownDate.toISOString()));
    console.log(ret)
    return ret;
  }

  async checkPostmates(postmatesList) {
    for (let address of postmatesList) {
      address.postmatesAvailabilityGZ = await this.checkPostmatesAvailabilityByAddress(address.address);
      address.checkedAt = (new Date()).toISOString();
    }
    console.log(postmatesList);
    return
  }

  checkingPostmatesAvailability = false;
  async checkPostmatesAvailabilityByAddress(address) {
    let postmatesAvailability;
    this.checkingPostmatesAvailability = true;
    try {
      await this._api.post(environment.appApiUrl + 'delivery/check-service-availability', {
        "address": address,
        courier: {
          ...this.courier
        }
      }).toPromise();
      postmatesAvailability = "available";
    } catch (error) {
      console.log(error);
      postmatesAvailability = "not available";
    }
    this.checkingPostmatesAvailability = false;
    return postmatesAvailability;
  }

  async postOneToList(restaurant) {
    await this._api.post(environment.qmenuApiUrl + 'generic?resource=postmates', [restaurant]).toPromise();
  }

  async postManyToList(restaurants) {
    await this._api.post(environment.qmenuApiUrl + 'generic?resource=postmates', restaurants).toPromise();
  }

  async patchManyToList(restaurants) {
    const patchList = restaurants.map(each => ({
      old: { _id: each._id },
      new: { _id: each._id, postmatesAvailabilityGZ: each.postmatesAvailabilityGZ, checkedAt: each.checkedAt }
    }));
    console.log(patchList);
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=postmates', patchList).toPromise();
  }
}
