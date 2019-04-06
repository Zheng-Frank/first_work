import { Component, OnInit } from "@angular/core";
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";
import { zip } from "rxjs";
import { mergeMap } from "rxjs/operators";
import { Restaurant, Hour } from '@qmenu/ui';
import { Invoice } from "../../../classes/invoice";
import { Gmb3Service } from "src/app/services/gmb3.service";
import { JsonPipe } from "@angular/common";

@Component({
  selector: "app-db-scripts",
  templateUrl: "./db-scripts.component.html",
  styleUrls: ["./db-scripts.component.scss"]
})
export class DbScriptsComponent implements OnInit {
  removingOrphanPhones = false;
  constructor(private _api: ApiService, private _global: GlobalService, private _gmb3: Gmb3Service) { }

  ngOnInit() { }

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
        if(place_id.length > 30 && r.googleListing && r.googleListing.place_id) {
          place_id = r.googleListing.place_id;
        }
        const addressDetails = await this._api.get(environment.adminApiUrl + "utils/google-address", {
          place_id: place_id
        }).toPromise();
        await this._api.patch(environment.qmenuApiUrl + "generic?resource=restaurant", [
          {
            old: { _id: r._id, googleAddress: {} },
            new: { _id: r._id, googleAddress: {place_id: place_id, timezone: addressDetails.timezone } }
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
    const oldRestaurantId = '5a79732257067814009f55d5';
    const newName = "Quik Wok";
    const newAlias = "quik-wok-oceanside";
    const switchingDate = new Date("Mar 16 2019 00:00:01 GMT-0400 (Eastern Daylight Time)");

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
      .get(environment.adminApiUrl + "generic", {
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
      .delete(environment.adminApiUrl + "generic", {
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
        limit: 50000
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
    this._api.get(environment.adminApiUrl + 'generic', {
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
            this._api.patch(environment.adminApiUrl + "generic?resource=lead", [{ old: original, new: changed }]).subscribe(patched => console.log(patched));
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
        this._api.get(environment.adminApiUrl + "utils/google-address", {
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
        limit: 5000
      }),
      this._api.get(environment.adminApiUrl + "generic", {
        resource: "gmbAccount",
        projection: {
          email: 1
        },
        limit: 5000
      })).pipe(mergeMap(gmbs => {
        const newGmbs = gmbs[0].filter(g0 => !gmbs[1].some(g1 => g1.email.toLowerCase() === g0.email.toLowerCase()));
        // remove id because newly inserted will have id
        newGmbs.map(g => delete g._id);
        // convert email to lowercase
        newGmbs.map(g => g.email = g.email.toLowerCase());

        return this._api.post(environment.adminApiUrl + 'generic?resource=gmbAccount', newGmbs);
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
    const recentCCPayments = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'payment',
      query: {
        createdAt: { $gt: { $date: "2019-02-11T01:37:36.919Z" } },
        "paymentType": "CREDITCARD",
        "creditCardProcessingMethod": "CREDITCARD",
        "method": "CREDITCARD"
      },
      limit: 1000
    }).toPromise();

    console.log(recentCCPayments)

    // get orders
    const orders = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'order',
      query: {
        createdAt: { $gt: { $date: "2019-02-11T01:37:36.919Z" } },
        "payment": {
          $in: recentCCPayments.map(p => ({
            $oid: p._id
          }))
        }
      },
      limit: 1000
    }).toPromise();

    console.log(orders);

    const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        "_id": {
          $in: orders.map(o => ({
            $oid: o.restaurant
          }))
        }
      },
      limit: 1000
    }).toPromise();

    console.log(restaurants);

    recentCCPayments.map(p => {
      const order = orders.filter(o => o.payment === p._id)[0];
      const restaurant = restaurants.filter(r => r._id === order.restaurant)[0];
      console.log(p, order.type, restaurant.serviceSettings.filter(ss => ss.name.toLowerCase() === order.type.toLowerCase())[0].paymentMethods);
    });

  }

  async removeRedundantGmbBiz() {
    // 1. get ALL gmbBiz
    const bizList = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbBiz',
      projection: {
        cid: 1,
        place_id: 1,
        name: 1,
        createdAt: 1
      },
      limit: 5000
    }).toPromise();

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

        const tasksToBeUpdated = await this._api.get(environment.adminApiUrl + 'generic', {
          resource: 'task',
          query: {
            "relatedMap.gmbBizId": { $in: idsToDump }
          },
          limit: 10000,
        }).toPromise();


        if (tasksToBeUpdated.length > 0) {
          console.log(tasksToBeUpdated);
          await this._api.patch(environment.adminApiUrl + 'generic?resource=task', tasksToBeUpdated.map(t => ({
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

        const affectedGmbRequests = await this._api.get(environment.adminApiUrl + 'generic', {
          resource: 'gmbRequest',
          query: {
            gmbBizId: { $in: idsToDump }
          },
          limit: 10000,
        }).toPromise();

        console.log('affected gmbRequests', affectedGmbRequests);

        if (affectedGmbRequests.length > 0) {
          console.log(affectedGmbRequests);
          await this._api.patch(environment.adminApiUrl + 'generic?resource=gmbRequest', affectedGmbRequests.map(t => ({
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
        await this._api.patch(environment.adminApiUrl + 'generic?resource=gmbBiz', [{
          old: {
            _id: idToKeep
          },
          new: {
            _id: idToKeep,
            name: values[values.length - 1].name
          },
        }]).toPromise();

        // // delete ALL the redudant ids
        await this._api.delete(environment.adminApiUrl + 'generic', {
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
        const crawledResult = await this._api.get(environment.adminApiUrl + "utils/scan-gmb", { q: `${r.name} ${r.googleAddress.formatted_address}` }).toPromise();
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

    const bizList = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbBiz',
      projection: {
        qmenuId: 1
      },
      limit: 5000
    }).toPromise();

    let missingRt = restaurantList.filter(each => !bizList.some(biz => biz.qmenuId == each._id));
    //missingRt.length = 2;
    //console.log('missingRt', missingRt);
    //console.log("no googleAddress", missingRt.filter(each=> !each.googleAddress));

    const gmbBizList = missingRt.map(each => ({
      name: each.name,
      qmenuId: each._id,
      address: each.googleAddress ? each.googleAddress.formatted_address : ''
    }));

    const bizs = await this._api.post(environment.adminApiUrl + 'generic?resource=gmbBiz', gmbBizList).toPromise();
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

    const gmbBizList = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbBiz',
      projection: {
        gmbOwnerships: 0,
        accounts: 0
      },
      limit: 6000
    }).toPromise();
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

    const allGmbBizList = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbBiz',
      query: {
        gmbOwnerships: { $exists: 1 },
        // _id: {$in: [{$oid: "5c015a02dd9078a346c06ccb"}]}
      },
      projection: {
        _id: 1
      },
      limit: 6000
    }).toPromise();

    // batch
    const batchSize = 100;

    const batchedBizList = Array(Math.ceil(allGmbBizList.length / batchSize)).fill(0).map((i, index) => allGmbBizList.slice(index * batchSize, (index + 1) * batchSize));

    for (let batch of batchedBizList) {
      const gmbBizList = await this._api.get(environment.adminApiUrl + 'generic', {
        resource: 'gmbBiz',
        query: {
          _id: { $in: batch.map(biz => ({ $oid: biz._id })) }
        },
        limit: 6000
      }).toPromise();

      const gmbAccounts = await this._api.get(environment.adminApiUrl + 'generic', {
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

        await this._api.patch(environment.adminApiUrl + 'generic?resource=gmbAccount', uniqueChangedAccounts.map(a => ({
          old: { _id: a._id },
          new: { _id: a._id, locations: a.locations }
        }))).toPromise();
      } else {
        this._global.publishAlert(AlertType.Success, 'No new thing updated');
      }

    } // end batch
  } // end migration

}

