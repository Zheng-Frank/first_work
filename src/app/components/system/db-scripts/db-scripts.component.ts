import { Component, OnInit } from "@angular/core";
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";
import { zip } from "rxjs";
import { mergeMap } from "rxjs/operators";
import { Restaurant } from '@qmenu/ui';
import { Gmb3Service } from "src/app/services/gmb3.service";
import { Helper } from "src/app/classes/helper";
import { Domain } from "src/app/classes/domain";
import * as FileSaver from 'file-saver';
@Component({
  selector: "app-db-scripts",
  templateUrl: "./db-scripts.component.html",
  styleUrls: ["./db-scripts.component.scss"]
})
export class DbScriptsComponent implements OnInit {
  removingOrphanPhones = false;
  constructor(private _api: ApiService, private _global: GlobalService, private _gmb3: Gmb3Service) { }

  ngOnInit() { }

  shrink(str) {
    let regex = /(^\s+)|(\s{2,})|(\s+$)/g;
    let changed = regex.test(str);
    return {changed, result: (str || '').trim().replace(/\s+/g, ' ') };
  }

  trimName(item) {
    let { changed, result } = this.shrink(item.name);
    item.name = result;
    return changed;
  }

  async removeAllMenuSpaces() {
    const rts = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {disabled: {$ne: true}},
      projection: {menus: 1, name: 1},
    }, 2000);

    for (let i = 0; i < rts.length; i++) {
      let rt = rts[i], hasChanged = false, tmp = false;
      (rt.menus || []).forEach(menu => {
        tmp = this.trimName(menu);
        hasChanged = hasChanged || tmp;
        (menu.mcs || []).forEach(mc => {
          tmp = this.trimName(mc);
          hasChanged = hasChanged || tmp;
          (mc.mis || []).forEach(mi => {
            tmp = this.trimName(mi);
            hasChanged = hasChanged || tmp;
            (mi.sizeOptions || []).forEach(so => {
              tmp = this.trimName(so);
              hasChanged = hasChanged || tmp;
            });
          });
        });
      });

      if (hasChanged) {
        try {
          await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
            old: {_id: rt._id},
            new: {_id: rt._id, menus: rt.menus}
          }]);
          this._global.publishAlert(
            AlertType.Success,
            `Menus in restaurant ${rt.name} are cleaned.`
          );
        } catch (err) {
          this._global.publishAlert(
            AlertType.Danger,
            `Menus in restaurant ${rt.name} clean failed...${err}`
          );
        }
      }
    }
  }

  async recoverMenu() {
    // const rtId = "5edd90ee8b6849feece9e8b9";
    // await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
    //   old: { _id: rtId },
    //   new: { _id: rtId, menus: menus }
    // }]).toPromise();
  }

  async findNonUsedMis() {
    const rtId = '5a950e6fa5c27b1400a58830'
    const [rt] = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: { _id: { $oid: rtId } },
      projection: {
        name: 1,
        'menus.mcs.mis.name': 1
      },
      limit: 1
    }).toPromise();
    const latestOrders = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'order',
      query: { restaurant: { $oid: rtId } },
      projection: {
        'orderItems.miInstance.name': 1
      },
      sort: {
        createdAt: -1
      },
      limit: 2000
    }).toPromise();
    const map = {};
    rt.menus.map(menu => menu.mcs.map(mc => mc.mis.map(mi => map[mi.name] = 0)));
    latestOrders.map(o => o.orderItems.map(oi => {
      map[oi.miInstance.name] = (map[oi.miInstance.name] || 0) + 1;
    }));
    const sorted = Object.keys(map).map(k => ({ name: k, value: map[k], percent: 0 })).sort((a1, a2) => a2.value - a1.value);
    const total = sorted.reduce((sum, i) => sum + i.value, 0);
    let subtotal = 0;
    for (let i = 0; i < sorted.length; i++) {
      subtotal += sorted[i].value;
      sorted[i].percent = subtotal / total;
    }
    console.log(sorted);
    console.log('test')
  }

  async fixMenuDuplication() {

    const allRestaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {},
      projection: {
        name: 1,
      },
      limit: 10000000
    }).toPromise();

    const restaurantIds = allRestaurants.map(r => r._id);
    const badIds = [];

    const batchSize = 50;
    const batches = Array(Math.ceil(restaurantIds.length / batchSize)).fill(0).map((i, index) => restaurantIds.slice(index * batchSize, (index + 1) * batchSize));

    for (let batch of batches) {
      console.log("batch ", batches.indexOf(batch), ' of ', batches.length);
      try {
        const query = {
          _id: { $in: [...batch.map(id => ({ $oid: id }))] }
        };
        const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
          resource: 'restaurant',
          query,
          projection: {
            menus: 1,
            name: 1,
          },
          limit: batchSize + 1
        }).toPromise();

        console.log("Done request");

        for (let r of restaurants) {
          const menus = r.menus || [];
          let updated = false;
          // we remove EITHER duplicared id or duplicated name of menu items!
          for (let i = menus.length - 1; i >= 0; i--) {
            const menu = menus[i];
            const mcs = menu.mcs || [];
            for (let j = mcs.length - 1; j >= 0; j--) {
              const mc = mcs[j];
              const mis = mc.mis || [];
              const miIds = new Set();
              const miNames = new Set();
              for (let k = mis.length - 1; k >= 0; k--) {
                const mi = mis[k] || {};
                if (miIds.has(mi.id) /*|| miNames.has(mi.name) */) {
                  console.log('dup:', mi.name, mi.sizeOptions[0].price);
                  updated = true;
                  mis.splice(k, 1);
                }
                miIds.add(mi.id);
                miNames.add(mi.name);
              }
            }
          }

          if (updated) {
            console.log(r.name)
            // write it back
            await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
              old: { _id: r._id },
              new: { _id: r._id, menus: menus }
            }]).toPromise();
          }
          console.log('done updating batch')
        }
      } catch (error) {
        console.log(error);
        badIds.push(...batch);
      }
      console.log("batch done");
    }
    console.log(badIds);
  }

  async fixMenuSortOrders() {
    // const restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
    //   resource: 'restaurant',
    //   query: {
    //     $or: [
    //       { "menu.mc.sortOrder": { $exists: true } },
    //       { "menu.mc.mis.sortOrder": { $exists: true } }
    //     ]
    //   },
    //   projection: {
    //     menus: 1,
    //     name: 1
    //   },
    // }, 10);
    while (true) {

      const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'restaurant',
        query: {
          $or: [
            { "menus.mcs.sortOrder": { $exists: true } },
            { "menus.mcs.mis.sortOrder": { $exists: true } }
          ]
        },
        projection: {
          menus: 1,
          name: 1,
        },
        limit: 20
      }).toPromise();

      if (restaurants.length === 0) {
        console.log("all done");
        break;
      }

      console.log(restaurants.map(r => r.name));
      // a local function to sort arr based on sortOrder.
      const sort = function (arr) {
        let firstPart = arr.filter((i) => i && typeof i.sortOrder === 'number');
        let secondPart = arr.filter((i) => i && typeof i.sortOrder !== 'number');
        firstPart = firstPart.sort((a, b) => a.sortOrder - b.sortOrder);
        return firstPart.concat(secondPart);
      }

      for (let r of restaurants) {
        const menus = r.menus || [];
        const hasSortOrder = menus.some(menu => (menu.mcs || []).some(mc => (mc && mc.hasOwnProperty('sortOrder')) || (mc.mis || []).some(mi => (mi && mi.hasOwnProperty('sortOrder')))));
        console.log(hasSortOrder);
        if (hasSortOrder) {
          // sort it and then remove sortOrder and rewrite back
          menus.map(menu => {
            (menu.mcs || []).map(mc => {
              mc.mis = sort(mc.mis || []);
              mc.mis.map(mi => delete mi.sortOrder);
            });
            // sort mcs
            menu.mcs = sort(menu.mcs);
            menu.mcs.map(mc => delete mc.sortOrder);
          });
          // write it back
          await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
            old: { _id: r._id },
            new: { _id: r._id, menus: menus }
          }]).toPromise();
        }
      }
    }

  }


  async fixBadMenuHours() {
    const restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      projection: {
        "menus.hours": 1,
        name: 1
      },
    }, 3000);
    for (let r of restaurants) {
      const hasBadHours = (r.menus || []).some(menu => !Array.isArray(menu.hours || []) || (menu.hours || []).some(hour => !hour || !hour.fromTime || !hour.toTime /*|| !hour.occurence */));
      if (hasBadHours) {
        console.log(r);
      }
    }
  }

  async getMostUsedPhones() {
    const restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      projection: {
        "channels.value": 1,
        "channels.type": 1,
        "channels.notifications": 1,
        disabled: 1,
        name: 1,
        score: 1
      },
    }, 1000000);
    const valueRts = {};
    restaurants.map(rt => {
      if (!rt.disabled) {
        (rt.channels || []).map(c => {
          valueRts[c.value] = valueRts[c.value] || []
          valueRts[c.value].push(rt);
        });
      }
    });
    const sortedEntries = Object.entries(valueRts).sort((e2, e1) => e1[1]["length"] - e2[1]["length"]);
    console.log(sortedEntries);

    const getCostScore = function (rt) {
      let score = 0;
      (rt.channels || []).filter(c => (c.notifications || []).indexOf("Order") >= 0).map(c => {
        switch (c.type) {
          case "SMS":
            score += 1;
            break;
          case "Voice":
          case "Fax":
            score += 2;
            break;
          default:
            break;
        }
      });
      return score;

    }
    const withMostPhones = restaurants.filter(rt => !rt.disabled).sort((r2, r1) => getCostScore(r1) - getCostScore(r2));
    console.log(withMostPhones);
  }


  async migrateBlacklist() {
    const bannedCustomers = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'customer',
      query: { bannedReasons: { $exists: 1 } },
      projection: {
        email: 1,
        socialId: 1,
        phone: 1,
        bannedReasons: 1
      },
    }, 1000000);
    console.log(bannedCustomers);

    const existingBlacklist = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'blacklist',
      projection: {
        type: 1,
        value: 1,
        disabled: 1
      }
    }, 1000000)

    // get unique delivery addresses of abount 3000 customers!
    const batchSize = 100;

    const batchedCustomers = Array(Math.ceil(bannedCustomers.length / batchSize)).fill(0).map((i, index) => bannedCustomers.slice(index * batchSize, (index + 1) * batchSize));
    const customerOrders = {};
    const orders = [];
    for (let customers of batchedCustomers) {
      const batch = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'order',
        query: {
          type: 'DELIVERY',
          "customerObj._id": { $in: customers.map(c => c._id) }
        },
        projection: {
          "paymentObj.method": 1,
          type: 1,
          "restaurantObj._id": 1,
          "restaurantObj.name": 1,
          "customerObj._id": 1,
          "address.formatted_address": 1,
          "address.lat": 1,
          "address.lng": 1
        },
        limit: 1000000
      }).toPromise();
      orders.push(...batch);
      batch.map(order => {
        customerOrders[order.customerObj._id] = customerOrders[order.customerObj._id] || [];
        customerOrders[order.customerObj._id].push(order);
      });
    }

    // for each banned customer, let's put his phone, email, socialId, address (from his delivery orders) to the system
    const generatedBlacklist = {}; // value: item
    bannedCustomers.map(customer => {
      generatedBlacklist[customer._id] = {
        type: 'CUSTOMER',
        value: customer._id,
        orders: customerOrders[customer._id] || [],
        reasons: customer.bannedReasons
      };

      if (customer.phone) {
        generatedBlacklist[customer.phone] = {
          type: 'PHONE',
          value: customer.phone,
          orders: customerOrders[customer._id] || [],
          reasons: customer.bannedReasons
        };
      }
      if (customer.email) {
        generatedBlacklist[customer.email] = {
          type: 'EMAIL',
          value: customer.email,
          orders: customerOrders[customer._id] || [],
          reasons: customer.bannedReasons
        };
      }
      if (customer.socialId) {
        generatedBlacklist[customer.socialId] = {
          type: 'SOCIAL',
          value: customer.socialId,
          orders: customerOrders[customer._id] || [],
          reasons: customer.bannedReasons
        };
      }

      for (let order of customerOrders[customer._id] || []) {
        if (order.address && order.address.formatted_address) {
          generatedBlacklist[order.address.formatted_address] = {
            type: 'ADDRESS',
            value: order.address.formatted_address,
            orders: orders.filter(o => o.address && order.address.formatted_address === o.address.formatted_address),
            reasons: customer.bannedReasons
          };
        }
      }
    });

    console.log(Object.keys(generatedBlacklist).length);
    const newBlacklist = Object.keys(generatedBlacklist).filter(key => !existingBlacklist.some(eb => key === eb.value));
    console.log(newBlacklist.length);
    console.log(existingBlacklist.length);
    // put those new list!
    if (newBlacklist.length > 0) {
      await this._api.post(environment.appApiUrl + `app`, {
        resource: "blacklist",
        objects: newBlacklist.map(key => generatedBlacklist[key])
      }).toPromise();
    }
    console.log(`new items count = ${newBlacklist.length}`);
  }

  async calculateCommissions() {
    // get all non-canceled, payment completed invoices so far
    const invoicesRaw = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: "invoice",
      query: {},
      projection: {
        isCanceled: 1,
        commission: 1,
        isPaymentCompleted: 1,
        toDate: 1,
        total: 1
      }
    }, 20000);
    // remove bad ones
    const invoices = invoicesRaw.filter(i => i.total < 100000);

    // all
    const allCommissions = invoices.reduce((sum, invoice) => {
      if (!invoice.isCanceled) {
        return sum + (invoice.commission || 0);
      }

      return sum;
    }, 0);
    const allTotal = invoices.reduce((sum, invoice) => {
      if (!invoice.isCanceled) {
        return sum + (invoice.total || 0);
      }

      return sum;
    }, 0);

    // year so far
    const year = new Date().getFullYear() - 0;

    const yearCommission = invoices.reduce((sum, invoice) => {
      if (!invoice.isCanceled && new Date(invoice.toDate).getFullYear() === year) {
        return sum + (invoice.commission || 0);
      }
      return sum;
    }, 0);

    const yearTotal = invoices.reduce((sum, invoice) => {
      if (!invoice.isCanceled && new Date(invoice.toDate).getFullYear() === year) {
        return sum + (invoice.total || 0);
      }
      return sum;
    }, 0);

    // year rolling

    const lastYear = new Date();
    lastYear.setDate(lastYear.getDate() - 366);

    const yearOverYearCommission = invoices.reduce((sum, invoice) => {
      if (!invoice.isCanceled && new Date(invoice.toDate).valueOf() > lastYear.valueOf()) {
        return sum + (invoice.commission || 0);
      }
      return sum;
    }, 0);

    const yearOverYearTotal = invoices.reduce((sum, invoice) => {
      if (!invoice.isCanceled && new Date(invoice.toDate).valueOf() > lastYear.valueOf()) {
        return sum + (invoice.total || 0);
      }
      return sum;
    }, 0);

    console.log(`Life Total: ${allTotal}`);
    console.log(`Life Comissions: ${allCommissions}`);
    console.log(`Year Total: ${yearTotal}`);
    console.log(`Year Comissions: ${yearCommission}`);
    console.log(`YoY Total: ${yearOverYearTotal}`);
    console.log(`YoY Comissions: ${yearOverYearCommission}`);
  }

  async fixSalesBaseAndBonus() {
    const newOwnershipRts = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        "previousRestaurantId": { $ne: null },
      },
      projection: {
        previousRestaurantId: 1,
        rateSchedules: 1,
        name: 1
      },
      limit: 10000000
    }).toPromise();
    console.log(newOwnershipRts);
    const nonNoneAgentRts = newOwnershipRts.filter(rt => (rt.rateSchedules || []).some(rs => (rs.agent || '').toLowerCase() !== 'none'));
    console.log(nonNoneAgentRts);
    alert("not finished coding")
  }

  async mutateRtId() {
    // 1. create a copy of old restaurant (manual)
    // 2. note down the ID of the new RT
    // 3. run the script to migrate everythings: orders, invoices, tasks, ?????
    // 4. delete the old restaurant (manual)

    const newId = '5da35ab7e7179a02244c016e';
    const oldId = '5d9dee267c213e55613c6251';

    const orders = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'order',
      query: {
        "restaurant": { $oid: oldId },
      },
      projection: {
        createdAt: 1,
        restaurant: 1,
        restaurantObj: 1
      },
      limit: 10000000
    }).toPromise();

    console.log(orders);
    const patches = orders.map(order => ({
      old: {
        _id: order._id,
        restaurantObj: {}
      },
      new: {
        _id: order._id,
        restaurant: { $oid: newId },
        restaurantObj: {
          _id: newId
        }
      }
    }));

    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=order', patches).toPromise();

    const invoices = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'invoice',
      query: {
        "restaurant.id": oldId,
      },
      projection: {
        createdAt: 1,
        restaurant: 1
      },
      limit: 10000000
    }).toPromise();

    console.log(invoices);
    const invoicePatches = invoices.map(invoice => ({
      old: {
        _id: invoice._id,
        restaurant: {}
      },
      new: {
        _id: invoice._id,
        restaurant: {
          id: newId
        }
      }
    }));

    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=invoice', invoicePatches).toPromise();


  }

  async purge(dbName) {
    if (['job', 'event'].indexOf(dbName) < 0) {
      alert('Not supported');
    }

    const cutoffTime = new Date().valueOf() - 30 * 24 * 3600000;
    const queryBatchSize = 24000;
    const deleteBatchSize = 300;
    while (true) {
      const items = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: dbName,
        query: {
          createdAt: { $lt: cutoffTime },
        },
        projection: {
          createdAt: 1
        },
        limit: queryBatchSize
      }).toPromise();

      if (items.length === 0) {
        break;
      }
      console.log(`deleting ${items.length} ${new Date(items[0].createdAt)}`);
      let batched = Array(Math.ceil(items.length / deleteBatchSize)).fill(0).map((i, index) => items.slice(index * deleteBatchSize, (index + 1) * deleteBatchSize));
      // console.log(batched)

      await Promise.all(batched.map(batch => this._api.delete(environment.qmenuApiUrl + 'generic', {
        resource: dbName,
        ids: batch.map(i => i._id)
      }).toPromise()));

    }
  }

  async fixLonghornPhoenix() {
    const printClients = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'print-client',
      query: {
      },
      limit: 8000
    }).toPromise();
    console.log(printClients);
    const rtPrintClients = {};
    printClients.map(pc => {
      if (pc.restaurant) {
        rtPrintClients[pc.restaurant._id] = rtPrintClients[pc.restaurant._id] || [];
        rtPrintClients[pc.restaurant._id].push(pc);
      }
    });

    for (let key of Object.keys(rtPrintClients)) {
      if (rtPrintClients[key].length > 1) {
        const clients = rtPrintClients[key].sort((c2, c1) => new Date(c1.createdAt).valueOf() - new Date(c2.createdAt).valueOf());
        if (clients[0].type === 'longhorn') {
          console.log(clients);
          await this._api.delete(environment.qmenuApiUrl + "generic", {
            resource: "print-client",
            ids: [clients[0]._id]
          });
        }
      }
    }
  }

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
        "googleAddress.formatted_address": 1,
        "googleListing.place_id": 1,
        disabled: 1
      },
      limit: 60000
    }).toPromise();

    console.log(missingTimezoneRestaurants);
    for (let r of missingTimezoneRestaurants) {
      try {

        const addressDetails = await this._api.get(environment.qmenuApiUrl + "utils/google-address", {
          formatted_address: r.googleAddress.formatted_address
        }).toPromise();
        await this._api.patch(environment.qmenuApiUrl + "generic?resource=restaurant", [
          {
            old: { _id: r._id, googleAddress: {} },
            new: { _id: r._id, googleAddress: { timezone: addressDetails.timezone } }
          }
        ]).toPromise();
        console.log(r.name);
      } catch (error) {
        console.log(r.name, r.disabled, '-------------------');
        console.log(error);
      }
    }
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

  async injectTotalEtcToInvoice() {
    alert('only ones without transactionAdjustment')
    const invoices = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "invoice",
      query: {},
      projection: {
        "restaurant.name": 1,
        isCanceled: 1,
        adjustments: 1,
        transactionAdjustment: 1
      },
      limit: 50000000
    }).toPromise();

    const withAdjustments = invoices.filter(i => i.adjustments && i.adjustments.length > 0 && i.transactionAdjustment === undefined);
    console.log(withAdjustments.length)

    for (let i of withAdjustments) {
      await this._api.post(environment.appApiUrl + 'invoices/compute-derived-fields', { id: i._id }).toPromise();
    }

    console.log(invoices.length)
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
        limit: 700000
      }),
      this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "gmbAccount",
        projection: {
          email: 1
        },
        limit: 700000
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
    const dateThreshold = new Date(new Date().valueOf() - 24 * 3600000); // one day
    const latestListeners = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'resource-listener',
      query: {
        createdAt: { $gt: { $date: dateThreshold } }
      },
      projection: {
        "query.orderObj.restaurantObj._id": 1,
        "connections": { $slice: 1 }
      },
      sort: {
        _id: -1
      },
      limit: 10000
    }).toPromise();

    // build rtId: onlineTime map
    const rtStats = {}; /// eg: {"57c4dc97a941661100c642b4": "2021-07-03T16:09:19.521Z"}
    latestListeners.forEach(listener => {
      const rtId = listener.query.orderObj && listener.query.orderObj.restaurantObj && listener.query.orderObj.restaurantObj._id;
      const time = listener.connections && listener.connections.length > 0 && listener.connections[0].time;
      if (rtId && time) {
        rtStats[rtId] = rtStats[rtId] || {};
        rtStats[rtId].lastKnownAliveTime = time;
      }
    });

    // scan events in past xxx days
    const analyticsEvents = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'analytics-event',
      query: {
        name: 'scan-qr'
      },
      projection: {
        restaurantId: 1,
        code: 1,
        "runtime.browser": 1,
        "runtime.os": 1,
        createdAt: 1
      },
      sort: {
        _id: -1
      },
      limit: 10000
    }).toPromise();

    analyticsEvents.forEach(evt => {
      const rtId = evt.restaurantId;
      rtStats[rtId] = rtStats[rtId] || {};
      rtStats[rtId].events = rtStats[rtId].events || [];
      rtStats[rtId].events.push(evt)
    });
    console.log(rtStats)

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
    const havingNullRestaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        "menus.mcs.mis": null,
        "menus": { $exists: 1 }
      },
      projection: {
        name: 1,
        "menus": 1
      },
    }, 6000);
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
    const restaurantIds = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      projection: {
        name: 1,
      },
    }, 6000)

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
      }).toPromise());

      restaurants.map(r => {
        if (r.menus && !Array.isArray(r.menus)) {
          throw "menus not array"
        }
        (r.menus || []).map(m => {
          if (m && m.mcs && !Array.isArray(m.mcs)) {
            //console.log(r._id);
            console.log(m)
            throw "mcs not array"
          }
          (m.mcs || []).map(mc => {
            if (mc && mc.mis && !Array.isArray(mc.mis)) {
              console.log(mc)
              throw "mis not array"
            }
            (mc.mis || []).map(mi => {
              if (mi && mi.sizeOptions && !Array.isArray(mi.sizeOptions)) {
                console.log(r._id, mi, mc)
                //throw "sizeOptions not array"
              }
            })
          })
        })
      })


      const badRestaurants = restaurants.filter(r => {
        return (r.menus || []).some(menu => (menu.mcs || []).some(mc => (mc.mis || []).some(mi => !mi || !mi.sizeOptions || !Array.isArray(mi.sizeOptions) || mi.sizeOptions.length === 0 || mi.sizeOptions.some(so => !so || !so.name))))
      });
      if (badRestaurants.length > 0) {
        // patch!
        const fixedMenu = function (restaurant) {
          console.log(restaurant._id);
          const clone = JSON.parse(JSON.stringify(restaurant));
          // remove null menu item
          clone.menus.map(menu => menu.mcs.map(mc => mc.mis = mc.mis.filter(mi => mi && mi.sizeOptions && Array.isArray(mi.sizeOptions))));
          // fix size options
          clone.menus.map(menu => menu.mcs.map(mc => mc.mis.map(mi => mi.sizeOptions = mi.sizeOptions.filter(so => so && so.name))));
          // fix menu
          clone.menus.map(menu => menu.mcs.map(mc => mc.mis = mc.mis.filter(mi => mi && mi.sizeOptions.length > 0)));
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
    const restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      projection: {
        rateSchedules: 1,
        name: 1
      }
    }, 5000);
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

  async injectRestaurantScores() {

    const restaurants = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: 'restaurant',
      projection: {
        name: 1,
        updatedAt: 1
      },
      sort: {
        updatedAt: 1
      }
    }, 2000);

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

    const migrateFields = ['bizManagedWebsite', 'useBizWebsite', 'useBizWebsiteForAll', 'qmenuWebsite', 'qmenuPop3Password', 'ignoreGmbOwnershipRequest'];

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
      const gmbBizList = [];
      while (true) {
        const batchList = await this._api.get(environment.qmenuApiUrl + 'generic', {
          resource: 'gmbBiz',
          query: {
            _id: { $in: batch.map(biz => ({ $oid: biz._id })) }
          },
          skip: gmbBizList.length,
          limit: gmbBizbatchListSize
        }).toPromise();
        gmbBizList.push(...batchList);
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
    const serviceSettings = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {disabled: { $ne: true }},
      projection: {
        name: 1,
        googleListing: 1,
        serviceSettings: 1,
        requireZipcode: 1,
        requireBillingAddress: 1
        
      }
    }, 3000)

    let updatedRestaurantPairs = [];
    for (let r of serviceSettings) {
      const oldR = r;
      let newR = JSON.parse(JSON.stringify(r));
      if (r.serviceSettings && r.serviceSettings.some(each => each.paymentMethods && each.paymentMethods.indexOf('QMENU') > -1)) {
        if (!newR.requireZipcode || !newR.requireBillingAddress) {
          newR.requireZipcode = true;
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

  async findQMenuCCRTs() {
    const serviceSettings = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      projection: {
        name: 1,
        googleListing: 1,
        serviceSettings: 1,
        requireZipcode: 1,
        requireBillingAddress: 1,
        disabled: 1
      }
    }, 3000)

    let result = serviceSettings.filter(r => (!r.disabled && r.googleListing && r.googleListing.gmbOwner === "qmenu" && r.serviceSettings && r.serviceSettings.some(each => each.paymentMethods.indexOf('QMENU') > 0)));
    let rtIds = result.map(r => r._id);


    console.log("qMenu RTs=", rtIds);
    // console.log("qMenu RT IDs=", rtIds.slice(0,100));
    // console.log("qMenu RT IDs=", rtIds.slice(100,200));
    // console.log("qMenu RT IDs=", rtIds.slice(200, 300));
    // console.log("qMenu RT IDs=", rtIds.slice(300));


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

  async deleteDomainData(type) {
    const batchSize = 1000;
    const domainList = [];
    while (true) {
      const batch = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: type,
        skip: domainList.length,
        limit: batchSize
      }).toPromise();
      domainList.push(...batch);
      if (batch.length === 0 || batch.length < batchSize) {
        break;
      }
    }

    let deleteBatchSize = 100;
    const batchedList = Array(Math.ceil(domainList.length / deleteBatchSize)).fill(0).map((i, index) => domainList.slice(index * deleteBatchSize, (index + 1) * deleteBatchSize));
    for (let batch of batchedList) {
      await this._api.delete(environment.qmenuApiUrl + "generic", {
        resource: type,
        ids: batch.map(r => r._id)
      });
    }

  }

  async getAwsAndGodaddyDomains() {
    ['domain'].map(type => this.deleteDomainData(type));
    let results = [];
    let awsDomainList = await this._api.get(environment.qmenuApiUrl + "utils/list-aws-domain").toPromise();

    awsDomainList.map(each => {
      let domain = new Domain();
      domain.name = each.DomainName;
      domain.autoRenew = each.AutoRenew;
      domain.expiry = each.Expiry;
      domain.type = "AWS";
      results.push(domain);
    })

    let godaddyDomainList = await this._api.get(environment.qmenuApiUrl + "utils/list-godaddy-domain").toPromise();
    godaddyDomainList.map(each => {
      let domain = new Domain();
      domain.name = each.domain;
      domain.autoRenew = each.renewAuto;
      domain.expiry = each.expires;
      domain.status = each.status;
      domain.type = "GODADDY";
      results.push(domain);
    })

    await this._api.post(environment.qmenuApiUrl + 'generic?resource=domain', results).toPromise();

  }

  async getRestaurantsHavingOrdersWithin() {
    let start = new Date();
    start.setDate(start.getDate() - 15);
    let to = new Date();

    const orders = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: "order",
      query: {
        $and: [
          {
            createdAt: {
              $gte: { $date: start }
            }
          },
          {
            createdAt: {
              $lte: { $date: to }
            }
          }
        ]
      },
      projection: {
        restaurant: 1,
        createdAt: 1,
        orderNumber: 1,
        rateSchedules: 1,
      },
    }, 3000);

    console.log(orders.length);
    let rtIds = orders.map(o => o.restaurant);

    rtIds = Array.from(new Set(rtIds));
    console.log(rtIds)


    const batchSize = 100;

    const batchedID = Array(Math.ceil(rtIds.length / batchSize)).fill(0).map((i, index) => rtIds.slice(index * batchSize, (index + 1) * batchSize));

    const restaurants = [];

    for (let batch of batchedID) {
      const batchedResult = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'restaurant',
        query: {
          _id: {
            $in: batch.map(b => ({ $oid: b }))
          }
        },
        projection: {
          _id: 1,
          'rateSchedules': 1
        },
        limit: batch.length
      }).toPromise();
      restaurants.push(...batchedResult);
    }

    let englishRts = restaurants.filter(r => r.rateSchedules.some(r => r.agent === 'charity')).map(e => e._id);
    let chineseRts = restaurants.filter(r => !r.rateSchedules.some(r => r.agent === 'charity')).map(e => e._id);

    console.log('englishRts', englishRts);
    console.log('chineseRts', chineseRts);

    let englishIdString = englishRts.join(',');
    let chineseIdString = chineseRts.join(',');
    console.log('englishIdString', englishIdString);
    console.log('chineseIdString', chineseIdString);
  }

  async getChineseOrEnglishRTs() {
    const RTs = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      projection: {
        _id: 1,
        disabled: 1,
        'rateSchedules': 1
      }
    }, 3000)



    let englishRts = RTs.filter(r => !r.disabled && r.rateSchedules && r.rateSchedules.some(r => r.agent === 'charity')).map(e => e._id);
    let chineseRts = RTs.filter(r => !r.disabled && r.rateSchedules && !r.rateSchedules.some(r => r.agent === 'charity')).map(e => e._id);
    console.log('englishRts length', englishRts.length);
    console.log('chineseRts', chineseRts.length);
    //console.log('englishRts', englishRts);
    //console.log('chineseRts', chineseRts);

    let englishIdString = englishRts.join(',');
    let chineseIdString = chineseRts.join(',');
    //console.log('englishIdString', englishIdString);
    console.log('chineseIdString', chineseIdString);

    FileSaver.saveAs(new Blob([JSON.stringify(chineseIdString)], { type: "text" }), 'data.txt');

  }

  async getRestaurantWithoutSingleDomain() {

    let restaurants = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: 'restaurant',
      projection: {
        name: 1,
        "googleListing.cid": 1,
        "googleListing.gmbOwner": 1,
        "googleListing.gmbWebsite": 1,
        "googleAddress.formatted_address": 1,
        web: 1,
        disabled: 1,
        score: 1,
      },
      sort: {
        updatedAt: 1
      }
    }, 3000);

    const accounts = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbAccount',
      projection: {
        "email": 1,
        "locations.cid": 1,
        "locations.status": 1
      }
    }, 50)

    // create a cidMap
    const cidMap = {};

    //remove disabled RT
    restaurants = restaurants.filter(each => !each.disabled)

    restaurants.map(r => {
      if (r.googleListing && r.googleListing.cid) {
        cidMap[r.googleListing.cid] = cidMap[r.googleListing.cid] || {};
        cidMap[r.googleListing.cid].restaurants = cidMap[r.googleListing.cid].restaurants || [];
        cidMap[r.googleListing.cid].restaurants.push(r);
      }
    });



    let publishedRTs = [];
    accounts.map(account => (account.locations || []).map(loc => {
      // make Published overrule other status
      if (loc.status === 'Published') {
        if (cidMap[loc.cid] && cidMap[loc.cid].restaurants) {
          publishedRTs.push(...cidMap[loc.cid].restaurants);
        }
      }
    }));
    console.log(publishedRTs);

    let filteredRT1 = publishedRTs.filter(each => each.web && each.web.qmenuWebsite && each.web.qmenuWebsite.indexOf('qmenu.us') >= 0);
    console.log("qmenu.us RTs", filteredRT1);

    let filteredRT2 = publishedRTs.filter(each => each.web && each.web.qmenuWebsite && each.web.qmenuWebsite.indexOf('qmenu.us') < 0 && each.web.qmenuWebsite.indexOf('https') < 0);
    console.log("godaddy RTs", filteredRT2);

    console.log("qmenu.us RTs score >0", filteredRT1.filter(each => each.score > 0));
    console.log("godaddy RTs score >0", filteredRT2.filter(each => each.score > 0));

  }

  async getRTsClosedForLong() {

    let restaurants = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: 'restaurant',
      projection: {
        name: 1,
        _id: 1,
        closedHours: 1,
        disabled: 1,
        score: 1,
      },
      sort: {
        updatedAt: 1
      }
    }, 3000);


    let closedRT = []
    restaurants = restaurants.filter(r => !r.disabled)

    restaurants.forEach(e => {

      let closed = (e.closedHours || []).some(hour => {
        if (hour) {

          let from = new Date(hour.fromTime);
          let to = new Date(hour.toTime);

          let span = to.getTime() - from.getTime();
          if (span > 3 * 30 * 24 * 3600000) {
            return true;
          }
        }
      })

      if (closed) {
        closedRT.push(e._id);
      }



    });
    console.log('closedRT', closedRT)
  }

  async deletePastClosedHours() {
    let restaurants = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: 'restaurant',
      projection: {
        name: 1,
        _id: 1,
        closedHours: 1,
        disabled: 1,
        score: 1,
      },
      sort: {
        updatedAt: 1
      }
    }, 3000);

    const updatedOldNewPairs = [];
    restaurants.map(r => {
      let updated = false;
      r.closedHours = r.closedHours || [];
      for (let i = r.closedHours.length - 1; i >= 0; i--) {
        console.log('rt', r._id);
        if (r.closedHours[i] && r.closedHours[i].toTime) {
          let toTime = new Date(r.closedHours[i].toTime);
          let now = new Date();
          let Difference_In_Time = now.getTime() - toTime.getTime();
          // To calculate the no. of days between two dates
          let Difference_In_Days = Difference_In_Time / (1000 * 3600 * 24);
          if (Difference_In_Days > 1) {
            r.closedHours.splice(i, 1);
            updated = true;
          }
        }
      }

      if (updated) {
        updatedOldNewPairs.push({
          old: { _id: r._id },
          new: { _id: r._id, closedHours: r.closedHours }
        });
      }
    });
    console.log(updatedOldNewPairs);
    if (updatedOldNewPairs.length > 0) {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', updatedOldNewPairs).toPromise();
    }

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


