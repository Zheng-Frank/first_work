// import { ViewChild } from '@angular/core';
import { filter } from 'rxjs/operators';
import { environment } from './../../../../environments/environment';
import { ApiService } from 'src/app/services/api.service';
import { Customer } from '@qmenu/ui';
import { Component, OnInit, NgZone } from '@angular/core';
import { ModalComponent } from '@qmenu/ui/components/modal/modal.component';

@Component({
  selector: 'app-banned-customers',
  templateUrl: './banned-customers.component.html',
  styleUrls: ['./banned-customers.component.css']
})
export class BannedCustomersComponent implements OnInit {

  //pagination = false;
  /**
   *Customer Name
    ID
    Number of orders
    Ban/unban

   *
   * @memberof BannedCustomersComponent
   */
  // @ViewChild('banModal') banModal: ModalComponent;
  pagination = true;
  myColumnDescriptors = [
    {
      label: 'Customer Name'
    },
    {
      label: "ID",
    },
    {
      label: 'Number of orders',
    },
    {
      label: 'Ban/unban',
    }
  ];
  bannedCustomerRows: Array<bannedCustomer> = new Array<bannedCustomer>();;
  constructor(private _api: ApiService) {

  }

  ngOnInit() {
    // console.log(this.bannedCustomerRows);
    this.populateBannedCustomer();
  }
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
  /**
   *  this function is used to populate unbanned customer 
   * 
   * @memberof BannedCustomersComponent
   */
  async populateBannedCustomer() {
    // const bannedCustomers = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
    //   resource: 'customer',
    //   query: { bannedReasons: { $exists: 1 } },
    //   projection: {
    //     email: 1,
    //     socialId: 1,
    //     phone: 1,
    //     bannedReasons: 1
    //   },
    // }, 1000000); 
    // console.log(bannedCustomers);

    // const customers = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
    //   resource: 'customer',
    //   query: {
    //     _id: {
    //       // $oid: { $in: ["5beee8073b9e421300a59f23"] }
    //       _id: {$in: [{$oid: "5beee8073b9e421300a59f23"}]}
    //     }
    //   },
    //   projection: {
    //     firstName: 1,
    //     lastName: 1,
    //     _id: 1
    //   },
    //   sort: {
    //     _id: 1
    //   }
    // }, 100);
    // console.log("110行:cumstomer:" + JSON.stringify(customers));

    const blackQuery = {
      reasons: {
        $exists: true
      },
      disabled: {
        $ne: true
      } //This is means that blackList is reused;
      ,
      type: 'CUSTOMER'
    }
    const blacklist = await this._api.get(`${environment.qmenuApiUrl}generic`, {
      resource: 'blacklist',
      query: blackQuery,
      projection: {
        orders: 1,
        value: 1,
        reasons: 1
      },
      limit: 10000
    }).toPromise();
    if (blacklist.length > 0) {
      const cusomterIds = blacklist.map(bl => bl.value);

      // const customers = await this._api.get(`${environment.appApiUrl}app`,{
      //   resource: 'customer',
      //         query: {
      //           '_id': {
      //             $oid: { $in: cusomterIds }
      //           }
      //         },
      //         projection: {
      //           firstName:1,
      //           lastName:1,
      //           _id:1
      //         },
      //         sort: {
      //           _id: 1
      //         }
      //       }).toPromise();
      //console.log("cusomterIds:"+JSON.stringify(cusomterIds));
      const orders = await this._api.get(`${environment.qmenuApiUrl}generic`, {
        resource: 'order',
        query: {
          'customerObj._id': {
            $in: cusomterIds
          }
        },
        projection: {
          customerObj: 1
        },
        sort: {
          _id: 1
        },
        limit: 10000
      }).toPromise();
      //防止流动的元素流进  this.bannedCustomerRows（Prevent flowing elements from flowing in this.bannedCustomerRows）
      this.bannedCustomerRows.splice(0, this.bannedCustomerRows.length);
      blacklist.forEach((bl) => {
        console.log(JSON.stringify(bl));
        const customer_name = bl.orders[0].customerObj && bl.orders[0].customerObj.firstName != null ? bl.orders[0].customerObj.firstName + ' ' + bl.orders[0].customerObj.lastName : 'xxx';
        // bl.orders[0].customerObj.firstName+' '+bl.orders[0].customerObj.lastName;
        // customers.filter((c) => {
        //   if (c._id == bl.value)
        //     customer_name = c.firstName + '' + c.lastName;
        // });
        const customer_id = bl.value;
        const orders_number = orders.filter(o => o.customerObj._id === bl.value).length || 0;
        let orders_ban = false;
        if (bl.reasons && bl.reasons.length > 0) {
          orders_ban = true;
        }
        this.bannedCustomerRows.push(new bannedCustomer(customer_name, customer_id, orders_number, orders_ban));
      });

    } else {
      this.bannedCustomerRows.splice(0, this.bannedCustomerRows.length);
    }
  }
  /**
 *  this function is used to  unban customer 
 * 
 * @memberof BannedCustomersComponent
 */
  async Unban(row) {
    if (!row) {
      alert("No customer found");
      return;
    }

    const existingBlackList = await this._api.get(`${environment.qmenuApiUrl}generic`, {
      resource: 'blacklist',
      query: {
        $or: [{
          value: {
            $oid: row.customer_id
          }
        },
        {
          value: row.customer_id
        }],
        type: 'CUSTOMER'
      },
      projection: {
        _id: 1
      },
      limit: 100
    }).toPromise();
    console.log("existingBlackList:" + JSON.stringify(existingBlackList));
    // no reason is provided? disable them
    const enabledExistingblacklist = existingBlackList.filter(b => !b.disabled);
    console.log("enabledExistingblacklist:" + JSON.stringify(enabledExistingblacklist));
    for (let item of enabledExistingblacklist) {
      // ${environment.qmenuApiUrl}generic 
      await this._api.patch(`${environment.appApiUrl}app`, {
        resource: 'blacklist',
        query: {
          _id: {
            $oid: item._id
          }
        },
        op: "$set",//更新 update
        field: "disabled",
        value: true
      }).toPromise();
    }
    this.populateBannedCustomer();
  }

}
/**
 * 自定义一个类，用于承载格式化的数据
 *
Customize a class to carry formatted data
 * @export
 * @class bannedCustomer
 * @extends {Customer}
 */
export class bannedCustomer extends Customer {
  private customer_name: string;
  private customer_id: string;
  private orders_number: number;
  private orders_ban: boolean;
  constructor(customer_name: string,
    customer_id: string,
    orders_number: number,
    orders_ban: boolean) {
    super();
    this.customer_name = customer_name;
    this.customer_id = customer_id;
    this.orders_number = orders_number;
    this.orders_ban = orders_ban;
  }

}
