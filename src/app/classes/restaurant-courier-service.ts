import { ApiService } from "../services/api.service";
import { environment } from "../../environments/environment";
import { Helper } from "./helper";
import { Courier } from "./courier";
import { RestaurantWithCourier } from './restaurant-courier'

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
    const couriers = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "courier",
      query: { name: courierName },
      projection: { name: 1 },
      limit: 1
    }).toPromise();
    if (couriers.length) {
      this.courier = new Courier(couriers[0]);
    }
    return;
  }

  // Utils.

  private filterObjectByKeys(obj: Object, keys: string[]) {
    return keys.reduce((objFiltered, key) => ({ ...objFiltered, [key]: obj[key] }), {});
  }

  private arrayToDictByKey(arr: Object[], key: string) {
    const dict = {};
    arr.forEach(each => { dict[each[key]] = each; });
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
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=' + this.databaseName, patchList).toPromise();
  }

  async updateProperties(restaurants: RestaurantWithCourier[], properties: string[]) {
    await this.patchChanges(restaurants, properties);
  }

  // For test use only.
  // async viewRestaurants() {
  //   const restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
  //     resource: 'restaurant',
  //     query: {},
  //     limit: 10,
  //     // projection: {
  //     //   _id: 1,
  //     //   "googleAddress.formatted_address": 1,
  //     //   name: 1,
  //     //   courier: 1
  //     // }
  //   }, 5000);
  //   console.log(restaurants);
  // }

  async reloadRestaurantData(): Promise<RestaurantWithCourier[]> {
    const restaurantListRaw = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: this.databaseName,
      query: { disabled: false },
      sort: { updatedAt: -1 },
    }, 100000);
    const restaurantList = restaurantListRaw.map(each => new RestaurantWithCourier(each));
    return restaurantList;
  }

  // Update restaurant list in courier database.

  async updateRestaurantList() {
    const restaurants = await this.getRestaurants();
    const restaurantsExisting = await this.getExistingRestaurants();

    const restaurantIdToRestaurantExisting = this.getRestaurantIdDictionary(restaurantsExisting);

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
      projection: {
        _id: 1,
        "googleAddress.formatted_address": 1,
        name: 1,
        courier: 1,
        score: 1,
        disabled: 1,
      },
    }, 100000);
    return this.parseRestaurants(restaurants);
  }

  private parseRestaurants(restaurants) {
    const ret = restaurants.map(each => ({
      restaurantId: each._id,
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
    }, 100000);
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
    return;
  }

  private async getListToCheck() {
    const blacklistForChecking = ["signed up"]; // Check all status other than "signed up". It does not detect confliction (signed up but actually not available).
    const checkNewAvailableOnly = false; // True: Check for new available ones only.
    if (checkNewAvailableOnly) {
      blacklistForChecking.push("available");
    }

    const restaurantsToCheck = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: this.databaseName,
      query: { availability: { $nin: blacklistForChecking } },
      sort: { checkedAt: 1 }, // Note that null is always "smallest".
      limit: this.batchSizeForChecking,
      projection: {
        restaurantId: 1,
        address: 1,
        checkedAt: 1 // Will get ISOString from ISOString or Date.
      }
    }).toPromise();
    const latestCheckDate = new Date(Date.now() - this.coolDownDays * 86400 * 1000).toISOString();
    const ret = restaurantsToCheck.filter(restaurant => !(restaurant.checkedAt && restaurant.checkedAt > latestCheckDate));
    return ret;
  }

  private async checkAvailability(restaurantList: RestaurantWithCourier[]) {
    this.checkingAvailability = true;
    for (let restaurant of restaurantList) {
      restaurant.availability = await this.checkAvailabilityByAddress(restaurant.address);
      restaurant.checkedAt = (new Date()).toISOString();
    }
    this.checkingAvailability = false;
    return;
  }

  private async checkAvailabilityByAddress(address: string) {
    let availability: string;
    try {
      await this._api.post(environment.appApiUrl + 'delivery/check-service-availability', {
        "address": address,
        courier: {
          ...this.courier
        }
      }).toPromise();
      availability = "available";
    } catch (error) {
      // console.log(error);
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
