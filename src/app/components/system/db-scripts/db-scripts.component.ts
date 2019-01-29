import { Component, OnInit } from "@angular/core";
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";
import { zip, Observable, from } from "rxjs";
import { mergeMap } from "rxjs/operators";
import { Restaurant, Hour } from '@qmenu/ui';
import { Invoice } from "../../../classes/invoice";
import { Gmb3Service } from "src/app/services/gmb3.service";

@Component({
  selector: "app-db-scripts",
  templateUrl: "./db-scripts.component.html",
  styleUrls: ["./db-scripts.component.scss"]
})
export class DbScriptsComponent implements OnInit {
  removingOrphanPhones = false;
  constructor(private _api: ApiService, private _global: GlobalService, private _gmb3: Gmb3Service) { }

  ngOnInit() { }

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
    // find same placeId gmbs
    const gmbBizList = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbBiz',
      projection: {
        name: 1,
        address: 1,
        place_id: 1,
        cid: 1,
        qmenuId: 1
      },
      limit: 6000
    }).toPromise();

    console.log(gmbBizList)
    const place_idMap = {};
    gmbBizList.map(biz => {
      place_idMap[biz.place_id] = place_idMap[biz.place_id] || { bizList: [] };
      place_idMap[biz.place_id].bizList.push(biz);
    });


    console.log(place_idMap)
    const duplicatedList = Object.keys(place_idMap).map(k => place_idMap[k]).filter(item => item.bizList.length > 1);
    console.log(duplicatedList);

    const trueDuplicates = duplicatedList.filter(item => item.bizList.slice(1).some(i => i.cid !== item.bizList[0].cid));

    console.log(trueDuplicates);
    //find bizManagedWebsite
    // const havingBizWebsite = await this._api.get(environment.adminApiUrl + 'generic', {
    //   resource: 'gmbBiz',
    //   query: {
    //     bizManagedWebsite: { $exists: 1 }
    //   },
    //   projection: {
    //     name: 1,
    //     bizManagedWebsite: 1,
    //     useBizWebsite: 1,
    //     useBizWebsiteForAll: 1
    //   },
    //   limit: 5000
    // }).toPromise();
    // // update gmbBiz to make
    // CAREFUL: SET useBizWebsite = true
    // await this._api.patch(environment.adminApiUrl + 'generic?resource=gmbBiz',
    //   havingBizWebsite.map(b => ({
    //     old: {
    //       _id: b._id
    //     },
    //     new: {
    //       _id: b._id,
    //       useBizWebsite: b.bizManagedWebsite && b.bizManagedWebsite.length > 0
    //     }
    //   }))
    // ).toPromise();
    // console.log(havingBizWebsite);
    // // find out invoice having Fax-phaxio-callback as log
    // let affectedInvoices = [];
    // this._api.get(environment.qmenuApiUrl + "generic", {
    //   resource: "invoice",
    //   query: {
    //     "logs.action": 'Fax-phaxio-callback',
    //     "orders.canceled": true
    //   },
    //   projection: {
    //     "restaurant.name": 1,
    //     "restaurant.offsetToEST": 1,
    //     orders: 1,
    //     logs: 1,
    //     adjustments: 1,
    //     payments: 1,
    //     isCanceled: 1,
    //     isSent: 1,
    //     isPaymentSent: 1,
    //     isPaymentCompleted: 1,
    //    previousInvoiceId: 1,
    //          previousBalance: 1

    //   },
    //   limit: 50
    // }).subscribe(
    //     invoices => {
    //       console.log(invoices);
    //       this._global.publishAlert(
    //         AlertType.Success,
    //         "done"
    //       );
    //     },
    //     error => {
    //       this._global.publishAlert(
    //         AlertType.Danger,
    //         "Error: " + JSON.stringify(error)
    //       );
    //     }
    //   );

    // get banned customer

    // const startDate = new Date('2018-07-01');
    // const endDate = new Date('2018-07-02');
    // this._api.get(environment.qmenuApiUrl + "generic", {
    //   resource: "customer",
    //   query: {
    //     //bannedReasons: { $exists: true },
    //     // socialProvider: { $exists: true },
    //     "createdAt": { $gte: { $date: startDate }, $lte: { $date: endDate } }
    //   },
    //   projection: {
    //     email: 1,
    //     firstName: 1,
    //     socialProvider: 1,
    //     banCounter: 1,
    //     bannedReasons: 1,
    //     createdAt: 1
    //   },
    //   limit: 2000
    // }).subscribe(
    //   results => {
    //     // results = results.filter(r => r.bannedReasons.length > 0);
    //     console.log(results);
    //     const socials = results.filter(r => r.socialProvider);
    //     console.log(socials);
    //     this._global.publishAlert(
    //       AlertType.Success,
    //       "done"
    //     );
    //   },
    //   error => {
    //     this._global.publishAlert(
    //       AlertType.Danger,
    //       "Error: " + JSON.stringify(error)
    //     );
    //   }
    // );

    //make all gmb account emails small case
    // const gmbAccounts = await this._api.get(environment.adminApiUrl + 'generic', { resource: 'gmbAccount', projection: { email: 1 }, limit: 5000 }).toPromise();
    // console.log(gmbAccounts);
    // const gmbAccountsUpper = gmbAccounts.filter(ga => ga.email.toLowerCase() !== ga.email);
    // console.log(gmbAccountsUpper);
    // await this._api.patch(environment.adminApiUrl + 'generic?resource=gmbAccount',
    //   gmbAccountsUpper.map(ga => ({
    //     old: { _id: ga._id },
    //     new: { _id: ga._id, email: ga.email.toLowerCase() }
    //   }))
    // );

    //make all task.transfer.fromEmail to small case
    // const tasks = await this._api.get(environment.adminApiUrl + 'generic', { resource: 'task', projection: { "transfer.fromEmail": 1 }, limit: 5000 }).toPromise();
    // const filteredTasks = tasks.filter(t => t.transfer && t.transfer.fromEmail && t.transfer.fromEmail.toLowerCase() !== t.transfer.fromEmail);
    // console.log(filteredTasks);
    // await this._api.patch(environment.adminApiUrl + 'generic?resource=task',
    //   filteredTasks.map(t => ({
    //     old: { _id: t._id, transfer: {fromEmail: t.transfer.fromEmail} },
    //     new: { _id: t._id, transfer: {fromEmail: t.transfer.fromEmail.toLowerCase()} }
    //   }))
    // );

    // get all existing gmbs and find those have lastpublishedtim

    // const gmbs = await this._api.get(environment.qmenuApiUrl + 'generic', {
    //   resource: 'gmb',
    //   projection: {
    //     email: 1,
    //     'businesses.name': 1,
    //     'businesses.phone': 1,
    //     'businesses.lastPublishedTime': 1,
    //     'businesses.restaurantId': 1,
    //     'businesses.isPublished': 1
    //   },
    //   limit: 5000
    // }).toPromise();

    // // make a dictionary phone-> {business: xxx, email: xxx}
    // const phoneMap = {} as any;
    // gmbs.map(gmb => {
    //   (gmb.businesses || []).map(biz => {
    //     if (biz.lastPublishedTime && biz.phone) {
    //       if (!phoneMap[biz.phone]) {
    //         phoneMap[biz.phone] = [];
    //       }
    //       phoneMap[biz.phone].push({
    //         business: biz,
    //         email: gmb.email.toLowerCase().trim()
    //       });
    //     }
    //   });
    // });
    // console.log(phoneMap);

    // // inject into gmbOwnerships of each biz
    // const gmbBizList = await this._api.get(environment.adminApiUrl + 'generic', {
    //   resource: 'gmbBiz',
    //   projection: {
    //     phone: 1,
    //     gmbOwnerships: 1
    //   },
    //   limit: 5000
    // }).toPromise();

    // // only handle those that don't have any gmb ownership history
    // const virginGmbBizList = gmbBizList.filter(b => !b.gmbOwnerships || b.gmbOwnerships.length === 0);

    // // let's match and inject into new format
    // virginGmbBizList.map(biz => {
    //   const entries = phoneMap[biz.phone] || [];
    //   let sortedEntries = entries.sort((e1, e2) => new Date(e1.business.lastPublishedTime).valueOf() - new Date(e2.business.lastPublishedTime).valueOf());

    //   if (sortedEntries.length > 0 && !sortedEntries[sortedEntries.length - 1].business.isPublished) {
    //     sortedEntries.push({
    //       email: undefined,
    //       business: { lastPublishedTime: new Date().toISOString() }
    //     });
    //   }

    //   const gmbOwnerships = sortedEntries.map(entry => ({
    //     email: entry.email,
    //     possessedAt: {
    //       "$date": entry.business.lastPublishedTime
    //     }
    //   }));
    //   console.log(gmbOwnerships);

    //   biz.gmbOwnerships = gmbOwnerships;
    // });

    // // patch to insert!

    // console.log('updated: ');
    // console.log(virginGmbBizList);
    // await this._api.patch(environment.adminApiUrl + 'generic?resource=gmbBiz',
    //   virginGmbBizList.map(biz => ({
    //     old: {
    //       _id: biz._id
    //     },
    //     new: {
    //       _id: biz._id,
    //       gmbOwnerships: biz.gmbOwnerships
    //     }
    //   }))
    // ).toPromise();
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

  async fixGodaddy() {
    const siteString = `168SzechuanHouston.com
168restaurantrichmond.com
1stchopsueytogo.com
21ShanghaiHouseNY.com
22thainewyork.com
2bacipizzeriatogo.com
3FortunesRestaurant.com
4sonspizzaandgrill.com
527bbq.com
5iphoCulverCity.com
64stGardenCafetogo.com
888ChineseTogo.com
88chinamo.com
A1ChineseHibachiTogo.com
A1DeliTogo.com
AberdeenStirFry88.com
AbyssiniaPhoenix.com
AchioteGrillMexican.com
AjiSushiAstoria.com
AkiSuShiEnglewood.com
AkimotoSushiTogo.com
AlNoorHalalbrooklyn.com
Aladinospizzatogo.com
Aldositaliantogo.com
AlexandriaChinaCafe.com
AlexandriaHunanKitchen.com
AlexandriaKensAsianBistro.com
AlexandriaShanghaiPeking.com
AlexandriaSzechuanDelight.com
AllMediterraneanGrill.com
AlohaTeriyakiGroton.com
Americanwingsandhibachi.com
AmericasBestWingstogo.com
AmherstPandaEast.com
AmigaChineseNewark.com
AmyCathyBayside.com
AnaheimChinaKitchen.com
AnchorageJimmySushi.com
AntiochKirinSushi.com
AntojitosLocosTogo.com
AnzaiEastMeadow.com
ArashiSushitogo.com
ArcadiaGoldenDragon.com
ArlingtonPizzaPieMe.com
ArlintongYoungChow.com
AromaIndianUpland.com
AroyDeeThaiCuisinetogo.com
ArvadaPudgeBrosPizza.com
AryanaMediterraneanCuisinetogo.com
AsaiWokAllston.com
AshevilleDragonChina.com
AsiaBarBQueTogo.com
AsiaGardenFood.com
AsiaGardenNJ.com
AsiaKitchenBaldwinPark.com
AsiaWokTogo.com
AuburnNewChina.com
CatonsvilleDragonChina.com
ChinaSPringsTogo.com
GoldenDragonColumbia.com
MainMoonChineseTogo.com
OceanPizzaHala.com
SweetGingerTogo.com3
TotinozpizzaInglewood.com
arlingtonthaieatery.com
bakersfieldpizza.us
baltimorechinadrahon.com
bambinospizzaria.us
bellaromaonline.us
blueelephant.miami
bowlkitchentogo.com
cafepragueofsanfrancisco.com
cantonphoenixtogo.info
cathcoffeeandtea.com
chicagostpizza.com
chinaexpresskansas.com
chinahallga.com
chinaonetakeout.net
ciceroshesperia.com
combospizzaonline.com
dynastyalpharettadelivery.com
easternpavillionsetauket.com
eastthainoodlehousemiami.com
goldengarden.com
goodtastetogo.ccom
goodtastetogoccom.com
happylandbuffet.com
happystarpa.com
joesseafoodandbar.com
nobleromanspizza.us
norijapanchesapeake.com
papasamschicagostylepizza.info
qmenu365.com
starofindia.qmenu.us
sunshinasiancuisinetogo.com
unclemaddiosga.com
unclemaddiosga.us
whatapizzaonline.com
www.dishoutrestaurant.us
www.johnscreekchineserestaurant.com
yardbirddenver.us
ElRinconcitoLatino.com
MyNewChinaAl.com
MyWishDishCafe.com
PandaFoodDelivery.com
WoodbridgeBrothersPizza.com
ajiaosichuanny.com
blackpearliitogo.com
buonapizzabronx.com
capripizzaandgrill.com
chicknshop.com
chilichutney.us
chinacafepawhuska.com
chinaheavenatl.com
chinaokgonv.com
cotatifuzhou.com
crazybearspizzatogo.com
franklinphillymancheesesteak.com
gaithersburgchickenburger.com
generaltsostogo.com
gingerworkyardley.com
goldedragoncolumbia.com
great-wall-chinese-express.business.site
hanhinplainfield.com
hotkitchentogo.com
httpcafepragueofsanfrancisco.com
imm-thai-on-9th.business.site
inchinbamboogarden.com
jadedragontogo.com
jimmysperuviansacramento.com
kisorotogo.com
lamsgardentogocom.com
mamamiacucinahollywood.com
marusushitogo.com
matteospizza.us
maxsmukhaasetogo.com
maywahchinesetogo.com
mychopstixchinese.com
newchinadavenport.com
newmillenniumpizza.com
newmillenniumpizza.info
ninos-pizza.com
nypizzeriacompany.us
pizzalandva.com
potpanchicago.com
ricebarwashingtondc.info
shishtown.com
snowpeachinesetogo.com
stuftpizzatogo.info
sushiasiancuisine.com
sweetgingermidvale.com
takewayne.com
teaussushiburritoflushing.com
theburpkitchenguttenberg.com
triopizzaandpastatx.com
ulikechinesetogo.com
valentinospizzeriaca.net
whatapizza.info
www.godavarius.us
www.wokandroll-sanmarcos.com
yamatosteakhousems.com
yinglichulavista.com
yumisushitogo.com
zealrestaurant.us`;

    const domains = siteString.split('\n').map(s => s.trim()).filter(s => s);
    console.log(domains.length);
    const templateMap = {
      "Pizza Restaurant Template": ["pizza", "pizzeria"],
      "Japanese Restaurant Template": ["sushi", "japan", "teriyaki"],
      "Chinese Restaurant Template": ["fortune", "wok", "rice", "garden", "happy", "chuan", "china", "chinese", "wall", "dragon", "asia", "asian", "chow", "panda", "orient", "shanghai", "peking", "szechuan", "canton"],
      "Thai Restaurant Template": ["thai"],
      "Indian Restaurant Template": ["indian"],
      "Italian Restaurant Template": ["italian"],
      "Mexico Restaurant Template": ["mexican"]
    }

    const mapped = domains.filter(domain => Object.keys(templateMap).some(template => templateMap[template].some(keyword => domain.toLocaleLowerCase().indexOf(keyword) >= 0)));

    console.log('mapped', mapped.length);
    const nonMapped = domains.filter(domain => mapped.indexOf(domain) < 0);

    console.log('non-mapped', nonMapped.length);
    console.log(nonMapped);

    // get ALL GMB domains
    const gmbs = await this._api.get(environment.adminApiUrl + "generic", {
      resource: 'gmbBiz',
      query: {
        qmenuWebsite: { $exists: true },
        qmenuId: { $exists: true }
      },
      projection: {
        name: 1,
        gmbOwner: 1,
        gmbWebsite: 1,
        qmenuWebsite: 1,
        qmenuId: 1,
        score: 1,
        gmbOwnerships: 1,
        phone: 1
      },
      limit: 6000
    }).toPromise();

    // find those in GMB
    const topGmbs = gmbs.filter(gmb => domains.some(domain => gmb.qmenuWebsite.toLowerCase().indexOf(domain.toLowerCase()) >= 0));
    const mappedRows = topGmbs.map((gmb, index) => {
      return `|${gmb.phone}|${gmb.name}|${domains.filter(domain => gmb.qmenuWebsite.toLowerCase().indexOf(domain.toLowerCase()) >= 0)[0]}|${(gmb.gmbOwnerships || []).length > 0 ? gmb.gmbOwnerships[gmb.gmbOwnerships.length - 1].email : 'N/A'}|${gmb.score}`;
    });

    console.log(mappedRows);
    // console.log(gmbs.length);
    // const restaurants = await this._api.get(environment.qmenuApiUrl + "generic", {
    //   resource: 'restaurant',
    //   query: {
    //     _id: { $in: gmbs.map(gmb => ({ $oid: gmb.qmenuId })) }
    //   },
    //   projection: {
    //     name: 1,
    //     "channels.value": 1
    //   },
    //   limit: 6000
    // }).toPromise();

    // restaurant, gmb-website, godaddy domain mapping
    // const highPriorityList = gmbs.map(gmb => {
    //   const restaurant = restaurants.filter(r => r._id === gmb.qmenuId)[0];
    //   const godaddyDomain = domains.filter(domain => gmb.qmenuWebsite.toLowerCase().indexOf(domain.toLowerCase()) >= 0)[0];
    //   return ({
    //     gmb: gmb,
    //     restaurant: restaurant,
    //     godaddyDomain: godaddyDomain
    //   })
    // }).filter(obj => obj.restaurant && obj.godaddyDomain);

    // console.log(highPriorityList.map((obj, index) => index + '\t' + obj.restaurant.name + '\t' + obj.godaddyDomain));
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
    const migrateFields = ['bizManagedWebsite', 'useBizWebsite', 'useBizWebsiteForAll', 'qmenuWebsite', 'qmenuPop3Email', 'qmenuPop3Host', 'qmenuPop3Password', 'ignoreGmbOwnershipRequest', 'disableAutoTask'];

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
        googleListing: 1,
        listings: 1,
        ...migrateFields.reduce((obj, field) => (obj[field] = 1, obj), {})
      },
      limit: 6000
    }).toPromise();

    const gmbAccountsWithLocations = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbAccount',
      query: {
        locations: { $exists: 1 }
      },
      projection: {
        email: 1,
        locations: 1
      },
      limit: 6000
    }).toPromise();

    const cidMap = {};
    gmbBizList.map(biz => {
      cidMap[biz.cid] = cidMap[biz.cid] || {};
      cidMap[biz.cid].gmbBizList = cidMap[biz.cid].gmbBizList || [];
      cidMap[biz.cid].gmbBizList.push(biz);
    });

    gmbAccountsWithLocations.map(account => account.locations.map(loc => {
      cidMap[loc.cid] = cidMap[loc.cid] || {};
      cidMap[loc.cid].accountLocations = cidMap[loc.cid].accountLocations || [];
      cidMap[loc.cid].accountLocations.push({ account: account, location: loc });
    }));

    restaurants.map(r => {
      if (r.googleListing && r.googleListing.cid) {
        cidMap[r.googleListing.cid] = cidMap[r.googleListing.cid] || {};
        cidMap[r.googleListing.cid].restaurants = cidMap[r.googleListing.cid].restaurants || [];
        cidMap[r.googleListing.cid].restaurants.push(r);
      }
    });

    const duplicatedGmbBizList = Object.keys(cidMap).filter(k => cidMap[k].gmbBizList && cidMap[k].gmbBizList.length > 1).map(k => cidMap[k].gmbBizList);
    console.log('duplicatedGmbBizList', duplicatedGmbBizList);

    const duplicatedAccountLocations = Object.keys(cidMap).filter(k => cidMap[k].accountLocations && cidMap[k].accountLocations.length > 1).map(k => cidMap[k].accountLocations);
    console.log('duplicatedAccountLocations', duplicatedAccountLocations);

    const duplicatedRestaurants = Object.keys(cidMap).filter(k => cidMap[k].restaurants && cidMap[k].restaurants.length > 1).map(k => cidMap[k].restaurants);
    console.log('duplicatedRestaurants', duplicatedRestaurants);

    const qmenuIdBizListMap = {};
    gmbBizList.map(biz => {
      if (biz.qmenuId) {
        qmenuIdBizListMap[biz.qmenuId] = qmenuIdBizListMap[biz.qmenuId] || [];
        qmenuIdBizListMap[biz.qmenuId].push(biz);
      }
    });

    const multipleBizList = Object.keys(qmenuIdBizListMap).filter(k => qmenuIdBizListMap[k].length > 1);
    console.log(multipleBizList);

    // const notMatchedBizList = [];
    // const matchedBizList = [];

    // gmbBizList.map(biz => {
    //   const matchedRestaurants = restaurants.filter(r => r._id === biz.qmenuId || (r.googleListing && r.googleListing.cid === biz.cid));
    //   if (matchedRestaurants.length > 0) {
    //     matchedBizList.push(biz);
    //   } else {
    //     notMatchedBizList.push(biz);
    //   }
    // });

    // console.log('matchedBizList', matchedBizList);
    // console.log('notMatchedBizList', notMatchedBizList);


  }

}

