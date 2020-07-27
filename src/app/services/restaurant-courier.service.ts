import { Injectable } from '@angular/core';
import { ApiService } from "../services/api.service";
import { GlobalService } from "../services/global.service";
import { environment } from "../../environments/environment";
import { Helper } from "../classes/helper";
import { Courier } from "../classes/courier";
import { RestaurantWithCourier } from '../classes/restaurant-courier'
import { CallLog } from '../classes/call-log';

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
    // console.log(couriers);
    if (couriers.length) {
      this.courier = new Courier(couriers[0]);
      return;
    }
    else {
      return;
    }
  }

  // Utils.

  // add to some code base???
  private filterObjectByKeys(obj: Object, keys: string[]) {
    return keys.reduce((objFiltered, key) => ({ ...objFiltered, [key]: obj[key] }), {});
  }

  private arrayToDictByKey(arr: Object[], key: string) {
    const dict = {};
    arr.forEach(each => {
      dict[each[key]] = each;
    });
    return dict;
  }

  // HTTP methods.

  private async postNew(restaurants) {
    // Do not include _id in restaurants.
    await this._api.post(environment.qmenuApiUrl + 'generic?resource=' + this.databaseName, restaurants).toPromise();
    return;
  }

  private async patchChanges(restaurants: RestaurantWithCourier[], properties: string[]) {
    const propertiesWithId = [...properties, "_id"];
    const patchList = restaurants.map(each => ({
      old: { _id: each._id },
      new: this.filterObjectByKeys(each, propertiesWithId),
    }));
    // console.log(patchList);
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=' + this.databaseName, patchList).toPromise();
  }

  async updateProperties(restaurants: RestaurantWithCourier[], properties: string[]) {
    await this.patchChanges(restaurants, properties);
  }


  // private async postOne(restaurant) {
  //   await this._api.post(environment.qmenuApiUrl + 'generic?resource=' + this.databaseName, [restaurant]).toPromise();
  // }

  // private async patchMany(restaurants: RestaurantWithCourier[]) {
  //   const patchList = restaurants.map(each => ({
  //     old: { _id: each._id },
  //     new: each
  //   }));
  //   // console.log(patchList);
  //   await this._api.patch(environment.qmenuApiUrl + 'generic?resource=' + this.databaseName, patchList).toPromise();
  // }

  // private async patchManyAvailabilityChanges(restaurants: RestaurantWithCourier[]) {
  //   const patchList = restaurants.map(each => ({
  //     old: { _id: each._id },
  //     new: { _id: each._id, availability: each.availability, checkedAt: each.checkedAt }
  //   }));
  //   // console.log(patchList);
  //   await this._api.patch(environment.qmenuApiUrl + 'generic?resource=' + this.databaseName, patchList).toPromise();
  // }

  // private async patchChangesOnOneProperty(restaurants: RestaurantWithCourier[], property: string){
  //   const patchList = restaurants.map(each => ({
  //     old: { _id: each._id },
  //     new: { _id: each._id, [property]: each[property]}
  //   }));
  //   // console.log(patchList);
  //   await this._api.patch(environment.qmenuApiUrl + 'generic?resource=' + this.databaseName, patchList).toPromise();
  // }


  // private async patchOneCallLogsChange(restaurant: RestaurantWithCourier) {
  //   const patchList = [{
  //     old: { _id: restaurant._id },
  //     new: { _id: restaurant._id, callLogs: restaurant.callLogs, callers: restaurant.callers }
  //   }];
  //   // console.log(patchList);
  //   await this._api.patch(environment.qmenuApiUrl + 'generic?resource=' + this.databaseName, patchList).toPromise();
  // }



  async initDatabase() { // Better way to delete all???
    console.log("Clearing database!!!");

    const idList = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: this.databaseName,
      query: {},
      projection: { _id: 1 },
      limit: 1000000,  // Without limit, get will only get 2 documents???
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
  async viewRestaurants() {
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
      // query: {disabled: false}, 
      sort: { updatedAt: -1 },
      // limit: 1,
    }, 10000);
    // console.log(restaurantListRaw);

    const restaurantList = restaurantListRaw.map(each => new RestaurantWithCourier(each));
    console.log(restaurantList);

    console.log("Data reloaded.");
    return restaurantList;
  }

  // Update restaurant list in courier database.

  async updateRestaurantList() {
    const restaurants = await this.getRestaurants();
    const restaurantsExisting = await this.getExistingRestaurants();

    const restaurantIdToRestaurantExisting = this.getRestaurantIdDictionary(restaurantsExisting);
    // const restaurantIdsExisting = Object.keys(restaurantIdToRestaurantExisting);

    const restaurantsToAdd = [];
    const restaurantsToChangeOnDisabled = [];
    const restaurantsToChangeAvailability = [];

    restaurants.forEach(restaurant => {
      const restaurantExisting = restaurantIdToRestaurantExisting[restaurant.restaurantId];
      if (!restaurantExisting) {
        restaurantsToAdd.push(restaurant);
      }
      else {
        if (restaurantExisting.disabled !== restaurant.disabled) {
          restaurantExisting.disabled = restaurant.disabled;
          restaurantsToChangeOnDisabled.push(restaurantExisting);
        }
        if (restaurant.availability === "signed up") {
          if (restaurantExisting.availability !== "signed up") {
            restaurantExisting.availability = "signed up";
            restaurantsToChangeAvailability.push(restaurantExisting);
          }
        }
        else {
          if (restaurantExisting.availability === "signed up") {
            restaurantExisting.availability = "available";
            restaurantsToChangeAvailability.push(restaurantExisting);
          }
        }
      }
    })

    await this.postNew(restaurantsToAdd);
    await this.patchChanges(restaurantsToChangeOnDisabled, ["disabled"]);
    await this.patchChanges(restaurantsToChangeAvailability, ["availability"]);

    return;
  }

  private async getRestaurants(acknowledge?) {
    const restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {},
      // query: {disabled: false}, //Change when finalize???
      limit: 15, // For test???
      projection: {
        _id: 1,
        "googleAddress._id": 1,
        "googleAddress.formatted_address": 1,
        name: 1,
        courier: 1,
        score: 1,
        disabled: 1,
      }
    }, 5000);
    return this.parseRestaurants(restaurants);
  }

  private parseRestaurants(restaurants) {
    const ret = restaurants.map(each => ({
      restaurantId: each._id,
      cid: each.googleAddress._id,
      name: each.name,
      address: each.googleAddress.formatted_address,
      disabled: each.disabled,
      score: each.score,
      timeZone: Helper.getTimeZone(each.googleAddress.formatted_address),
      availability: (each.courier && each.courier.name === this.courier.name) ? "signed up" : null,
    }));
    return ret;
  }

  private async getExistingRestaurants(acknowledge?) {
    const restaurantsExisting = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: this.databaseName,
      query: {},
      projection: {
        restaurantId: 1,
        disabled: 1,
        availability: 1,
      }
    }, 10000);
    return restaurantsExisting;
  }

  private getRestaurantIdDictionary(restaurants) {
    return this.arrayToDictByKey(restaurants, "restaurantId");
  }

  // Update courier availability.
  async scanCourierAvailability() {
    const restaurantsToCheck: RestaurantWithCourier[] = (await this.getListToCheck()).map(each => new RestaurantWithCourier(each));
    await this.checkAvailability(restaurantsToCheck);
    await this.patchChanges(restaurantsToCheck, ["availability", "checkedAt"]);
    console.log("Scaned!");
    return;
  }

  private async getListToCheck() {
    const blacklistForChecking = ["signed up"]; // Check all status other than "signed up". It does not detect confliction (signed up but actually not available).
    // const blacklistForChecking = ["available", "signed up"]; // Check for new available ones only.

    const restaurantsToCheck = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: this.databaseName,
      query: { availability: { $nin: blacklistForChecking } },
      sort: { checkedAt: 1 }, // Note that null is always "smallest"
      limit: this.batchSizeForChecking,
      projection: {
        restaurantId: 1,
        address: 1,
        checkedAt: 1 // Will get ISOString from ISOString or Date!
      }
    }).toPromise();
    // console.log(restaurantsToCheck);
    const latestCheckDate = new Date(Date.now() - this.coolDownDays * 86400 * 1000).toISOString();
    // console.log(latestCheckDate);
    const ret = restaurantsToCheck.filter(restaurant => !(restaurant.checkedAt && restaurant.checkedAt > latestCheckDate));
    // console.log(ret)
    return ret;
  }

  private async checkAvailability(restaurantList: RestaurantWithCourier[]) {
    this.checkingAvailability = true;
    for (let restaurant of restaurantList) {
      restaurant.availability = await this.checkAvailabilityByAddress(restaurant.address);
      restaurant.checkedAt = (new Date()).toISOString();
    }
    this.checkingAvailability = false;
    // console.log(restaurantList);
    return;
  }

  private async checkAvailabilityByAddress(address: string) {
    let availability: string;
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
    return availability;
  }

  // Callers

  updateMostRecentCaller(restaurant: RestaurantWithCourier) {
    if (restaurant.callLogs.length) {
      if (!restaurant.callers || !restaurant.callers.length) {
        restaurant.callers = [restaurant.callLogs[0].caller];
      }
      else {
        if (restaurant.callers[0] != restaurant.callLogs[0].caller) {
          const indexExisting = restaurant.callers.indexOf(restaurant.callLogs[0].caller);
          if (indexExisting >= 0) {
            restaurant.callers.splice(indexExisting, 1);
          }
          restaurant.callers.unshift(restaurant.callLogs[0].caller);
        }
      }
    }
    return;
  }

  updateCallers(restaurant: RestaurantWithCourier) {
    restaurant.callers = [];
    restaurant.callLogs.forEach(each => {
      if (!restaurant.callers.includes(each.caller)) {
        restaurant.callers.push(each.caller);
      }
    })
    return;
  }
}
