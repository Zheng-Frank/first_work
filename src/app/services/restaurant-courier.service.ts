import { Injectable } from '@angular/core';
import { ApiService } from "../services/api.service";
import { environment } from "../../environments/environment";
import { GlobalService } from "../services/global.service";
import { RestaurantWithCourier } from '../classes/restaurant-courier'
import { Courier } from "../classes/courier";
import { Helper } from "src/app/classes/helper";

@Injectable({
  providedIn: 'root'
})
export class RestaurantCourierService {
  courier: Courier;
  databaseName: string;
  batchSizeForChecking: number;
  coolDownDays: number;
  checkingAvailability: boolean;

  constructor(private _api: ApiService) {
    this.databaseName = "postmates";
    this.batchSizeForChecking = 200;
    this.coolDownDays = 20;
    this.checkingAvailability = false;
  }

  async getCourierByName(courierName: string) {
    // console.log("loading couriers");
    const couriers = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "courier",
      query: { name: courierName },
      projection: { name: 1 },
      limit: 1
    }).toPromise();
    console.log(couriers);
    if (couriers.length) {
      this.courier = new Courier(couriers[0]); // Deep copy.
      return;
    }
    else {
      return;
    }
  }

  // HTTP methods.

  async postOne(restaurant) {
    await this._api.post(environment.qmenuApiUrl + 'generic?resource=' + this.databaseName, [restaurant]).toPromise();
  }

  async postMany(restaurants) {
    await this._api.post(environment.qmenuApiUrl + 'generic?resource=' + this.databaseName, restaurants).toPromise();
    return;
  }

  async patchMany(restaurants: RestaurantWithCourier[]) {
    const patchList = restaurants.map(each => ({
      old: { _id: each._id },
      new: each
    }));
    // console.log(patchList);
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=' + this.databaseName, patchList).toPromise();
  }

  async patchManyAvailabilityChanges(restaurants: RestaurantWithCourier[]) {
    const patchList = restaurants.map(each => ({
      old: { _id: each._id },
      new: { _id: each._id, availability: each.availability, checkedAt: each.checkedAt }
    }));
    // console.log(patchList);
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=' + this.databaseName, patchList).toPromise();
  }

  async patchOneCallLogsChange(restaurant: RestaurantWithCourier) {
    const patchList = [{
      old: { _id: restaurant._id },
      new: { _id: restaurant._id, callLogs: restaurant.callLogs }
    }];
    // console.log(patchList);
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=' + this.databaseName, patchList).toPromise();
  }
  
  

  async initDatabase() {
    // await this.getRestaurantList();
    console.log("Clearing database!!!");
    const idList = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: this.databaseName,
      query: {},
      projection: { _id: 1 },
      limit: 10000,  // Without limit, get will only get 2 documents???
    }).toPromise();
    console.log(idList);
    await this._api.delete(
      environment.qmenuApiUrl + "generic",
      {
        resource: this.databaseName,
        ids: idList.map(each => each._id)
      }
    ).toPromise();
    console.log("Deleted!!!")
    return;
  }

  // For test use only.
  async viewRestaurants(){
    const restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {},
      limit: 10,
      // projection: {
      //   _id: 1,
      //   "googleAddress._id": 1,
      //   "googleAddress.formatted_address": 1,
      //   name: 1,
      //   courier: 1
      // }
    }, 5000);
    console.log(restaurants);
  }  

  async reloadRestaurantData(): Promise<RestaurantWithCourier[]> {
    console.log("Reloading data...");
    const restaurantListRaw = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: this.databaseName,
      query: {},
      sort: { scanedAt: -1 },
      // limit: 1,
    }, 10000);
    console.log(restaurantListRaw);
    const restaurantList = restaurantListRaw.map(each => new RestaurantWithCourier(each));
    console.log(restaurantList);
    console.log("Data reloaded.");
    return restaurantList;
  }




  // Update restaurant list in courier database. To change!???

  async updateRestaurantList() {
    const restaurants = await this.getRestaurantList();
    const restaurantListWithCourierNew = this.parseRestaurants(restaurants);
    await this.postMany(restaurantListWithCourierNew);
    return;
  }

  // ref: D:\Codes\Web\admin\src\app\components\restaurants\restaurant-delivery-settings\restaurant-delivery-settings.component.ts
  private async getRestaurantList(acknowledge?) {
    // get all users
    const restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {},
      // query: {disabled: false}, //???
      limit: 15, // For test???
      projection: {
        _id: 1,
        "googleAddress._id": 1,
        "googleAddress.formatted_address": 1,
        name: 1,
        courier: 1,
        score: 1
      }
    }, 5000);
    const restaurantsExisting = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: this.databaseName,
      query: {},
      projection: {
        restaurantId: 1
      }
    }, 10000);
    const restaurantIDsExisting = restaurantsExisting.map(restaurant => restaurant.restaurantId);
    const ret = restaurants.filter(restaurant => !(restaurantIDsExisting.includes(restaurant._id)));
    console.log(restaurants);
    console.log(ret);
    return ret;
  }

  private parseRestaurants(restaurants){
    const ret = restaurants.map(each => ({
      restaurantId: each._id,
      cid: each.googleAddress._id,
      name: each.name,
      address: each.googleAddress.formatted_address,
      score: each.score,
      timeZone: Helper.getTimeZone(each.googleAddress.formatted_address),
      availability: (each.courier && each.courier.name === this.courier.name) ? "signed up" : null,
    }));
    return ret;
  }

  // Update courier availability. TODO: add types??? Postmates to couriers???
  async scanCourierAvailability() {
    const restaurantsToCheck = (await this.getListToCheck()).map(each => new RestaurantWithCourier(each));
    await this.checkAvailability(restaurantsToCheck);
    await this.patchManyAvailabilityChanges(restaurantsToCheck);
    console.log("Scaned!");
    return;
  }

  private async getListToCheck() {
    const blacklistForChecking = ["available", "signed up"];

    const restaurantsToCheck = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: this.databaseName,
      query: { availability: { $nin: blacklistForChecking } }, // check unavailable restaurants only (?)
      sort: { checkedAt: 1 }, // Note that null is always "smallest"
      limit: this.batchSizeForChecking,
      projection: {
        restaurantId: 1,
        address: 1,
        checkedAt: 1
      }
    }).toPromise();
    console.log(restaurantsToCheck);
    const coolDownDate = new Date(Date.now() - this.coolDownDays * 86400 * 1000).toISOString();
    console.log(coolDownDate);
    const ret = restaurantsToCheck.filter(restaurant => !(restaurant.checkedAt && restaurant.checkedAt > coolDownDate));
    console.log(ret)
    return ret;
  }

  private async checkAvailability(restaurantList: RestaurantWithCourier[]) {
    for (let restaurant of restaurantList) {
      restaurant.availability = await this.checkAvailabilityByAddress(restaurant.address);
      restaurant.checkedAt = (new Date()).toISOString();
    }
    console.log(restaurantList);
    return;
  }

  private async checkAvailabilityByAddress(address: string) {
    let availability: string;
    this.checkingAvailability = true;
    try {
      await this._api.post(environment.appApiUrl + 'delivery/check-service-availability', {
        "address": address,
        courier: {
          ...this.courier // ??? why not courier: this.courier??? get a copy?
        }
      }).toPromise();
      availability = "available";
    } catch (error) {
      console.log(error);
      availability = "not available";
    }
    this.checkingAvailability = false;
    return availability;
  }
}
