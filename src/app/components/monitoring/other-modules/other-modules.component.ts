import { Hour } from '@qmenu/ui';
import { environment } from 'src/environments/environment';
import { ApiService } from 'src/app/services/api.service';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-other-modules',
  templateUrl: './other-modules.component.html',
  styleUrls: ['./other-modules.component.css']
})
export class OtherModulesComponent implements OnInit {

  unconfirmed_orders_count:number=0;
  bad_hours_count:number=0;
  fax_problems_count:number=0;
  disabled_restaurant_count:number=0;
  email_problems_count:number=0;
  manage_Images_count:number=0;
  banned_customer_count:number=0;

  constructor(private _api:ApiService) { }

  ngOnInit() {
    this.countOfTheProblems();
  }
  /**
   * the use of this function:
   *count the quantity of the other modules'problems
   * @memberof OtherModulesComponent
   */
  countOfTheProblems(){
    this.countDisabledRestaurants();
    this.countUnconfirmOrders();
    this.countBadHours();
    this.countImages();
    this.countFailedEmails();
    this.countFaxProblems();
    this.countBannedCustomer();
  }
 /**
   *  this function is used to populate unbanned customer 
   * 
   * @memberof BannedCustomersComponent
   */
  async countBannedCustomer() {
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
        reasons:1
      },
      limit:10000
    }).toPromise();

    if (blacklist.length > 0) {
     this.banned_customer_count=blacklist.length;
    }
  }
   /**
   *  this function is used to populate fax problems
   * 
   * @memberof BannedCustomersComponent
   */
  async countFaxProblems() {
    const failedFaxEvents = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'event',
      query: {
        "name": "fax-status",
        "params.body.success": "false",
        "createdAt": { $gt: new Date().valueOf() - 1 * 24 * 3600000 }
      },
      projection: {
        "params.body": 1
      },
      limit: 30000
    }).toPromise();
    this.fax_problems_count=failedFaxEvents.length;
  }



  /**
 *  the use of this function:
 * count the quantity of email problems
 *
 * @memberof OtherModulesComponent
 */
  async countFailedEmails() {
    let badSnsEventRows=[];
    badSnsEventRows = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'event',
      query: {
        "name": "sns",
        "params.mail": { $exists: true },
        createdAt: { $gt: new Date().valueOf() - 1 * 24 * 3600000 }
      },
      projection: {
        "params.notificationType": 1,
        "params.mail.destination": 1
      },
      limit: 30000
    }).toPromise();

    const badJobRows = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'job',
      query: {
        "name": "send-order-email",
        "logs.status": "error",
        createdAt: { $gt: new Date().valueOf() - 1 * 24 * 3600000 }
      },
      projection: {
        "params.to": 1,
        "logs.errorDetails.message": 1
      },
      limit: 300
    }).toPromise();

    // fit badJobRows to badSnsEventRows (lazy)
    badJobRows.map(row => {
      const badRow = {
        params: {
          mail: {
            destination: [row.params.to]
          },
          notificationType: row.logs[0].errorDetails.message
        }
      };
      badSnsEventRows.push(badRow);
    });

    // distinct by email!
    for (let i = badSnsEventRows.length - 1; i > 0; i--) {
      if (badSnsEventRows.slice(0, i).some(row => row.params.mail.destination[0] === badSnsEventRows[i].params.mail.destination[0])) {
        badSnsEventRows.splice(i, 1);
      }
    }
    this.email_problems_count=badSnsEventRows.length;
  }

 /**
 *  the use of this function:
 * count the quantity of manage images
 *
 * @memberof OtherModulesComponent
 */
  async  countImages() {
    const rows = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'image',
      limit: 6000
    }).toPromise();
    this.manage_Images_count=rows.length;
  }
  /**
 *  the use of this function:
 * count the quantity of disabled restaurants
 *
 * @memberof OtherModulesComponent
 */
  async countDisabledRestaurants() {

    const restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
        resource: 'restaurant',
        query: {
            "disabled": true
        },

        projection: {
            name: 1,
            _id: 1,
            'googleAddress.formatted': 1,
            'rateSchedules':1,
            createdAt: 1,
            updatedAt: 1
        },
        sort: {
            createdAt: -1
        }
    }, 1000000)

  this.disabled_restaurant_count=restaurants.length;
    //restaurants.sort((r1, r2) => r2.createdAt.valueOf() - r1.createdAt.valueOf());
    // console.log('disabled restaurant', this.restaurants);
}
/**
 *  the use of this function:
 * count the quantity of unconfirmed orders
 *
 * @memberof OtherModulesComponent
 */
async countUnconfirmOrders() {
    const minutesAgo = new Date();
    minutesAgo.setMinutes(minutesAgo.getMinutes() - 300);

    // we DON'T need an accurate cut of day. Let's just pull the latest 3000
    const ordersWithSatuses = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'order',
      projection: {
        orderNumber: 1,
        "restaurantObj.name": 1,
        "restaurantObj._id": 1,
        "statuses.status": 1,
        "statuses.createdAt": 1,
        statuses: {
          $slice: -1
        },
        createdAt: 1,
        timeToDeliver: 1
      },
      sort: {
        createdAt: -1
      },
      limit: 8000
    }).toPromise();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const unconfirmedOrders = ordersWithSatuses.filter(o => new Date(o.createdAt).valueOf() > yesterday.valueOf() && new Date(o.createdAt).valueOf() < minutesAgo.valueOf() && o.statuses && o.statuses.length > 0 && o.statuses[o.statuses.length - 1].status === 'SUBMITTED');
    this.unconfirmed_orders_count= unconfirmedOrders.length;
    console.log('this.unconfirmed_orders_count'+this.unconfirmed_orders_count);
  }
/**
 *  the use of this function:
 * count the quantity of bad hours
 *
 * @memberof OtherModulesComponent
 */
async countBadHours() {
  // all restaurant stubs
  const allRestaurants = [];
  const batchSize = 3000;
  let skip = 0;
  while (true) {
    const batch = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      projection: {
        name: 1,
        "menus.hours": 1,
        "menus.name": 1,
        "googleAddress.formatted_address": 1,
        "googleAddress.timezone": 1
      },
      skip: skip,
      limit: batchSize
    }).toPromise();
    if (batch.length === 0) {
      break;
    }
    allRestaurants.push(...batch);
    skip += batchSize;
  }
  
  let rows = allRestaurants.map(r => {
    const badMenuAndHours = [];
    (r.menus || []).map(menu => (menu.hours || []).map(hour => {

      if (!hour) {
        const item = {
          menu: menu
        };
        badMenuAndHours.push(item);
      }
      try {
        let timeDiff = new Date(hour.fromTime).valueOf() - new Date(hour.toTime).valueOf();

        if (timeDiff >= 0) {
          badMenuAndHours.push({
            menu: menu,
            hour: new Hour(hour)
          })
        }
      } catch (error) {
        console.log(hour);
      }

    }));

    return {
      restaurant: r,
      badMenuAndHours: badMenuAndHours
    };
  }).filter(item => item.badMenuAndHours.length > 0);
   this.bad_hours_count=rows.length;
}


}








