import { Component, OnInit } from "@angular/core";
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";
import { zip, Observable, from } from "rxjs";
import { mergeMap } from "rxjs/operators";
import { Restaurant, Hour } from '@qmenu/ui';
import { Invoice } from "../../../classes/invoice";
import { validateStyleParams } from "@angular/animations/browser/src/util";
@Component({
  selector: "app-db-scripts",
  templateUrl: "./db-scripts.component.html",
  styleUrls: ["./db-scripts.component.scss"]
})
export class DbScriptsComponent implements OnInit {
  removingOrphanPhones = false;
  constructor(private _api: ApiService, private _global: GlobalService) { }

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

  migratePhones() {
    // let's batch 5 every time
    const batchSize = 100;
    let myRestaurants;
    this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query: {
        phones: { $exists: false },
      },
      projection: {
        name: 1
      },
      limit: batchSize
    }).pipe(mergeMap(restaurants => {
      myRestaurants = restaurants;
      return this._api
        .get(environment.qmenuApiUrl + "generic", {
          resource: "phone",
          query: {
            restaurant: { $in: restaurants.map(r => ({ $oid: r._id })) },
          },
          limit: batchSize
        });
    })).pipe(mergeMap(phones => {
      if (phones.length === 0) {
        throw 'No referenced phones found for restaurants ' + myRestaurants.map(r => r.name).join(', ');
      }
      const myRestaurantsOriginal = JSON.parse(JSON.stringify(myRestaurants));
      const myRestaurantsChanged = JSON.parse(JSON.stringify(myRestaurants));

      const rMap = {};
      myRestaurantsChanged.map(r => rMap[r._id] = r);

      phones.map(p => {
        let r = rMap[p.restaurant];
        r.phones = r.phones || [];
        r.phones.push(p);
      });

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
        balance: { $exists: false }
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

  migrateEmailAndPhones() {
    // faxable -> {Fax, Order}
    // callable -> {Phone, Order}
    // textable -> {SMS, Order}
    // (nothing) -> {Phone, Business}
    // email --> split(, or ;) --> {Email, Order}

    // let's batch 5 every time
    const batchSize = 3000;
    let myRestaurants;
    this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query: {
        $or: [
          { email: { $exists: true } },
          { phones: { $exists: true } },
        ]
      },
      projection: {
        channels: 1,
        name: 1,
        email: 1,
        phones: 1
      },
      limit: batchSize
    }).pipe(mergeMap(restaurants => {
      myRestaurants = restaurants;
      const oldNewPairs = [];
      restaurants.map(restaurant => {
        const oldChannels = restaurant.channels || [];
        const newChannels = (restaurant.channels || []).slice(0); // a clone
        // let's handle emails
        (restaurant.email || '').replace(/\s/g, '').split(',').join(';').split(';').filter(email => email).map(email => {
          if (email && email.indexOf('@') >= 0 && !newChannels.some(c => c.value.toLowerCase() === email.toLowerCase())) {
            newChannels.push({
              type: 'Email',
              value: email.toLowerCase(),
              notifications: ['Order']
            });
          }
        });

        //lets handle phones
        (restaurant.phones || []).map(phone => {
          const phoneMap = {
            faxable: 'Fax',
            callable: 'Phone',
            textable: 'SMS'
          };

          Object.keys(phoneMap).map(key => {
            if (phone[key] && !newChannels.some(c => c.value === phone.phoneNumber && c.notifications && c.notifications.indexOf('Order') >= 0)) {
              newChannels.push({
                type: phoneMap[key],
                value: phone.phoneNumber,
                notifications: ['Order']
              });
            }
          });

          // if business type and not any of the above
          if (!phone.faxable && !phone.textable && !phone.callable && phone.type === 'Business' && !newChannels.some(c => c.value === phone.phoneNumber && c.channels && c.channels.indexOf('Business') >= 0)) {
            newChannels.push({
              type: 'Phone',
              value: phone.phoneNumber,
              notifications: ['Business']
            });
          }

          // if none is selected:
          if (!phone.faxable && !phone.textable && !phone.callable && phone.type !== 'Business' && !newChannels.some(c => c.value === phone.phoneNumber && c.notifications && c.notifications.length === 0)) {
            newChannels.push({
              type: 'Phone',
              value: phone.phoneNumber,
              notifications: []
            });
          }

        });

        // let's lint newChannels: same type and value, then merge/union notifications!
        for (let i = newChannels.length - 1; i >= 1; i--) {
          for (let j = 0; j < i; j++) {
            if (newChannels[i].value === newChannels[j].value && newChannels[i].type === newChannels[j].type) {
              newChannels.splice(j, 1);
              break;
            }
          }
        }

        oldNewPairs.push({
          old: {
            _id: restaurant._id,
            channels: oldChannels
          },
          new: {
            _id: restaurant._id,
            channels: newChannels
          }
        });
      });
      console.log(oldNewPairs);
      return this._api
        .patch(
          environment.qmenuApiUrl + "generic?resource=restaurant",
          oldNewPairs
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
    //find bizManagedWebsite
    const havingBizWebsite = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbBiz',
      query: {
        bizManagedWebsite: { $exists: 1 }
      },
      projection: {
        name: 1,
        bizManagedWebsite: 1,
        useBizWebsite: 1
      },
      limit: 5000
    }).toPromise();
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
    console.log(havingBizWebsite);
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
        gmbOwnerships: { $slice: -4 }
      },
      limit: 5000
    }).toPromise();

    // group by place_id (or phone?)
    const placeIdMap = {};
    bizList.map(b => {
      placeIdMap[b.place_id] = placeIdMap[b.place_id] || [];
      placeIdMap[b.place_id].push(b);
    });
    console.log(placeIdMap);
    const sortedValues = Object.keys(placeIdMap).map(k => placeIdMap[k]).sort((a, b) => b.length - a.length);

    console.log(sortedValues);
    // keep the one with active gmbOwnerships!
    for (let values of sortedValues) {
      if (values.length > 1) {
        console.log('duplicated', values);
        const localSortedValues = values.sort((v1, v2) => {
          if(!v1.gmbOwnerships) {
            console.log(v1)
          }
          const published1 = v1.gmbOwnerships && (v1.gmbOwnerships[v1.gmbOwnerships.length - 1] || {}).email ? 1 : 0;
          const possessedAt1 = v1.gmbOwnerships && (v1.gmbOwnerships[v1.gmbOwnerships.length - 1] || {}).possessedAt;
          const published2 = v2.gmbOwnerships && (v2.gmbOwnerships[v2.gmbOwnerships.length - 1] || {}).email ? 1 : 0;
          const possessedAt2 = v2.gmbOwnerships && (v2.gmbOwnerships[v2.gmbOwnerships.length - 1] || {}).possessedAt;

          // only one published
          if (published1 != published2) {
            return published2 - published1;
          }

          // both published, take the last published one
          if (published1 === 1) {
            return new Date(possessedAt2).valueOf() - new Date(possessedAt1).valueOf();
          }
          // keep whoever gets more history
          return (v2.gmbOwnerships ? v2.gmbOwnerships.length : 0) - (v1.gmbOwnerships? v1.gmbOwnerships.length : 0);
        });

        // 1. get FIRST _id
        // 2. get _ids of all others
        // 3. go-though tasks of gmbBizId of relatedMap, replace with FIRST _id
        // 4. delete all others!
        const firstId = localSortedValues[0]._id;
        const otherIds = localSortedValues.map(b => b._id).slice(1);

        const tasksToBeUpdated = await this._api.get(environment.adminApiUrl + 'generic', {
          resource: 'task',
          query: {
            "relatedMap.gmbBizId": { $in: otherIds }
          },
          projection: {
            name: 1
          },
          limit: 200
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
                gmbBizId: firstId
              }
            },
          }))).toPromise();
          console.log('patched tasks: ', tasksToBeUpdated);
        }

        // delete ALL the redudant ids
        await this._api.delete(environment.adminApiUrl + 'generic', {
          resource: 'gmbBiz',
          ids: otherIds
        }).toPromise();

      }
    }
  }

  async fixMissingBusinessPhones() {
    const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      projection: {
        name: 1,
        phones: 1,
        "googleAddress.formatted_address": 1
      },
      limit: 10000
    }).toPromise();

    console.log(restaurants);
    const restaurantsMissingBizPhones = restaurants.filter(r => r.phones && !r.phones.some(p => p.type === 'Business'));

    console.log(restaurantsMissingBizPhones);

    for (let r of restaurantsMissingBizPhones) {
      try {
        const crawledResult = await this._api.get(environment.adminApiUrl + "utils/scan-gmb", { q: `${r.name} ${r.googleAddress.formatted_address}` }).toPromise();
        console.log(crawledResult);
        if (crawledResult.phone) {
          // inject phone!
          // update qmenuId!
          const existingPhones = r.phones || [];
          const clonedPhones = existingPhones.slice(0);
          clonedPhones.push({
            phoneNumber: crawledResult.phone,
            type: 'Business'
          });

          await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [
            {
              old: { _id: r._id, phones: existingPhones },
              new: { _id: r._id, phones: clonedPhones }
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
      limit: 4000
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
        limit: 4000
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
      limit: 4000
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
    //     "phones.phoneNumber": 1,
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

}
