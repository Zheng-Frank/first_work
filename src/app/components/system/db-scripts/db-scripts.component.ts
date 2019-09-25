import { Component, OnInit } from "@angular/core";
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";
import { zip, onErrorResumeNext } from "rxjs";
import { mergeMap } from "rxjs/operators";
import { Restaurant, Hour } from '@qmenu/ui';
import { Invoice } from "../../../classes/invoice";
import { Gmb3Service } from "src/app/services/gmb3.service";
import { JsonPipe } from "@angular/common";
import { Helper } from "src/app/classes/helper";
import { group } from "@angular/animations";

@Component({
  selector: "app-db-scripts",
  templateUrl: "./db-scripts.component.html",
  styleUrls: ["./db-scripts.component.scss"]
})
export class DbScriptsComponent implements OnInit {
  removingOrphanPhones = false;
  constructor(private _api: ApiService, private _global: GlobalService, private _gmb3: Gmb3Service) { }

  ngOnInit() { }

  async computeDuplicates() {
    const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
      },
      projection: {
        name: 1,
        'googleAddress.place_id': 1,
        'googleAddress.formatted_address': 1,
        'rateSchedules.agent': 1,
        previousRestaurantId: 1,
        disabled: 1,
        channels: 1,
        createdAt: 1,
        "googleListing.place_id": 1
      },
      limit: 8000
    }).toPromise();
    const placeIdMap = {};
    restaurants.map(rt => {
      // if (rt.googleAddress) {
      //   placeIdMap[rt.googleAddress.place_id] = placeIdMap[rt.googleAddress.place_id] || [];
      //   placeIdMap[rt.googleAddress.place_id].push(rt);
      // }
      if (rt.googleListing) {
        placeIdMap[rt.googleListing.place_id] = placeIdMap[rt.googleListing.place_id] || [];
        placeIdMap[rt.googleListing.place_id].push(rt);
      }
    });
    const grouped = Object.keys(placeIdMap).map(place_id => ({ place_id: place_id, list: placeIdMap[place_id] }));
    grouped.sort((b, a) => a.list.length - b.list.length);
    const duplicatedGroups = grouped.filter(g => g.list.length > 1);

    console.log(duplicatedGroups)
  }

  async injectPopularItems() {
    // 1. get 1000 orders of each restaurant
    // 2. get miInstance.id of each menu
    // 3. get top 20 and inject back to restaurant
    const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
      },
      projection: {
        'name': 1,
        'menus.name': 1,
        'menus.popularMiIds': 1
      },
      limit: 8000
    }).toPromise();
    const restaurantsWithoutPopularItems = restaurants.filter(rt => rt.menus && rt.menus.length > 0 && !rt.menus.some(menu => menu.popularMiIds));

    // console.log('need injection: ', restaurantsWithoutPopularItems);
    for (let rt of restaurantsWithoutPopularItems) {

      // if (rt._id !== '57e9574c1d1ef2110045e665') {
      //   continue;
      // }
      console.log(rt.name, rt._id);
      const rtId = rt._id;
      const orders = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'order',
        query: {
          restaurant: { $oid: rtId }
        },
        projection: {
          'orderItems.miInstance.id': 1,
          'orderItems.miInstance.name': 1,
          'orderItems.menuName': 1
        },
        limit: 1000
      }).toPromise();
      // console.log(orders);
      const menuIdCounter = {};

      const idNameMap = {};


      orders.map(order => order.orderItems.filter(oi => oi.miInstance && oi.miInstance.id && oi.menuName).map(oi => {
        idNameMap[oi.miInstance.id] = oi.miInstance.name;
        menuIdCounter[oi.menuName] = menuIdCounter[oi.menuName] || {};
        menuIdCounter[oi.menuName][oi.miInstance.id] = (menuIdCounter[oi.menuName][oi.miInstance.id] || 0) + 1;
      }));

      const newRt = JSON.parse(JSON.stringify(rt));
      const menuPopularIds = Object.keys(menuIdCounter).map(menuName => {
        const idCoutDict = menuIdCounter[menuName];
        const sortedItems = Object.keys(idCoutDict).map(id => ({ id: id, name: idNameMap[id], count: idCoutDict[id] })).sort((i1, i2) => i2.count - i1.count);
        // popular: first item's 1/5
        const cutOff = sortedItems[0].count / 4 + 10;
        const popularItems = sortedItems.filter(s => s.count >= cutOff);
        newRt.menus.map(menu => {
          if (menu.name === menuName) {
            menu.popularMiIds = popularItems.map(item => item.id);
          }
        });
        // console.log(menuName, popularItems);
      });
      if (JSON.stringify(newRt) !== JSON.stringify(rt)) {
        await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
          old: rt,
          new: newRt
        }]).toPromise();
      }

    }

  }

  async migrateTme() {
    const tmeCourier = (await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'courier',
      query: {
        name: 'Ten Mile Express'
      },
      projection: {
        name: 1
      },
      limit: 1
    }).toPromise())[0];
    if (!tmeCourier) {
      return alert('TME No found');
    }
    const tmeRestaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        deliveryByTme: true
      },
      projection: {
        name: 1,
        "googleAddress.formatted_address": 1,
        "googleListing.phone": 1,
        "googleAddress.lat": 1,
        "googleAddress.lng": 1,
        "googleAddress.place_id": 1,
        "googleAddress.timezone": 1
      },
      limit: 100
    }).toPromise();

    console.log(tmeRestaurants);
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=courier', [{
      old: { _id: tmeCourier._id },
      new: {
        _id: tmeCourier._id, restaurants: tmeRestaurants.map(r => ({
          _id: r._id,
          name: r.name,
          formatted_address: (r.googleAddress || {}).formatted_address,
          phone: (r.googleListing || {}).phone,
          lat: (r.googleAddress || {}).lat,
          lng: (r.googleAddress || {}).lng,
          place_id: (r.googleAddress || {}).place_id,
          timezone: (r.googleAddress || {}).timezone,
        }))
      },
    }]).toPromise();
    alert('Done!');
  }

  async removeRedundantOptions() {
    // orders.map(order => {
    //   order.orderItems.map(oi => {
    //     oi.miInstance.sizeOptions = [...oi.miInstance.sizeOptions.slice(0, 2), ...oi.miInstance.sizeOptions.slice(2).filter(so => so.selected)];
    //     (oi.mcSelectedMenuOptions || []).map(options => {
    //       options.items = [...options.items.slice(0, 2), ...options.items.slice(2).filter(item => item.selected)];
    //     });
    //     (oi.miSelectedMenuOptions || []).map(options => {
    //       options.items = [...options.items.slice(0, 2), ...options.items.slice(2).filter(item => item.selected)];
    //     });
    //   });
    //   console.log(order._id, JSON.stringify(order).length);
    // });
  }

  async injectTimezone() {
    const missingTimezoneRestaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        "googleAddress.timezone": null,
        "googleAddress.place_id": { $exists: true }
      },
      projection: {
        name: 1,
        "googleAddress.place_id": 1,
        "googleListing.place_id": 1,
        disabled: 1
      },
      limit: 6000
    }).toPromise();

    console.log(missingTimezoneRestaurants);
    for (let r of missingTimezoneRestaurants) {
      try {
        let place_id = r.googleAddress.place_id;
        if (place_id.length > 30 && r.googleListing && r.googleListing.place_id) {
          place_id = r.googleListing.place_id;
        }
        const addressDetails = await this._api.get(environment.qmenuApiUrl + "utils/google-address", {
          place_id: place_id
        }).toPromise();
        await this._api.patch(environment.qmenuApiUrl + "generic?resource=restaurant", [
          {
            old: { _id: r._id, googleAddress: {} },
            new: { _id: r._id, googleAddress: { place_id: place_id, timezone: addressDetails.timezone } }
          }
        ]).toPromise();
        console.log(r.name);
      } catch (error) {
        console.log(r.name, r.disabled, '-------------------');
        console.log(error);
      }
    }
  }

  async changeOwnership() {
    const oldRestaurantId = '5b9a333bac400914000b2a39';
    const newName = "Thai Spoon";
    const previousRestaurantId = oldRestaurantId;
    const newAlias = "thai-spoon-ann-arbor";
    const switchingDate = new Date("Aug 14 2019 00:00:01 GMT-0400 (Eastern Daylight Time)");

    const oldRestaurant = (await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        _id: { $oid: oldRestaurantId }
      },
      limit: 1
    }).toPromise())[0];

    console.log(oldRestaurant);
    const existingOnes = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        "googleAddress.place_id": oldRestaurant.googleAddress.place_id
      },
      limit: 2
    }).toPromise();
    if (existingOnes.length > 1) {
      return alert('Failed: Already have multiple restaurants with same place ID.');
    }

    const clone = JSON.parse(JSON.stringify(oldRestaurant));
    delete clone._id;
    clone.createdAt = new Date();
    clone.updatedAt = new Date();
    (clone.rateSchedules || []).map(rs => rs.agent = 'none');
    delete clone.notifications;
    delete clone.closedHours;
    clone.name = newName;
    clone.previousRestaurantId = previousRestaurantId;
    clone.logs = clone.logs || [];
    clone.logs.push({
      "problem": "change ownership",
      "response": "this is the new. Old one is " + oldRestaurant._id,
      "time": new Date(),
      "username": "system",
      "resolved": true
    });

    const oldPatch: any = {
      old: { _id: oldRestaurant._id },
      new:
      {
        _id: oldRestaurant._id,
        disabled: true
      }
    };

    if (oldRestaurant.alias === newAlias) {
      // patch old to a new alias
      oldPatch.new.alias = oldRestaurant.alias + "-old";
    } else {
      // use new alias directly
      clone.alias = newAlias;
    }

    if (oldRestaurant.name === newName) {
      oldPatch.new.name = oldRestaurant.name + ' - old';
    }

    const ordersToMigrate = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'order',
      query: {
        restaurant: { $oid: oldRestaurant._id },
        createdAt: { $gt: { $date: switchingDate } }
      },
      projection: {
        createdAt: 1
      },
      limit: 8000
    }).toPromise();

    // start the action!
    // 1. create the new restaurant!
    const resultIds = await this._api.post(environment.qmenuApiUrl + 'generic?resource=restaurant', [clone]).toPromise();

    // 2. now path those orders's restaurant field
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=order',
      ordersToMigrate.map(order => ({
        old: { _id: order._id },
        new: { _id: order._id, restaurant: { $oid: resultIds[0] } },
      }))
    ).toPromise();

    oldPatch.new.logs = oldRestaurant.logs || [];
    oldPatch.new.logs.push({
      "problem": "change ownership",
      "response": "new RT id is " + resultIds[0],
      "time": new Date(),
      "username": "system",
      "resolved": true
    });

    // 3. patch old restaurant!
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [oldPatch]).toPromise();

    alert('Done! ' + resultIds[0]);
  }


  // async migrateOrderStatuses() {
  //   // some completed or canceld that's not reflected into to orders :(
  //   const dateThreshold = new Date();
  //   dateThreshold.setDate(dateThreshold.getDate() - 2);
  //   const doneOrderStatuses = await this._api.get(environment.qmenuApiUrl + 'generic', {
  //     resource: 'orderstatus',
  //     query: {
  //       createdAt: { $gt: dateThreshold },
  //       $or: [{
  //         status: 'COMPLETED'
  //       }, {
  //         status: 'CANCELED'
  //       }]
  //     },
  //     projection: {},
  //     limit: 1
  //   }).toPromise();
  //   console.log(doneOrderStatuses);
  // }

  async migrateOrderStatuses() {
    for (let i = 0; i < 10000; i++) {
      try {
        const batch = 160;
        const notMigratedOrders = await this._api.get(environment.qmenuApiUrl + 'generic', {
          resource: 'order',
          query: { "statuses": null },
          projection: {
            name: 1
          },
          limit: batch
        }).toPromise();
        console.log(notMigratedOrders);
        if (notMigratedOrders.length === 0) {
          console.log('ALL DONE!');
          break;
        }
        const orderIds = [...new Set(notMigratedOrders.map(o => o._id))].filter(id => id);
        const statuses = await this._api.get(environment.qmenuApiUrl + 'generic', {
          resource: 'orderstatus',
          query: {
            order: { $in: orderIds.map(id => ({ $oid: id })) }
          },
          limit: batch * 10
        }).toPromise();
        console.log(statuses);
        statuses.map(status => {
          delete status._id;
          delete status.updatedAt;
        });
        // whatever reason we didn't have status, let's put a fake one submitted

        const patchPairs = [];
        notMigratedOrders.map(order => {
          const myStatuses = statuses.filter(status => status.order === order._id);
          myStatuses.sort((s1, s2) => new Date(s1.createdAt).valueOf() - new Date(s2.createdAt).valueOf());
          if (myStatuses.length === 0) {
            console.log(order)
            myStatuses.push({
              "status": "SUBMITTED",
              "updatedBy": "BY_CUSTOMER",
              "order": order._id,
              "createdAt": new Date(parseInt(order._id.substring(0, 8), 16) * 1000).toISOString()
            });
            patchPairs.push(
              {
                old: { _id: order._id },
                new: { _id: order._id, statuses: myStatuses }
              }
            );
          } else {
            patchPairs.push(
              {
                old: { _id: order._id },
                new: { _id: order._id, statuses: myStatuses }
              }
            );
          }

        });
        console.log(patchPairs);

        const patched = await this._api.patch(environment.qmenuApiUrl + 'generic?resource=order', patchPairs).toPromise();
        console.log(patched);

      } catch (error) {
        console.log(error);
      }

    }
  }

  async migrateOrderAddress() {
    for (let i = 0; i < 1000; i++) {
      const batch = 160;
      const deliveryOrders = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'order',
        query: {
          type: "DELIVERY",
          "address.place_id": null
        },
        projection: {
          deliveryAddress: 1
        },
        limit: batch
      }).toPromise();
      console.log(deliveryOrders);
      if (deliveryOrders.length === 0) {
        console.log('ALL DONE!');
        break;
      }
      const addressIds = [...new Set(deliveryOrders.map(o => o.deliveryAddress))].filter(id => id);
      const addresses = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'googleaddress',
        query: {
          _id: { $in: addressIds.map(id => ({ $oid: id })) }
        },
        limit: batch
      }).toPromise();
      console.log(addresses);
      const addressIdDict = addresses.reduce((map, address) => (map[address._id] = address, map), {});
      // patch back to orders!
      const patchPairs = deliveryOrders.map(o => ({
        old: { _id: o._id },
        new: { _id: o._id, address: addressIdDict[o.deliveryAddress] || { place_id: 'unknown' } }
      }));
      console.log(patchPairs);

      const patched = await this._api.patch(environment.qmenuApiUrl + 'generic?resource=order', patchPairs).toPromise();
      console.log(patched);
    }
  }

  async migrateOrderPaymentCustomerRestaurant() {
    for (let i = 0; i < 1000; i++) {
      const batch = 160;
      const orders = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'order',
        query: {
          "customerObj._id": null
        },
        projection: {
          payment: 1,
          customer: 1,
          restaurant: 1
        },
        limit: batch
      }).toPromise();
      console.log(orders);
      if (orders.length === 0) {
        console.log('ALL DONE!');
        break;
      }

      // populate restaurantObj and customerObj
      const customerIds = [...new Set(orders.map(o => o.customer))].filter(id => id && id.toString().length > 8);
      console.log(customerIds);

      const customers = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'customer',
        query: {
          _id: { $in: customerIds.map(id => ({ $oid: id })) }
        },
        projection: {
          email: 1,
          banCounter: 1,
          bannedReasons: 1,
          firstName: 1,
          lastName: 1,
          phone: 1,
          socialProfilePhoto: 1,
          socialProvider: 1,
        },
        limit: batch
      }).toPromise();

      console.log(customers);
      const customerIdDict = customers.reduce((map, item) => (map[item._id] = item, map), {});

      const restaurantIds = [...new Set(orders.map(o => o.restaurant))].filter(id => id && id.toString().length > 8);
      console.log(restaurantIds);
      const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'restaurant',
        query: {
          _id: { $in: restaurantIds.map(id => ({ $oid: id })) }
        },
        projection: {
          alias: 1,
          logo: 1,
          name: 1
        },
        limit: batch
      }).toPromise();

      console.log(restaurants);
      const restaurantIdDict = restaurants.reduce((map, item) => (map[item._id] = item, map), {});


      const paymentIds = [...new Set(orders.map(o => o.payment))].filter(id => id);
      const payments = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'payment',
        query: {
          _id: { $in: paymentIds.map(id => ({ $oid: id })) }
        },
        projection: {
          createdAt: 0,
          updatedAt: 0
        },
        limit: batch
      }).toPromise();

      console.log(payments);
      const paymentIdDict = payments.reduce((map, item) => (map[item._id] = item, map), {});

      const ccIds = [...new Set(payments.map(p => p.creditCard))].filter(id => id);
      const ccs = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'creditcard',
        query: {
          _id: { $in: ccIds.map(id => ({ $oid: id })) }
        },
        projection: {
          createdAt: 0,
          updatedAt: 0
        },
        limit: batch
      }).toPromise();

      console.log(ccs);
      const ccIdDict = ccs.reduce((map, item) => (map[item._id] = item, map), {});

      payments.map(p => {
        if (p.creditCard) {
          p.card = ccIdDict[p.creditCard] || {};
        }
      });

      // patch back to orders!
      const patchPairs = orders.map(o => ({
        old: { _id: o._id },
        new: { _id: o._id, paymentObj: paymentIdDict[o.payment] || {}, customerObj: customerIdDict[o.customer] || { _id: o.customer }, restaurantObj: restaurantIdDict[o.restaurant] || { _id: o.restaurant } }
      }));
      console.log(patchPairs);

      const patched = await this._api.patch(environment.qmenuApiUrl + 'generic?resource=order', patchPairs).toPromise();
      console.log(patched);
    }
  }


  migrateAddress() {
    // let's batch 20 every time
    const batchSize = 200;
    let myRestaurants;
    this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query: {
        address: { $exists: true },
        googleAddress: { $exists: false },
      },
      projection: {
        address: 1,
        name: 1
      },
      limit: batchSize
    }).pipe(mergeMap(restaurants => {
      myRestaurants = restaurants;
      return this._api
        .get(environment.qmenuApiUrl + "generic", {
          resource: "address",
          query: {
            _id: { $in: restaurants.filter(r => r.address).map(r => r.address._id || r.address) },
          },
          limit: batchSize
        });
    })).pipe(mergeMap(addresses => {
      if (addresses.length === 0) {
        throw 'No referenced address found for restaurants ' + myRestaurants.map(r => r.name).join(', ');
      }
      const myRestaurantsOriginal = JSON.parse(JSON.stringify(myRestaurants));
      const myRestaurantsChanged = JSON.parse(JSON.stringify(myRestaurants))
      const addressMap = {};
      addresses.map(a => addressMap[a._id] = a);
      myRestaurantsChanged.map(r => r.googleAddress = addressMap[r.address ? (r.address._id || r.address) : 'non-exist']);

      return this._api
        .patch(
          environment.qmenuApiUrl + "generic?resource=restaurant",
          myRestaurantsChanged.map(clone => ({
            old: myRestaurantsOriginal.filter(r => r._id === clone._id)[0],
            new: clone
          }))
        );
    })
    ).subscribe(
      patchResult => {
        this._global.publishAlert(
          AlertType.Success,
          "Migrated: " + myRestaurants.filter(r => patchResult.indexOf(r._id) >= 0).map(r => r.name).join(', ')
        );
        this._global.publishAlert(
          AlertType.Danger,
          "Non-Migrated: " + myRestaurants.filter(r => patchResult.indexOf(r._id) < 0).map(r => r.name).join(', ')
        );
      },
      error => {
        console.log(error);
        this._global.publishAlert(
          AlertType.Danger,
          "Error: " + JSON.stringify(error)
        );
      });

  }

  removeDuplicates() {
    // 1. query ALL with restaurantIds
    // 2. calculate duplicated
    // 3. remove duplicated

    this._api
      .get(environment.qmenuApiUrl + "generic", {
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
    this._api
      .delete(environment.qmenuApiUrl + "generic", {
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
        limit: 60000
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

  fixCallLogs() {
    this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'lead',
      query: {
        'callLogs.0': { $exists: true },
      },
      projection: {
        callLogs: 1
      },
      limit: 150000
    }).subscribe(
      leads => {
        let counter = 0;
        leads.map(lead => {
          if (!Array.isArray(lead.callLogs)) {
            counter++;
            const original = lead;
            const changed = JSON.parse(JSON.stringify(original));
            delete original.callLogs;
            changed.callLogs = [changed.callLogs['0']];
            this._api.patch(environment.qmenuApiUrl + "generic?resource=lead", [{ old: original, new: changed }]).subscribe(patched => console.log(patched));
          }
        })

        this._global.publishAlert(
          AlertType.Success,
          "Found/Fixed " + counter
        );
      },
      error => {
        this._global.publishAlert(
          AlertType.Danger,
          "Error pulling leads from API"
        );
      }
    )
  }

  fixAddress() {
    // let's batch 20 every time
    const batchSize = 20;
    let myRestaurants;
    this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query: {
        googleAddress: { $exists: true },
        "googleAddress.street_number": { $exists: false },
      },
      projection: {
        googleAddress: 1,
        name: 1
      },
      limit: batchSize
    }).subscribe(restaurants => {
      console.log(restaurants);
      myRestaurants = restaurants;
      // now let's request and update each

      restaurants.map(r => {
        this._api.get(environment.qmenuApiUrl + "utils/google-address", {
          place_id: r.googleAddress.place_id
        }).pipe(mergeMap(address => {
          const rOrignal = JSON.parse(JSON.stringify(r));
          const rClone = JSON.parse(JSON.stringify(r));
          Object.assign(rClone.googleAddress, address);
          return this._api
            .patch(
              environment.qmenuApiUrl + "generic?resource=restaurant", [{
                old: rOrignal,
                new: rClone
              }]
            );
        })).subscribe(
          patchResult => {
            this._global.publishAlert(
              AlertType.Success,
              "Migrated: " + r.name
            );
            console.log('patched:', r.name);
          },
          error => {
            console.log('Error finding place_id: ' + r.name);
            this._global.publishAlert(
              AlertType.Danger,
              "Error: " + JSON.stringify(error)
            );
          });

      });

    });
  }

  injectDeliveryBy() {
    this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query: {
        deliveryByTme: true
      },
      projection: {
        name: 1
      },
      limit: 10000
    }).pipe(mergeMap(restaurants => {
      console.log(restaurants);
      this._global.publishAlert(
        AlertType.Success,
        "Restaurants affected " + restaurants.map(r => r.name).join(", ")
      );
      return this._api
        .get(environment.qmenuApiUrl + "generic", {
          resource: "order",
          query: {
            restaurant: { $in: restaurants.map(r => ({ $oid: r._id })) },
            type: "DELIVERY",
            deliveryBy: { $ne: 'TME' }
          },
          projection: {
            type: 1,
            restaurant: 1,
            createdAt: 1
          },
          limit: 500
        });
    })).pipe(mergeMap(orders => {
      console.log(orders);
      return this._api
        .patch(environment.qmenuApiUrl + "generic?resource=order", orders.map(o => {
          const oldO = JSON.parse(JSON.stringify(o));
          const newO = JSON.parse(JSON.stringify(o));
          newO.deliveryBy = 'TME';
          return {
            old: oldO,
            new: newO
          };
        }));
    })).subscribe(
      updatedOrders => {
        console.log(updatedOrders);
        this._global.publishAlert(
          AlertType.Success,
          "Updated " + updatedOrders.length
        );
      },
      error => {
        this._global.publishAlert(
          AlertType.Danger,
          "Error: " + JSON.stringify(error)
        );
      }
    );
  } // end injectDeliveryBy


  injectDeliveryByToInvoice() {

    let orderIdMap = {};
    this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "order",
      query: {
        deliveryBy: { $exists: true }
      },
      projection: {
        deliveryBy: 1
      },
      limit: 50
    }).pipe(mergeMap(orders => {
      console.log(orders);
      orders.map(o => orderIdMap[o._id] = o);
      this._global.publishAlert(
        AlertType.Success,
        "Total orders: " + orders.length
      );
      return this._api
        .get(environment.qmenuApiUrl + "generic", {
          resource: "invoice",
          query: {
            "orders.id": { $in: orders.map(r => r._id) }
          },
          projection: {
            "restaurant.name": 1,
            "restaurant.offsetToEST": 1,
            createdAt: 1,
            orders: 1
          },
          limit: 500
        });
    })).pipe(mergeMap(invoices => {
      console.log(invoices);
      const originInvoices = JSON.parse(JSON.stringify(invoices));
      const affectedInvoicies = new Set();
      invoices.map(invoice => {
        invoice.orders.map(o => {
          if (orderIdMap[o.id] && o.deliveryBy !== orderIdMap[o.id].deliveryBy) {
            o.deliveryBy = orderIdMap[o.id].deliveryBy;
            console.log(o);
            affectedInvoicies.add(invoice);
          }
        });
      });

      if (affectedInvoicies.size === 0) {
        throw 'No invoice affect!';
      }
      console.log(affectedInvoicies);

      return this._api
        .patch(environment.qmenuApiUrl + "generic?resource=invoice", Array.from(affectedInvoicies).map(invoice => {
          let index = invoices.indexOf(invoice);
          const oldInvoice = JSON.parse(JSON.stringify(originInvoices[index]));
          const newInvoice = JSON.parse(JSON.stringify(invoices[index]));
          console.log(oldInvoice);
          console.log(newInvoice);
          return {
            old: oldInvoice,
            new: newInvoice
          };
        }));


    })).subscribe(
      updatedOrders => {
        console.log(updatedOrders);
        this._global.publishAlert(
          AlertType.Success,
          "Updated " + updatedOrders.length
        );
      },
      error => {
        this._global.publishAlert(
          AlertType.Danger,
          "Error: " + JSON.stringify(error)
        );
      }
    );
  } // end injectDeliveryBy

  injectTotalEtcToInvoice() {

    let affectedInvoices = [];
    this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "invoice",
      query: {
        balance: { $exists: false },
        // "restaurant.id" : "5bf60c483bec68140070fbe3"
      },
      projection: {
        "restaurant.name": 1,
        "restaurant.offsetToEST": 1,
        orders: 1,
        adjustments: 1,
        payments: 1,
        isCanceled: 1,
        isSent: 1,
        isPaymentSent: 1,
        isPaymentCompleted: 1,
        previousInvoiceId: 1,
        previousBalance: 1

      },
      limit: 50
    })
      .pipe(mergeMap(invoices => {
        console.log(invoices);
        affectedInvoices = invoices;
        const originInvoices = JSON.parse(JSON.stringify(invoices)).map(i => new Invoice(i));
        const newInvoices = invoices.map(i => {
          const newI = new Invoice(i);
          newI.computeDerivedValues();
          return newI;
        });

        console.log(originInvoices);
        console.log(newInvoices);


        if (newInvoices.length === 0) {
          throw 'No invoice to update!';
        }

        return this._api
          .patch(environment.qmenuApiUrl + "generic?resource=invoice", newInvoices.map((invoice, index) => {

            const oldInvoice = originInvoices[index];
            const newInvoice = invoice;
            delete oldInvoice.orders;
            delete newInvoice.orders;

            console.log(oldInvoice);
            console.log(newInvoice);
            return {
              old: oldInvoice,
              new: newInvoice
            };
          }));
      }))
      .subscribe(
        updatedInvoices => {
          console.log(updatedInvoices);
          this._global.publishAlert(
            AlertType.Success,
            "Updated " + affectedInvoices.map(i => i.restaurant.name).join(', ')
          );
        },
        error => {
          this._global.publishAlert(
            AlertType.Danger,
            "Error: " + JSON.stringify(error)
          );
        }
      );
  } // injectTotalEtcToInvoice

  async migrateEmailAndPhones() {
    // faxable -> {Fax, Order}
    // callable -> {Phone, Order}
    // textable -> {SMS, Order}
    // (nothing) -> {Phone, Business}
    // email --> split(, or ;) --> {Email, Order}
    const restaurants = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query: {
        $or: [
          { email: { $exists: true } },
          { phones: { $exists: true } },
        ]
      },
      projection: {
        phones: 1,
        channels: 1,
        name: 1,
        email: 1
      },
      limit: 6000
    }).toPromise();

    // find those

    const pairs = [];

    restaurants.map(r => {
      console.log(r.name);
      const emails = (r.email || '').replace(/\s/g, '').split(',').join(';').split(';').filter(email => email);
      const phones = r.phones || [];
      const channels = r.channels || [];

      // test against email:
      const oldChannels = JSON.parse(JSON.stringify(channels));

      emails.map(email => {
        if (!channels.some(c => c.value.toLowerCase() === email.toLowerCase())) {
          channels.push({
            type: 'Email',
            notifications: ['Order', 'Invoice'],
            value: email.toLowerCase()
          });
        }
      });

      // test against phones!
      phones.map(phone => {
        if (phone.callable) {
          let phoneChannel = channels.filter(c => c.type === 'Phone' && c.value === phone.phoneNumber)[0];
          if (!phoneChannel) {
            phoneChannel = {
              type: 'Phone',
              notifications: [],
              value: phone.phoneNumber
            };
            channels.push(phoneChannel);
          }
          phoneChannel.notifications = phoneChannel.notifications || [];
          if (phoneChannel.notifications.indexOf('Order') < 0) {
            phoneChannel.notifications.push('Order');
          }
          if (phone.type === 'Business' && phoneChannel.notifications.indexOf('Business') < 0) {
            phoneChannel.notifications.push('Business');
          }
        }

        if (phone.faxable) {
          let faxChannel = channels.filter(c => c.type === 'Fax' && c.value === phone.phoneNumber)[0];
          if (!faxChannel) {
            faxChannel = {
              type: 'Fax',
              notifications: [],
              value: phone.phoneNumber
            };
            channels.push(faxChannel);
          }
          faxChannel.notifications = faxChannel.notifications || [];
          if (faxChannel.notifications.indexOf('Order') < 0) {
            faxChannel.notifications.push('Order');
          }
        }

        if (phone.textable) {
          let textChannel = channels.filter(c => c.type === 'SMS' && c.value === phone.phoneNumber)[0];
          if (!textChannel) {
            textChannel = {
              type: 'SMS',
              notifications: [],
              value: phone.phoneNumber
            };
            channels.push(textChannel);
          }
          textChannel.notifications = textChannel.notifications || [];
          if (textChannel.notifications.indexOf('Order') < 0) {
            textChannel.notifications.push('Order');
          }

          if (phone.type === 'Business' && textChannel.notifications.indexOf('Business') < 0) {
            textChannel.notifications.push('Business');
          }
        }

      }); // end each phone

      const stringAfter = JSON.stringify(channels);
      if (JSON.stringify(oldChannels) !== stringAfter) {
        pairs.push({
          old: { _id: r._id },
          new: { _id: r._id, channels: channels }
        });
      }

    }); // end each restaurant

    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', pairs).toPromise();
    console.log(pairs.length);
    this._global.publishAlert(AlertType.Success, 'Patched ' + pairs.length);
  } // end of migrateEmailAndPhones

  convertGmb() {
    let myRestaurants;
    zip(
      this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "gmb",
        projection: {
          email: 1,
          password: 1
        },
        limit: 7000
      }),
      this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "gmbAccount",
        projection: {
          email: 1
        },
        limit: 7000
      })).pipe(mergeMap(gmbs => {
        const newGmbs = gmbs[0].filter(g0 => !gmbs[1].some(g1 => g1.email.toLowerCase() === g0.email.toLowerCase()));
        // remove id because newly inserted will have id
        newGmbs.map(g => delete g._id);
        // convert email to lowercase
        newGmbs.map(g => g.email = g.email.toLowerCase());

        return this._api.post(environment.qmenuApiUrl + 'generic?resource=gmbAccount', newGmbs);
      })).subscribe(
        gmbIds => {
          this._global.publishAlert(
            AlertType.Success,
            "Success! Total: " + gmbIds.length
          );
        },
        error => {
          this._global.publishAlert(
            AlertType.Danger,
            "Error: " + JSON.stringify(error)
          );
        });
  }

  getStripeErrors() {
    // get ALL payment, method === QMENU, without stripeObject.charges
    // has order with the id, order status is confirmed
    this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "payment",
      query: {
        "method": "QMENU",
        "stripeObject.charges": { "$exists": false }
      },
      projection: {
        createdAt: 1
      },
      sort: {
        createdAt: -1
      },
      limit: 100
    }).pipe(mergeMap(payments => {
      console.log(payments);
      return this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "order",
        query: {
          "payment": { $in: payments.map(r => ({ $oid: r._id })) }
        },
        projection: {
          restaurant: 1
        },
        limit: 500
      });
    }))


      .subscribe(payments => {
        console.log(payments)
      });
  }

  async genericTesting() {
    // get newest duplicate!

    const invoices = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'invoice',
      query: {
        balance: 0
      },
      projection: {
        balance: 1,
        isSent: 1,
        isCanceled: 1
      },
      limit: 16000
    }).toPromise();
    console.log(invoices);
    let nonsentnoncanceled = invoices.filter(invoice => !invoice.isSent && !invoice.isCanceled);
    console.log(nonsentnoncanceled);
    nonsentnoncanceled = nonsentnoncanceled.slice(0, 100);
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=invoice', nonsentnoncanceled.map(invoice => ({
      old: {
        _id: invoice._id
      },
      new: {
        _id: invoice._id,
        isSent: true,
        isPaymentSent: true,
        isPaymentCompleted: true
      },
    }))).toPromise();

  }

  async removeRedundantGmbBiz() {
    // 1. get ALL gmbBiz

    const gmbBizBatchSize = 3000;
    const bizList = [];
    while (true) {
      const batch = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'gmbBiz',
        projection: {
          cid: 1,
          place_id: 1,
          name: 1,
          createdAt: 1
        },
        skip: bizList.length,
        limit: gmbBizBatchSize
      }).toPromise();
      bizList.push(...batch);
      if (batch.length === 0 || batch.length < gmbBizBatchSize) {
        break;
      }
    }



    // group by cid (or phone?)
    const cidMap = {};
    bizList.map(b => {
      cidMap[b.cid] = cidMap[b.cid] || [];
      cidMap[b.cid].push(b);
    });
    console.log(cidMap);

    // sort by createdAt
    const sortedValues = Object.keys(cidMap).map(k => cidMap[k]).sort((a, b) => b.length - a.length);
    sortedValues.map(sv => sv.sort((v1, v2) => new Date(v1.createdAt).valueOf() - new Date(v2.createdAt).valueOf()));
    console.log(sortedValues);
    // keep the one with active gmbOwnerships!
    for (let values of sortedValues) {
      if (values.length > 1) {
        console.log('duplicated', values);
        // update task, gmbRequest's reference Ids
        const idToKeep = values[0]._id;
        const idsToDump = values.slice(1).map(v => v._id);

        const tasksToBeUpdated = await this._api.get(environment.qmenuApiUrl + 'generic', {
          resource: 'task',
          query: {
            "relatedMap.gmbBizId": { $in: idsToDump }
          },
          limit: 10000,
        }).toPromise();


        if (tasksToBeUpdated.length > 0) {
          console.log(tasksToBeUpdated);
          await this._api.patch(environment.qmenuApiUrl + 'generic?resource=task', tasksToBeUpdated.map(t => ({
            old: {
              _id: t._id,
              relatedMap: {}
            },
            new: {
              _id: t._id,
              relatedMap: {
                gmbBizId: idToKeep
              }
            },
          }))).toPromise();
          console.log('patched tasks: ', tasksToBeUpdated);
        }

        const affectedGmbRequests = await this._api.get(environment.qmenuApiUrl + 'generic', {
          resource: 'gmbRequest',
          query: {
            gmbBizId: { $in: idsToDump }
          },
          limit: 10000,
        }).toPromise();

        console.log('affected gmbRequests', affectedGmbRequests);

        if (affectedGmbRequests.length > 0) {
          console.log(affectedGmbRequests);
          await this._api.patch(environment.qmenuApiUrl + 'generic?resource=gmbRequest', affectedGmbRequests.map(t => ({
            old: {
              _id: t._id
            },
            new: {
              _id: t._id,
              gmbBizId: idToKeep
            },
          }))).toPromise();
        }


        // update name, assuming later is more updated!
        await this._api.patch(environment.qmenuApiUrl + 'generic?resource=gmbBiz', [{
          old: {
            _id: idToKeep
          },
          new: {
            _id: idToKeep,
            name: values[values.length - 1].name
          },
        }]).toPromise();

        // // delete ALL the redudant ids
        await this._api.delete(environment.qmenuApiUrl + 'generic', {
          resource: 'gmbBiz',
          ids: idsToDump
        }).toPromise();

      }
    }
  }

  async fixMissingBusinessPhones() {
    const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      projection: {
        name: 1,
        channels: 1,
        "googleAddress.formatted_address": 1
      },
      limit: 10000
    }).toPromise();

    console.log(restaurants);
    const restaurantsMissingBizPhones = restaurants.filter(r => r.channels && !r.channels.some(c => c.type === 'Phone' && (c.notifications || []).some(n => n === 'Business')));

    console.log(restaurantsMissingBizPhones);

    for (let r of restaurantsMissingBizPhones) {
      try {
        const crawledResult = await this._api.get(environment.qmenuApiUrl + "utils/scan-gmb", { q: `${r.name} ${r.googleAddress.formatted_address}` }).toPromise();
        console.log(crawledResult);
        if (crawledResult.phone) {
          // inject phone!
          // update qmenuId!
          const existingChannels = r.channels || [];
          const clonedChannels = existingChannels.slice(0);
          clonedChannels.push({
            value: crawledResult.phone,
            notifications: ['Business', 'Order'],
            type: 'Phone'
          });

          await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [
            {
              old: { _id: r._id },
              new: { _id: r._id, channels: clonedChannels }
            }]).toPromise();
        }
      } catch (error) {

      }
    }
  }

  async createApplyGmbTask() {
    let restaurantList = [];

    restaurantList = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      projection: {
        name: 1,
        id: 1,
        "googleAddress.formatted_address": 1
      },
      limit: 6000
    }).toPromise();


    const gmbBizBatchSize = 3000;
    const bizList = [];
    while (true) {
      const batch = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'gmbBiz',
        projection: {
          qmenuId: 1
        },
        skip: bizList.length,
        limit: gmbBizBatchSize
      }).toPromise();
      bizList.push(...batch);
      if (batch.length === 0 || batch.length < gmbBizBatchSize) {
        break;
      }
    }


    let missingRt = restaurantList.filter(each => !bizList.some(biz => biz.qmenuId == each._id));
    //missingRt.length = 2;
    //console.log('missingRt', missingRt);
    //console.log("no googleAddress", missingRt.filter(each=> !each.googleAddress));

    const gmbBizList = missingRt.map(each => ({
      name: each.name,
      qmenuId: each._id,
      address: each.googleAddress ? each.googleAddress.formatted_address : ''
    }));

    const bizs = await this._api.post(environment.qmenuApiUrl + 'generic?resource=gmbBiz', gmbBizList).toPromise();
    this._global.publishAlert(AlertType.Success, 'Created new GMB');

  }

  async crawlRestaurants() {
    let zipCodeList = [];
    zipCodeList = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query: {
        "googleAddress.zipCode": {
          "$exists": true
        }
      },
      projection: {
        name: 1,
        id: 1,
        "googleAddress.zipCode": 1
      },
      limit: 6000
    }).toPromise();

    zipCodeList = zipCodeList.map(each => each.googleAddress.zipCode);
    const uniqueValues = [...new Set(zipCodeList)];
    console.log(uniqueValues);

    this._global.publishAlert(AlertType.Success, 'Created new GMB');


  }

  async fixMenu() {
    const havingNullRestaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        "menus.mcs.mis": null,
        "menus": { $exists: 1 }
      },
      projection: {
        name: 1,
        "menus": 1
      },
      limit: 6000
    }).toPromise();
    console.log(havingNullRestaurants);
    // remove mi, empty mc, and empty menu!

    // havingNullRestaurants.length = 1;
    // big patch
    const patchList = havingNullRestaurants.map(r => {
      const oldR = r;
      const newR = JSON.parse(JSON.stringify(r));
      console.log(newR.name)
      // remove ALL empty or null mis
      newR.menus.map(menu => (menu.mcs || []).map(mc => {
        const beforeCount = (mc.mis || []).length;
        mc.mis = (mc.mis || []).filter(mi => mi);
        const afterCount = (mc.mis || []).length;
        if (beforeCount !== afterCount) {
          console.log('category with empty mi: ', mc.name);
        }
      }));
      // remove ALL empty mcs
      newR.menus.map(menu => {
        const beforeCount = (menu.mcs || []).length;
        menu.mcs = (menu.mcs || []).filter(mc => mc.mis.length > 0);
        const afterCount = (menu.mcs || []).length;
        if (beforeCount !== afterCount) {
          console.log('menu with empty category: ', menu.name);
        }

      });
      // remove ALL empty menus
      if (newR.menus.some(menu => menu.mcs.length === 0)) {
        console.log(newR.name, ' has empty menu');
      }
      newR.menus = (newR.menus || []).filter(menu => menu.mcs && menu.mcs.length > 0);

      return ({
        old: { _id: oldR._id },
        new: { _id: newR._id, menus: newR.menus }
      });
    });
    console.log(patchList);

    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', patchList).toPromise();

    // find restaurants with duplicated menuIds
    const allIdNames = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      projection: {
        name: 1
      },
      limit: 8000
    }).toPromise();

    const batchSize = 100;

    const batchedIdNames = Array(Math.ceil(allIdNames.length / batchSize)).fill(0).map((i, index) => allIdNames.slice(index * batchSize, (index + 1) * batchSize));

    const affectedRestaurants = [];

    for (let idNames of batchedIdNames) {
      const batchedRestaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'restaurant',
        query: {
          _id: {
            $in: idNames.map(idName => ({ $oid: idName._id }))
          }
        },
        projection: {
          name: 1,
          "menus.mcs.mis.id": 1,
          "menus.mcs.mis.category": 1
        },
        limit: 6000
      }).toPromise();

      const restaurantWithDuplicatedMenuIds = batchedRestaurants.filter(r => {
        const idSet = new Set();
        let hasDuplicatedId = false;
        (r.menus || []).map(menu => (menu.mcs || []).map(mc => (mc.mis || []).map(mi => {
          if (mi.id) {
            if (idSet.has(mi.id)) {
              hasDuplicatedId = true;
              console.log(mi);
              console.log(r.name, menu, mc);
            }
            idSet.add(mi.id);
          }
        })));

        return hasDuplicatedId;
      });
      console.log(restaurantWithDuplicatedMenuIds);
      affectedRestaurants.push(...restaurantWithDuplicatedMenuIds);
    }
    console.log('final: ', affectedRestaurants);

    const affectedRestaurantsFull = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        _id: {
          $in: affectedRestaurants.map(idName => ({ $oid: idName._id }))
        }
      },
      projection: {
        name: 1,
        "menus": 1
      },
      limit: 6000
    }).toPromise();

    // remove duplicated ids
    // affectedRestaurantsFull.length = 1;

    console.log(affectedRestaurantsFull);
    affectedRestaurantsFull.map(r => {
      const idSet = new Set();
      r.menus.map(menu => menu.mcs.map(mc => {
        for (let i = (mc.mis || []).length - 1; i >= 0; i--) {
          if (idSet.has(mc.mis[i].id)) {
            //splice
            console.log('found one!', mc.mis[i]);
            mc.mis.splice(i, 1);
          } else {
            idSet.add(mc.mis[i].id)
          }
        }
      }));

      console.log(idSet);
    });

    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', affectedRestaurantsFull.map(r => ({
      old: { _id: r._id },
      new: { _id: r._id, menus: r.menus }
    }))).toPromise();
  }


  async handleHolidy() {



    // 1. query restaurant with textable phones
    // 2. test if thanksgiving is already closed. if no:
    // 3. schedule a text (every 2 seconds apart??)
    // 4. make a table to capture result?
    // 

    alert('DO NOT USE')
    // const restaurants: Restaurant[] = (await this._api.get(environment.qmenuApiUrl + "generic", {
    //   resource: "restaurant",
    //   projection: {
    //     name: 1,
    //     "phones.textable": 1,
    //     disabled: 1,
    //     channels: 1,
    //     closedHours: 1
    //   },
    //   limit: 6000
    // }).toPromise()).map(r => new Restaurant(r));

    // console.log('total: ', restaurants.length);

    // const reachableRestaurants: any = restaurants.filter(r => (r.phones || []).some(p => p.textable) || (r.channels || []).some(c => c.type === 'SMS' || c.type === 'Email'));

    // console.log('text or email reachable: ', reachableRestaurants.length);

    // const checkPoint = new Date('Nov 22 2018 17:00:00 GMT-0500'); // 5PM
    // const notAlreadyClosed: any = reachableRestaurants.filter(r => !r.closedHours || !r.closedHours.some(hr => hr.isOpenAtTime(checkPoint)));

    // console.log('not already closed: ', notAlreadyClosed.length);

    // // inject an closedHour: 
    // const closedHour = new Hour({
    //   occurence: 'ONE-TIME',
    //   fromTime: new Date('Nov 22 2018 5:00:00 GMT-0500'),
    //   toTime: new Date('Nov 23 2018 5:00:00 GMT-0500'),
    //   comments: 'Happy Thanksgiving'
    // });

    // // reverse to remove preset closed hours
    // // notAlreadyClosed.map(r => {
    // //   r.closedHours = r.closedHours || [];
    // //   // lets remove expired hours on our way
    // //   const before = r.closedHours.length;
    // //   // keep old hours
    // //   r.closedHours = r.closedHours.filter(h => !(h.occurence === 'ONE-TIME' && h.fromTime.valueOf() === closedHour.valueOf()));

    // // });

    // notAlreadyClosed.map(r => {
    //   r.closedHours = r.closedHours || [];
    //   // lets remove expired hours on our way
    //   const before = r.closedHours.length;
    //   r.closedHours = r.closedHours.filter(h => h.occurence !== 'ONE-TIME' || h.toTime.valueOf() > new Date().valueOf());

    //   const after = r.closedHours.length;
    //   if (before > after) {
    //     console.log(r.name, r.closedHours);
    //   }
    //   r.closedHours.push(closedHour);

    // });


    // // await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', notAlreadyClosed.map(r => ({
    // //   old: { _id: r._id },
    // //   new: { _id: r._id, closedHours: r.closedHours }
    // // }))).toPromise();

    // // schedule text, or email events!
    // const jobs = [];
    // let scheduledAt = new Date().valueOf();
    // reachableRestaurants.map(restaurant => {
    //   // blast only unique phone numbers or emails
    //   // emails!
    //   const emailsInRestaurant = (restaurant.email || '').replace(/;/g, ',').split(',').filter(e => e).map(e => e.trim()).filter(e => e);
    //   const emailsInChannels = (restaurant.channels || []).filter(c => c.type === 'Email' && c.notifications && Array.isArray(c.notifications) && c.notifications.indexOf('Order') >= 0).map(c => c.value);
    //   const finalEmails = [...new Set([...emailsInChannels, ...emailsInRestaurant])];
    //   // console.log('emails to send:', finalEmails);

    //   // sms!
    //   const smsNumbersInPhones = (restaurant.phones || []).filter(p => p.textable && p.phoneNumber).map(p => p.phoneNumber);
    //   const smsNumbersInChannels = (restaurant.channels || []).filter(c => c.type === 'SMS' && c.notifications && Array.isArray(c.notifications) && c.notifications.indexOf('Order') >= 0).map(c => c.value);
    //   let finalSmsNumbers = [...new Set([...smsNumbersInPhones, ...smsNumbersInChannels])];

    //   // remove - of numbers

    //   finalSmsNumbers = finalSmsNumbers.map(number => number.replace(/\D/g, '')).filter(number => number.length === 10);

    //   const badFinalSmsNumbers = finalSmsNumbers.filter(number => !number || number.length !== 10);
    //   // console.log('sms to send:', finalSmsNumbers);
    //   if (badFinalSmsNumbers.length > 0) {
    //     console.log(restaurant.name, badFinalSmsNumbers);
    //   }

    //   const businessPhoneNumber = ((restaurant.phones || [])[0] || {}).phoneNumber;

    //   const smsMessage = 'From qMenu: If you will be OPEN on Thanksgiving day, please reply "OPEN" (without quotes) to this message by 10 PM Eastern time. If closed, you are all set and do NOT reply. Thank you.';

    //   const emailSubject = `Thanksgiving hours (${businessPhoneNumber})`;
    //   const emailContent = `
    //   <html><body>
    //   Dear restaurant owner,
    //   <br>
    //   <br>
    //   If you will be OPEN on Thanksgiving day, please reply "OPEN" (without quotes) to this email by 6 PM Eastern time. Otherwise, do NOT reply to the email and we will mark your restaurant as closed for the day so no orders can be placed. This message sent by qMenu.
    //   <br>
    //   <br>
    //   (For qMenu internal use only) Restaurant ID: [${restaurant._id}]
    //   <br>
    //   <br>
    //   Thanks,
    //   <br>
    //   <br>
    //   The qMenu Team`;

    //   finalEmails.map(email => {
    //     scheduledAt += 2000;
    //     jobs.push({
    //       name: "send-email",
    //       scheduledAt: scheduledAt,
    //       params: {
    //         to: email,
    //         subject: emailSubject,
    //         html: emailContent
    //       }
    //     });
    //   });

    //   finalSmsNumbers.map(phone => {
    //     scheduledAt += 2000;
    //     jobs.push({
    //       name: "send-sms",
    //       scheduledAt: scheduledAt,
    //       params: {
    //         to: phone,
    //         from: "8447935942",
    //         providerName: "plivo",
    //         message: smsMessage
    //       }
    //     });
    //   });
    // });

    // console.log(jobs);

    // const batchSize = 200;
    // const sleep = (milliseconds) => {
    //   return new Promise(resolve => setTimeout(resolve, milliseconds))
    // }

    // const batchedJobs = Array(Math.ceil(jobs.length / batchSize)).fill(0).map((i, index) => jobs.slice(index * batchSize, (index + 1) * batchSize));

    // for (let bjobs of batchedJobs) {
    //   try {
    //     console.log('processing ', bjobs.length);
    //     const addedJobs = await this._api.post(environment.qmenuApiUrl + 'events/add-jobs', bjobs).toPromise();
    //     await sleep(2000);
    //   } catch (error) {
    //     console.log("error: ", bjobs)
    //   }
    // }
    // this._global.publishAlert(AlertType.Success, 'Total notified: ', + notAlreadyClosed.length);

  }

  async fixPriceDataType() {
    const restaurantIds = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      // query: {
      //   "menus.mcs.mis.sizeOptions.price": { $type: "string" }
      // },
      projection: {
        name: 1
      },
      limit: 6000
    }).toPromise();

    const batchSize = 100;

    const batchedIds = Array(Math.ceil(restaurantIds.length / batchSize)).fill(0).map((i, index) => restaurantIds.slice(index * batchSize, (index + 1) * batchSize));

    for (let batch of batchedIds) {
      const restaurants = (await this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "restaurant",
        query: {
          _id: {
            $in: batch.map(rid => ({ $oid: rid._id }))
          }
        },
        projection: {
          name: 1,
          "menus.mcs.mis.sizeOptions.price": 1,
          "menuOptions.items.price": 1
        },
        limit: batchSize
      }).toPromise()).map(r => new Restaurant(r));

      const badRestaurants = restaurants.filter(r => r.menus.some(menu => menu.mcs.some(mc => mc.mis.some(mi => mi.sizeOptions.some(so => typeof so.price === 'string')))));
      console.log(badRestaurants);
      // break;
      if (badRestaurants.length > 0) {
        // patch!
        const fixedRestaurant = function (restaurant) {
          const clone = JSON.parse(JSON.stringify(restaurant));
          clone.menus.map(menu => menu.mcs.map(mc => mc.mis.map(mi => mi.sizeOptions.map(so => so.price = +so.price))));
          return clone;
        }
        await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', badRestaurants.map(r => ({
          old: r,
          new: fixedRestaurant(r)
        }))).toPromise();
      }

    }


  }

  async removeEmptySizeOption() {
    const restaurantIds = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",

      projection: {
        name: 1,
      },
      limit: 6000
    }).toPromise();

    const batchSize = 50;

    const batchedIds = Array(Math.ceil(restaurantIds.length / batchSize)).fill(0).map((i, index) => restaurantIds.slice(index * batchSize, (index + 1) * batchSize));

    for (let batch of batchedIds) {
      const restaurants = (await this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "restaurant",
        query: {
          _id: {
            $in: batch.map(rid => ({ $oid: rid._id }))
          }
        },
        projection: {
          name: 1,
          "menus": 1
        },
        limit: batchSize
      }).toPromise()).map(r => new Restaurant(r));

      const badRestaurants = restaurants.filter(r => r.menus.some(menu => menu.mcs.some(mc => mc.mis.some(mi => mi.sizeOptions.some(so => !so.name && !so.price)))));
      console.log(badRestaurants);
      if (badRestaurants.length > 0) {
        // patch!
        const fixedMenu = function (restaurant) {
          const clone = JSON.parse(JSON.stringify(restaurant));
          clone.menus.map(menu => menu.mcs.map(mc => mc.mis.map(mi => mi.sizeOptions = mi.sizeOptions.filter(so => so.name && so.price))));
          return clone.menus;
        }
        await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', badRestaurants.map(r => ({
          old: { _id: r._id },
          new: {
            _id: r._id, menus: fixedMenu(r)
          }
        }))).toPromise();
      }

    }


  }

  async removeInvoiceFromRestaurant() {
    const limit = 100;
    const restaurantsWithInvoicesAttribute = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        'invoices.0': { $exists: true }
      },
      projection: {
        name: 1,
        invoices: 1
      },
      limit: limit
    }).toPromise();

    console.log(restaurantsWithInvoicesAttribute);

    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', restaurantsWithInvoicesAttribute.map(r => ({
      old: { _id: r._id, invoices: [] },
      new: { _id: r._id }
    }))).toPromise();

  }

  async fixRateSchedules() {
    const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      projection: {
        rateSchedules: 1,
        name: 1
      },
      limit: 6000
    }).toPromise();
    const updatedOldNewPairs = [];
    const updates = restaurants.map(r => {
      let updated = false;
      r.rateSchedules = r.rateSchedules || [];
      r.rateSchedules.map(rs => {
        let agent = (rs.agent || '').trim().toLowerCase();
        if (agent === 'hannah') {
          agent = 'charity';
        };
        if (agent === '') {
          agent = 'none';
        }
        if (agent !== rs.agent) {
          updated = true;
          rs.agent = agent;
        }
      });

      if (updated) {
        updatedOldNewPairs.push({
          old: { _id: r._id, name: r.name },
          new: { _id: r._id, name: r.name, rateSchedules: r.rateSchedules }
        });
      }
    });
    console.log(updatedOldNewPairs);
    if (updatedOldNewPairs.length > 0) {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', updatedOldNewPairs).toPromise();
    }
  }

  async computeBonuse() {
    // see google doc: https://docs.google.com/spreadsheets/d/1qEVa0rMYZsVZZs0Fpu1ItnaNsYfwt6i51EdQuDt753A/edit#gid=0
    const policiesMap = {
      sam: [
        {
          to: new Date('12/16/2018'),
          base: 150
        },
        {
          from: new Date('1/1/2019'),
          base: 75,
          bonusThresholds: {
            4: 150,
            2: 75,
            1: 50
          }
        },
      ],

      kevin: [
        {
          to: new Date('7/16/2018'),
          base: 150
        },
        {
          from: new Date('7/17/2018'),
          base: 60,
          bonusThresholds: {
            2: 150,
            1: 50
          }
        },
      ],


      james: [
        {
          to: new Date('6/1/2018'),
          base: 150
        },
        {
          from: new Date('7/1/2018'),
          base: 50,
          bonusThresholds: {
            2: 150,
            1: 50
          }
        },
      ],

      jason: [
        {
          base: 50,
          bonusThresholds: {
            2: 150,
            1: 50
          }
        },
      ],
      andy: [
        {
          from: new Date('7/1/2018'),
          base: 50,
          bonusThresholds: {
            2: 150,
            1: 50
          }
        },
        {
          to: new Date('6/1/2018'),
          base: 150
        },
      ],

      billy: [
        {
          base: 0
        },
      ],
      mike: [
        {
          base: 150
        }
      ],
      charity: [
        {
          from: new Date('7/1/2018'),
          base: 40,
          bonusThresholds: {
            3: 40
          }
        },
        {
          to: new Date('6/1/2018'),
          base: 80
        },
      ],
    };

    let uncomputedRestaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        salesBonus: null
      },
      projection: {
        name: 1,
        salesBase: 1,
        rateSchedules: 1,
        createdAt: 1
      },
      limit: 6000
    }).toPromise();

    // uncomputedRestaurants = uncomputedRestaurants.filter(r => r._id === '5b5bfd764f600614008fcff5');

    console.log(uncomputedRestaurants);
    // uncomputedRestaurants.length = 80;
    // update salesBase
    const updatedRestaurantPairs = [];
    for (let r of uncomputedRestaurants) {
      const createdAt = new Date(r.createdAt);
      let updated = false;
      let appliedPolicy;
      if (r.rateSchedules && r.rateSchedules.length > 0) {
        const agent = r.rateSchedules[r.rateSchedules.length - 1].agent;

        const policies = policiesMap[agent] || [];
        for (let i = 0; i < policies.length; i++) {
          const policy = policies[i];
          const from = policy.from || new Date(0);
          const to = policy.to || new Date();
          if (createdAt > from && createdAt < to) {
            appliedPolicy = policy;
            if (r.salesBase !== policy.base) {
              r.salesBase = policy.base;
              updated = true;
              break;
            }
          }
        }
      }
      // compute three month thing!
      if (appliedPolicy && appliedPolicy.bonusThresholds && new Date().valueOf() - createdAt.valueOf() > 3 * 30 * 24 * 3600000) {
        // query orders and apply calculations
        const orders = await this._api.get(environment.qmenuApiUrl + 'generic', {
          resource: 'order',
          query: {
            restaurant: { $oid: r._id },
          },
          projection: {
            createdAt: 1
          },
          limit: 500, // 4 * 120 = max 480
          sort: {
            createdAt: 1
          }
        }).toPromise();
        r.salesBonus = 0;
        r.salesThreeMonthAverage = 0;

        if (orders.length > 0) {
          const firstCreatedAt = new Date(orders[0].createdAt);
          let counter = 1;
          const months3 = 90 * 24 * 3600000;
          orders.map(order => {
            if (new Date(order.createdAt).valueOf() - months3 < firstCreatedAt.valueOf()) {
              counter++;
            }
          });
          r.salesThreeMonthAverage = counter / 90.0;

          const thresholds = Object.keys(appliedPolicy.bonusThresholds).map(key => +key);
          thresholds.sort().reverse();
          for (let threshold of thresholds) {
            if (r.salesThreeMonthAverage > threshold) {
              r.salesBonus = appliedPolicy.bonusThresholds[threshold + ''];
              console.log('Found bonus!');
              console.log(r);
              break;
            }
          }
        }
        updated = true;
      }

      if (updated) {

        const newR: any = {
          _id: r._id,
          salesBase: r.salesBase
        };

        if (r.salesBonus !== undefined) {
          newR.salesBonus = r.salesBonus;
        }

        if (r.salesThreeMonthAverage !== undefined) {
          newR.salesThreeMonthAverage = r.salesThreeMonthAverage;
        }

        updatedRestaurantPairs.push({
          old: {
            _id: r._id
          },
          new: newR
        });
      }
    }; // end for each restaurant

    console.log(updatedRestaurantPairs);

    if (updatedRestaurantPairs.length > 0) {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', updatedRestaurantPairs).toPromise();
    }

  }

  async injectRestaurantScores() {
    const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      projection: {
        name: 1,
        updatedAt: 1
      },
      limit: 6000,
      sort: {
        updatedAt: 1
      }
    }).toPromise();

    // restaurants.length = 10;
    console.log(restaurants)
    for (let r of restaurants) {
      const score = await this._gmb3.injectRestaurantScore(r);
      console.log(score, r.name);
    }

  }

  async migrateGmbBizToRestaurants() {
    // match using gmbBiz -> restaurant
    //  - cid (restaurant.googleListing.cid <-> gmbBiz.cid)
    //  - using qemenuId
    // what about non-matched??? just leave it???

    const gmbBizBatchSize = 3000;
    const gmbBizList = [];
    while (true) {
      const batch = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'gmbBiz',
        projection: {
          gmbOwnerships: 0,
          accounts: 0
        },
        skip: gmbBizList.length,
        limit: gmbBizBatchSize
      }).toPromise();
      gmbBizList.push(...batch);
      if (batch.length === 0 || batch.length < gmbBizBatchSize) {
        break;
      }
    }

    const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      projection: {
        disabled: 1,
        name: 1,
        "googleListing.cid": 1,
        "googleListing.gmbOwner": 1,
        "googleListing.gmbWebsite": 1,
        domain: 1,
        websiteTemplateName: 1,
        web: 1
      },
      limit: 6000
    }).toPromise();

    const cidMap = {};
    gmbBizList.map(biz => {
      cidMap[biz.cid] = cidMap[biz.cid] || {};
      cidMap[biz.cid].gmbBizList = cidMap[biz.cid].gmbBizList || [];
      cidMap[biz.cid].gmbBizList.push(biz);
    });

    const qmenuIdMap = {};
    restaurants.map(r => {
      qmenuIdMap[r._id] = r;
      if (r.googleListing && r.googleListing.cid) {
        cidMap[r.googleListing.cid] = cidMap[r.googleListing.cid] || {};
        cidMap[r.googleListing.cid].restaurants = cidMap[r.googleListing.cid].restaurants || [];
        cidMap[r.googleListing.cid].restaurants.push(r);
      }
    });

    // start migrating process: enabled: cid < qmenuId, if multiple, use assign to enabled only
    const updatedRestaurants = [];

    restaurants.map(r => {
      r.web = r.web || {};
      const before = JSON.stringify(r.web);
      if (r.websiteTemplateName) {
        r.web.templateName = r.web.templateName || r.websiteTemplateName
      }

      if (r.domain) {
        let url = r.domain.trim().toLowerCase();
        if (!url.startsWith('http')) {
          url = 'http://' + url;
        }
        r.web.qmenuWebsite = r.web.qmenuWebsite || url;
      }

      if (r.googleListing && r.googleListing.gmbOwner !== 'qmenu' && r.googleListing.gmbWebsite && !r.web.bizManagedWebsite) {
        r.web.bizManagedWebsite = r.googleListing.gmbWebsite;
      }

      if (JSON.stringify(r.web) !== before) {
        updatedRestaurants.push(r);
      }

    });

    const migrateFields = ['bizManagedWebsite', 'useBizWebsite', 'useBizWebsiteForAll', 'qmenuWebsite', 'qmenuPop3Password', 'ignoreGmbOwnershipRequest', 'disableAutoTask'];

    Object.keys(cidMap).map(cid => {
      let restaurants = cidMap[cid].restaurants || [];
      const gmbBizList = cidMap[cid].gmbBizList || [];
      if (restaurants.length > 1) {
        restaurants = restaurants.filter(r => !r.disabled);
      }

      restaurants.map(restaurant => {
        const web = restaurant.web || {};
        migrateFields.map(field => {
          let fieldValue = web[field];
          gmbBizList.map(biz => fieldValue = fieldValue || biz[field]);
          if (fieldValue) {
            web[field] = fieldValue;
          }
        });

        delete web.qmenuPop3Email;
        delete web.qmenuPop3Host;
        delete restaurant.domain;
        delete restaurant.websiteTemplateName;

        restaurant.web = web;
        updatedRestaurants.push(restaurant);

      });

    });


    console.log(updatedRestaurants.length);
    console.log(updatedRestaurants);
    // inject
    // updatedRestaurants.length = 1;
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', updatedRestaurants.map(r => ({
      old: { _id: r._id },
      new: { _id: r._id, web: r.web }
    }))).toPromise();

  }

  async migrateGmbOwnerships() {
    const gmbBizBatchSize = 3000;
    const allGmbBizList = [];
    while (true) {
      const batch = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'gmbBiz',
        query: {
          gmbOwnerships: { $exists: 1 },
        },
        projection: {
          _id: 1
        },
        skip: allGmbBizList.length,
        limit: gmbBizBatchSize
      }).toPromise();
      allGmbBizList.push(...batch);
      if (batch.length === 0 || batch.length < gmbBizBatchSize) {
        break;
      }
    }


    // batch
    const batchSize = 100;

    const batchedBizList = Array(Math.ceil(allGmbBizList.length / batchSize)).fill(0).map((i, index) => allGmbBizList.slice(index * batchSize, (index + 1) * batchSize));

    for (let batch of batchedBizList) {
      const gmbBizbatchListSize = 3000;
      const bizList = [];
      while (true) {
        const batchList = await this._api.get(environment.qmenuApiUrl + 'generic', {
          resource: 'gmbBiz',
          query: {
            _id: { $in: batch.map(biz => ({ $oid: biz._id })) }
          },
          skip: bizList.length,
          limit: gmbBizbatchListSize
        }).toPromise();
        bizList.push(...batchList);
        if (batchList.length === 0 || batchList.length < gmbBizbatchListSize) {
          break;
        }
      }


      const gmbAccounts = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'gmbAccount',
        projection: {
          email: 1,
          locations: 1
        },
        limit: 6000
      }).toPromise();

      const emailAccountDict = gmbAccounts.reduce((map, account) => (map[account.email] = account, map), {});
      const emailStringifiedDict = gmbAccounts.reduce((map, account) => (map[account.email] = JSON.stringify(account), map), {});
      console.log(gmbBizList);

      const updatedAccounts = [];
      const fields = ['appealId', 'name', 'address', 'phone', 'cuisine', 'place_id', 'cid', 'reservations', 'menuUrls', 'orderAheadUrls'];
      for (let gmbBiz of gmbBizList) {
        const history = gmbBiz.gmbOwnerships || [];
        for (let i = 0; i < history.length; i++) {
          if (history[i].email) {
            const account = emailAccountDict[history[i].email];
            const matchedLocations = (account.locations || []).filter(loc => loc.cid === gmbBiz.cid);

            const status = history[i].status || 'Published';
            const myHistory = [{ time: history[i].possessedAt, status: status }];

            if (history[i + 1] && history[i + 1].email !== history[i].email) {
              myHistory.push({ time: history[i + 1].possessedAt, status: 'Removed' });
            }

            switch (matchedLocations.length) {
              case 0:
                account.locations = account.locations || [];
                const newLocation = fields.reduce((obj, field) => (obj[field] = gmbBiz[field], obj), {} as any);
                newLocation.website = gmbBiz['gmbWebsite'];
                newLocation.statusHistory = myHistory;

                account.locations.push(newLocation);
                updatedAccounts.push(account);
                break;

              default:
                // match appealId, otherwise just choose first match
                const appealIdMatched = matchedLocations.filter(loc => loc.appealId === gmbBiz.appealId);
                const matchedLocation = appealIdMatched[0] || matchedLocations[0];
                matchedLocation.statusHistory.push(...myHistory);
                updatedAccounts.push(account);
                break;
            }
          }
        }
      }


      // reorg location's history
      updatedAccounts.map(account => account.locations.map(loc => {
        // sort history Ascending
        loc.statusHistory.sort((h1, h2) => new Date(h1.time).valueOf() - new Date(h2.time).valueOf());
        // remove 'Removed' that's not the last one!
        loc.statusHistory = loc.statusHistory.filter((h, index) => (index === loc.statusHistory.length - 1) || h.status !== 'Removed');
        // remove sequential same status (keep old one)
        for (let i = loc.statusHistory.length - 1; i >= 1; i--) {
          if (loc.statusHistory[i - 1].status === loc.statusHistory[i].status) {
            loc.statusHistory.splice(i, 1);
          }
        }
        loc.statusHistory.reverse();
        loc.status = loc.statusHistory[0].status;
      }));
      // patch updated!
      const changedAccounts = updatedAccounts.filter(a => JSON.stringify(a) !== emailStringifiedDict[a.email]);
      const uniqueChangedAccounts = [...new Set(changedAccounts)];

      if (uniqueChangedAccounts.length > 0) {

        await this._api.patch(environment.qmenuApiUrl + 'generic?resource=gmbAccount', uniqueChangedAccounts.map(a => ({
          old: { _id: a._id },
          new: { _id: a._id, locations: a.locations }
        }))).toPromise();
      } else {
        this._global.publishAlert(AlertType.Success, 'No new thing updated');
      }

    } // end batch
  } // end migration

  async cleanBingImages() {
    const restaurantIds = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      projection: {
        name: 1
      },
      limit: 6000
    }).toPromise();

    const batchSize = 20;
    const batchedIds = Array(Math.ceil(restaurantIds.length / batchSize)).fill(0).map((i, index) => restaurantIds.slice(index * batchSize, (index + 1) * batchSize));

    for (let batch of batchedIds) {
      const restaurants = (await this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "restaurant",
        query: {
          _id: {
            $in: batch.map(rid => ({ $oid: rid._id }))
          }
        },
        projection: {
          name: 1,
          "menus.mcs.mis.imageObjs": 1
        },
        limit: batchSize
      }).toPromise()).map(r => new Restaurant(r));

      const badRestaurants = restaurants.filter(r => r.menus.some(menu => menu.mcs.some(mc => mc.mis.some(mi => mi.imageObjs.some(image => ((image.originalUrl || '').indexOf('bing') > 0 || (image.normalUrl || '').indexOf('bing') > 0 || (image.thumbnailUrl || '').indexOf('bing') > 0))))));
      console.log(badRestaurants);
      if (badRestaurants.length > 0) {
        // patch!
        const fixedRestaurant = function (restaurant) {
          const cloneOld = JSON.parse(JSON.stringify(restaurant));
          const cloneNew = JSON.parse(JSON.stringify(restaurant));
          cloneOld.menus.map(menu => menu.mcs.map(mc => mc.mis.map(mi => delete mi.imageObjs)));
          cloneNew.menus.map(menu => menu.mcs.map(mc => mc.mis.map(mi => {
            let indexArray = [];
            for (let i = 0; i < mi.imageObjs.length; i++) {
              if (mi.imageObjs[i]) {
                if ((mi.imageObjs[i].originalUrl || '').indexOf('bing') > 0 || (mi.imageObjs[i].normalUrl || '').indexOf('bing') > 0 || (mi.imageObjs[i].thumbnailUrl || '').indexOf('bing') > 0) {
                  indexArray.push(i);
                }
              }
            }

            for (var i = indexArray.length - 1; i >= 0; i--) {
              mi.imageObjs.splice(indexArray[i], 1);
            }

          })));
          return {
            old: cloneOld,
            new: cloneNew
          }
        }

        await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', badRestaurants.map(r => ({
          old: fixedRestaurant(r).old,
          new: fixedRestaurant(r).new
        }))).toPromise();
      }

    }

  }

  async injectImages() {
    let restaurantIds = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query: {
        menus: { $exists: true }
      },
      projection: {
        name: 1,
        skipImageInjection: 1
      },
      limit: 6000
    }).toPromise();

    restaurantIds = restaurantIds.filter(r => !r.skipImageInjection);

    const images = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "image",
      limit: 3000
    }).toPromise();

    const batchSize = 20;
    const batchedIds = Array(Math.ceil(restaurantIds.length / batchSize)).fill(0).map((i, index) => restaurantIds.slice(index * batchSize, (index + 1) * batchSize));

    try {
      for (let batch of batchedIds) {
        const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
          resource: 'restaurant',
          query: {
            _id: {
              $in: batch.map(rid => ({ $oid: rid._id }))
            }
          },
          projection: {
            name: 1,
            "menus": 1
          },
          limit: 6000
        }).toPromise();

        console.log('batch', batch);

        const patchList = restaurants.map(r => {
          const oldR = r;
          const newR = JSON.parse(JSON.stringify(r));
          //Just assuming match 1 image, and only upload image if none image exists
          newR.menus.map(menu => (menu.mcs || []).map(mc => (mc.mis || []).map(mi => {
            /* Image origin: "CSR", "RESTAURANT", "IMAGE-PICKER"
                only inject image when no existing image with origin as "CSR", "RESTAURANT", or overwrite images with origin as "IMAGE-PICKER"
            */
            try {
              if (mi && mi.imageObjs && !mi.imageObjs.some(each => each.origin === 'CSR' || each.origin === 'RESTAURANT')) {
                const match = function (aliases, name) {
                  const sanitizedName = Helper.sanitizedName(name);
                  return (aliases || []).some(alias => alias.toLowerCase().trim() === sanitizedName);
                }
                //only use the first matched alias
                let matchingAlias = images.filter(image => match(image.aliases, mi.name))[0];
                if (matchingAlias && matchingAlias.images && matchingAlias.images.length > 0) {
                  //reset the imageObj
                  mi.imageObjs = [];
                  (matchingAlias.images || []).map(each => {
                    (mi.imageObjs).push({
                      originalUrl: each.url,
                      thumbnailUrl: each.url192,
                      normalUrl: each.url768,
                      origin: 'IMAGE-PICKER'
                    });
                  })
                }
              }
            }
            catch (e) {
              //capture some mi abnormal case
              console.log(e);
              console.log('mi=', JSON.stringify(mi));
            }
          })));

          return ({
            old: { _id: oldR._id },
            new: { _id: newR._id, menus: newR.menus }
          });
        });
        console.log(patchList);

        await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', patchList).toPromise();
      }
    }

    catch (e) {
      console.log(e)
      console.log("Failed update restaurants=", batchedIds)
    }
  }

  async injectRequireZipBillingAddress() {
    const serviceSettings = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      projection: {
        name: 1,
        serviceSettings: 1,
        requireZipcode: 1,
        requireBillingAddress: 1
      },
      limit: 6000
    }).toPromise();

    let updatedRestaurantPairs = [];
    for (let r of serviceSettings) {
      const oldR = r;
      let newR = JSON.parse(JSON.stringify(r));
      if (r.serviceSettings && r.serviceSettings.some(each => each.paymentMethods.indexOf('QMENU') > 0)) {
        if (!newR.requireZipcode || !newR.requireBillingAddress) {
          newR.requireZipcode = true;
          newR.requireBillingAddress = true;
          updatedRestaurantPairs.push({
            old: {
              _id: r._id
            },
            new: newR
          });
        }
      }
    }

    console.log(updatedRestaurantPairs);
    if (updatedRestaurantPairs.length > 0) {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', updatedRestaurantPairs).toPromise();
    }
  }

  async calculateDomainValue() {

    const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      projection: {
        name: 1,
        updatedAt: 1,
        'web.qmenuWebsite': 1,
        disabled: 1,
        alias: 1,
        score: 1,
      },
      limit: 6000
    }).toPromise();

    const goodList = [];
    const badList = [];
    //restaurants.length = 20;

    for (let r of restaurants) {
      if (r.disabled || !r.web || !r.web.qmenuWebsite || r.web.qmenuWebsite.startsWith('https') || r.web.qmenuWebsite.indexOf('qmenu.us') > 0) {
        continue;
      }
      const orders = await this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "order",
        query: {
          restaurant: {
            $oid: r._id
          }
        },
        projection: {
          createdAt: 1
        },
        sort: { createdAt: -1 },
        limit: 300
      }).toPromise();

      const now = new Date().valueOf();
      const sixBuckets = Array(6).fill(0).map((i, index) => now - (index + 1) * 30 * 24 * 3600 * 1000).map(time => ({
        threshold: time,
        count: 0
      }));

      orders.map(order => {
        for (let i = 0; i < sixBuckets.length; i++) {
          const createdAt = new Date(order.createdAt || 0).valueOf();
          if (createdAt > sixBuckets[i].threshold) {
            sixBuckets[i].count = sixBuckets[i].count + 1;
            break;
          }
        }
      });

      console.log(r.name);
      console.log(sixBuckets);

      const sixMonthsTotal = sixBuckets.reduce((sum, bucket) => sum + bucket.count, 0) > 30;
      const last3MonthGreaterThan10 = sixBuckets[0].count + sixBuckets[1].count + sixBuckets[2].count >= 6;

      const extractDomain = function (url) {
        return url.replace('http://', '').replace('www.', '').toLowerCase().split('/')[0];
      };
      const item = {
        domain: extractDomain(r.web.qmenuWebsite),
        name: r.name,
        id: r._id,
        restaurant: r
      };
      if (sixMonthsTotal && last3MonthGreaterThan10) {
        goodList.push(item);
      } else {
        badList.push(item);
      }

    }

    goodList.sort((i1, i2) => i1.domain > i2.domain ? 1 : -1);


    console.log('good list:');
    console.log(goodList);
    console.log('bad list:');
    console.log(badList);

    const migrationDomains = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'migration',
      query: {
        // "steps.0.executions.0": { $exists: true },
        // "shrinked": { $exists: false }
      },
      projection: {
        domain: 1
      },
      limit: 8000
    }).toPromise();

    const filteredGoodList = goodList.filter(each => !migrationDomains.some(migration => migration.domain === each.domain));
    const existingGoodList = goodList.filter(each => migrationDomains.some(migration => migration.domain === each.domain));
    console.log('filteredGoodList', filteredGoodList);
    console.log('existingGoodList', existingGoodList);

    const valuableMigrations = filteredGoodList.map(each => (
      {
        domain: each.domain,
        steps: steps,
        restaurant: each.restaurant
      }
    ));

    console.log(valuableMigrations);
    await this._api.post(environment.qmenuApiUrl + 'generic?resource=migration', valuableMigrations).toPromise();


  }

}


const steps = [
  {
    name: 'sendCode',
    payload: ['domain']
  },
  {
    name: 'getCode',
    payload: ['domain'],
  },
  {
    name: 'transferDomain',
    payload: ['domain', 'authCode'],
  },
  {
    name: 'checkTransferDomain',
    payload: ['OperationId'],
  },
  {
    name: 'transferS3',
    payload: ['domain'],
  },
  {
    name: 'requestCertificate',
    payload: ['domain'],
  },
  {
    name: 'checkCertificate',
    payload: ['domain', 'certificateARN'],
  },
  {
    name: 'createCloudFront',
    payload: ['domain', 'certificateARN'],
  },
  {
    name: 'checkCloudFront',
    payload: ['domain', 'distributionId'],
  },
  {
    name: 'validateWebsite',
    payload: ['domain'],
  },

  {
    name: 'setEmail',
    payload: ['domain'],
  },
];


