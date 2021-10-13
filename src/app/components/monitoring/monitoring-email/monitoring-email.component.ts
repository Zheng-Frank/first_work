import {Component, OnInit, ViewChild} from '@angular/core';
import {ApiService} from '../../../services/api.service';
import {environment} from '../../../../environments/environment';
import {GlobalService} from '../../../services/global.service';
import {ModalComponent} from '@qmenu/ui/bundles/qmenu-ui.umd';
import {AlertType} from '../../../classes/alert-type';

enum EntityTypes {
  Restaurant= 'restaurant',
  Customer = 'customer'
}

@Component({
  selector: 'app-monitoring-email',
  templateUrl: './monitoring-email.component.html',
  styleUrls: ['./monitoring-email.component.css']
})
export class MonitoringEmailComponent implements OnInit {
  @ViewChild('customerModal') customerModal: ModalComponent;
  myColumnDescriptors = [
    {label: 'Entity Type'},
    {label: 'Entity Name'},
    {label: 'Email'},
    {label: 'Type'}
  ];
  restaurants = [];
  list = [];
  filtered = [];
  entityType = '';
  editing = {} as { type: string, id: string, email: string };
  edited = '';
  emailRestaurantDict = {};
  emailCustomerDict = {};
  customerInfo = {};

  constructor(private _api: ApiService, private _global: GlobalService) {
  }

  ngOnInit() {
  }

  get entityTypes() {
    return EntityTypes;
  }

  edit(type, id, email) {
    this.edited = email;
    this.editing = {id, type, email};
  }

  async save() {
    let {type, id, email} = this.editing;
    if (type === 'customer') {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=customer', [
        {
          old: {_id: id}, new: {_id: id, email: this.edited}
        }
      ]).toPromise();
      this.emailCustomerDict[this.edited] = this.emailCustomerDict[email];
      delete this.emailCustomerDict[email];
      this._global.publishAlert(AlertType.Success, 'Success');
    } else if (type === 'restaurant') {
      let [rt] = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'restaurant',
        query: {_id: {$oid: id}},
        projection: {channels: 1},
        limit: 1
      }).toPromise();
      rt.channels.forEach(ch => {
        if (ch.type === 'Email' && ch.value === email) {
          ch.value = this.edited;
        }
      });
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [
        {
          old: {_id: id}, new: {_id: id, channels: rt.channels}
        }
      ]).toPromise();
      this.emailRestaurantDict[this.edited] = this.emailRestaurantDict[email];
      delete this.emailRestaurantDict[email];
      this._global.publishAlert(AlertType.Success, 'Success');
    }
    this.cancel();
    this.list = this.list.filter(x => this.emailCustomerDict[x.email] || this.emailRestaurantDict[x.email]);
    this.filter();
  }

  cancel() {
    this.edited = '';
    this.editing = {} as { type: string, id: string, email: string };
  }

  getEntityIcon(type) {
    return {
      restaurant: 'utensils',
      customer: 'user'
    }[type] || 'question';
  }

  async showCustomer(customerId) {
    let [customer] = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'customer',
      query: {_id: {$oid: customerId}},
      limit: 1
    }).toPromise();
    this.customerInfo = customer;
    this.customerModal.show();
  }

  filter() {
    if (this.entityType) {
      this.filtered = this.list.filter(x => x.entityType === this.entityType);
    } else {
      this.filtered = this.list;
    }
  }

  async getRTs() {
    const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      aggregate: [
        {
          $project: {
            name: 1,
            channels: {
              $filter: {
                input: '$channels',
                as: 'ch',
                cond: {
                  $and: [
                    {$eq: ['$$ch.type', 'Email']},
                    {
                      '$anyElementTrue': [
                        {
                          '$ifNull': [
                            {
                              '$map': {
                                'input': '$$ch.notifications',
                                'as': 'item',
                                'in': {
                                  '$eq': ['$$item', 'Order']
                                }
                              }
                            },
                            [false]
                          ]
                        }
                      ]
                    }
                  ]
                }
              }
            }
          }
        },
        {$match: {'channels.0': {$exists: true}}},
        {
          $project: {
            name: 1,
            emails: {
              $map: {
                input: '$channels',
                as: 'ch',
                in: '$$ch.value'
              }
            }
          }
        }
      ],
      limit: 20000
    }).toPromise();
    restaurants.forEach(({_id, name, emails}) => {
      emails.forEach(email => {
        this.emailRestaurantDict[email] = {_id, name};
      });
    });
  }

  async getCustomers(emails: Set<string>) {
    const customers = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'customer',
      query: {email: {$in: Array.from(emails)}},
      projection: {firstName: 1, lastName: 1, email: 1},
      limit: 10000
    }).toPromise();
    customers.forEach(({_id, firstName, lastName, email}) => {
      this.emailCustomerDict[email] = {_id, name: firstName + ' ' + lastName};
    });
  }

  async query() {

    this.list = [];
    const badSnsRows = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'event',
      query: {
        'name': 'sns',
        'params.mail': {$exists: true},
        createdAt: {$gt: new Date().valueOf() - 1 * 24 * 3600000}
      },
      projection: {
        'params.notificationType': 1,
        'params.mail.destination': 1
      },
      limit: 30000
    }).toPromise();

    const badJobRows = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'job',
      query: {
        'name': 'send-order-email',
        'logs.status': 'error',
        createdAt: {$gt: new Date().valueOf() - 1 * 24 * 3600000}
      },
      projection: {
        'params.to': 1,
        'logs.errorDetails.message': 1
      },
      limit: 300
    }).toPromise();

    await this.getRTs();

    const emails = new Set([
      ...badSnsRows.map(x => x.params.mail.destination[0]),
      ...badJobRows.map(x => x.params.to)
    ]);
    await this.getCustomers(emails);
    emails.clear();

    badSnsRows.forEach(({params: {mail, notificationType}}) => {
      let [email] = mail.destination;
      if (emails.has(email)) {
        return;
      }
      emails.add(email);
      let rt = this.emailRestaurantDict[email];
      if (rt) {
        this.list.push({
          email, notificationType, entityId: rt._id, entityName: rt.name,
          entityType: EntityTypes.Restaurant
        });
        return;
      }
      let customer = this.emailCustomerDict[email];
      if (customer) {
        this.list.push({
          email, notificationType, entityId: customer._id,
          entityName: customer.name, entityType: EntityTypes.Customer
        });
      }
    });
    badJobRows.forEach(({params, logs}) => {
      let email = params.to;
      if (emails.has(email)) {
        return;
      }
      emails.add(email);
      let rt = this.emailRestaurantDict[email];
      if (rt) {
        this.list.push({
          email, notificationType: logs[0].errorDetails.message,
          entityType: EntityTypes.Restaurant,
          entityId: rt._id, entityName: rt.name
        });
        return;
      }
      let customer = this.emailCustomerDict[email];
      if (customer) {
        this.list.push({
          email, notificationType: logs[0].errorDetails.message,
          entityType: EntityTypes.Customer, entityId: customer._id,
          entityName: customer.name
        });
      }
    });

    this.filter();
  }
}
