import { Component, OnInit } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";
import { GmbBiz } from '../../../classes/gmb/gmb-biz';

@Component({
  selector: 'app-my-restaurant',
  templateUrl: './my-restaurant.component.html',
  styleUrls: ['./my-restaurant.component.css']
})
export class MyRestaurantComponent implements OnInit {

  myList = [];

  filteredList = [];

  now = new Date();

  gmbOwnership;
  googleListingOwner;
  outstandingTask;


  myColumnDescriptors = [
    {
      label: "Name",
      paths: ['restaurant', 'name'],
      sort: (a, b) => a.toLowerCase() > b.toLowerCase() ? 1 : (a.toLowerCase() < b.toLowerCase() ? -1 : 0)
    },
    {
      label: "Score",
      paths: ['gmbBiz', 'score'],
      sort: (a, b) => (a || 0) - (b || 0)
    },
    {
      label: "Created",
      paths: ['restaurant', 'createdAt'],
      sort: (a, b) => a.valueOf() - b.valueOf()
    },
    {
      label: "GMB",
      paths: ['gmbBiz'],
      sort: (a, b) => {
        if (a === b) {
          return 0;
        }
        if (!a) {
          return -1;
        }
        if (!b) {
          return 1;
        }
        if (a.getAccountEmail() > b.getAccountEmail()) {
          return 1;
        }
        if (a.getAccountEmail() < b.getAccountEmail()) {
          return -1;
        }
        return 0;
      }
    },
    {
      label: "Website"
    },
    {
      label: "Tasks"
    }
  ];

  constructor(private _api: ApiService, private _global: GlobalService) { }

  myRestaurants = [];
  async ngOnInit() {
    const myUsername = this._global.user.username;
    const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      projection: {
        name: 1,
        'rateSchedules.agent': 1,
        'googleAddress.formatted_address': 1,
        createdAt: 1
      },
      limit: 8000
    }).toPromise();

    const myRestaurants = restaurants.filter(r => (r.rateSchedules || []).some(rs => (rs.agent || '').toLowerCase() === myUsername));

    const batchSize = 200;
    const batchedRestaurants = Array(Math.ceil(myRestaurants.length / batchSize)).fill(0).map((i, index) => myRestaurants.slice(index * batchSize, (index + 1) * batchSize));

    const myGmbBizList = [];

    for (let batch of batchedRestaurants) {
      const gmbBizList = await this._api.get(environment.adminApiUrl + 'generic', {
        resource: 'gmbBiz',
        query: {
          qmenuId: { $in: batch.map(r => r._id) }
        },
        limit: batchSize
      }).toPromise();
      myGmbBizList.push(...gmbBizList.map(gmb => new GmbBiz(gmb)));
    }
    // query open Tasks

    const openTasks = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'task',
      query: {
        result: null
      },
      projection: {
        name: 1,
        "relatedMap.gmbBizId": 1,
        resultAt: 1,
        createdAt: 1,
        scheduledAt: 1
      },
      limit: 2000
    }).toPromise();

    const restaurantMap = {};
    const gmbBizMap = {};

    myRestaurants.map(r => { restaurantMap[r._id] = { restaurant: r }; restaurantMap[r._id].outstandingTasks = []; r.createdAt = new Date(r.createdAt); });
    myGmbBizList.map(gmbBiz => restaurantMap[gmbBiz.qmenuId].gmbBiz = gmbBiz);

    myGmbBizList.map(gmb => gmbBizMap[gmb._id] = gmb);

    openTasks.map(task => {
      task.scheduledAt = new Date(task.scheduledAt);
      const gmbBizId = (task.relatedMap || {}).gmbBizId;
      if (gmbBizMap[gmbBizId]) {
        restaurantMap[gmbBizMap[gmbBizId].qmenuId].outstandingTasks.push(task);
      }
    });

    this.myList = Object.values(restaurantMap);
    this.myList.sort((a, b) => a.restaurant.name > b.restaurant.name ? 1 : (a.restaurant.name < b.restaurant.name ? -1 : 0));

    this.filter();
  }

  filter() {
    this.filteredList = this.myList;
    switch (this.gmbOwnership) {
      case 'qmenu':
        this.filteredList = this.filteredList.filter(b => b.gmbBiz && b.gmbBiz.getAccountEmail());
        break;
      case 'NOT qmenu':
        this.filteredList = this.filteredList.filter(b => !b.gmbBiz || !b.gmbBiz.getAccountEmail());
        break;
      default:
        break;
    }

    switch (this.googleListingOwner) {
      case 'qmenu':
        this.filteredList = this.filteredList.filter(b => b.gmbBiz && b.gmbBiz.gmbOwner === 'qmenu');
        break;

      case 'NOT qmenu':
        this.filteredList = this.filteredList.filter(b => !b.gmbBiz || b.gmbBiz.gmbOwner !== 'qmenu');
        break;

      default:
        break;
    }

    switch (this.outstandingTask) {
      case 'exist':
        this.filteredList = this.filteredList.filter(b => b.outstandingTasks && b.outstandingTasks.length > 0);
        break;
      case 'non-exist':
        this.filteredList = this.filteredList.filter(b => !b.outstandingTasks || b.outstandingTasks.length === 0);
        break;
      default:
        break;
    }

  }

  getEncodedGoogleSearchString(gmbBiz: GmbBiz) {
    if (gmbBiz) {
      return encodeURI(gmbBiz.name + ' ' + gmbBiz.address);
    }
  }

  getGmbCount() {
    return this.filteredList.filter(l => l.gmbBiz && l.gmbBiz.getAccountEmail()).length;
  }

  getLogo(gmbBiz: GmbBiz) {
    if (gmbBiz.bizManagedWebsite && gmbBiz.gmbOwner === 'qmenu') {
      return GlobalService.serviceProviderMap['qmenu-gray'];
    }
    return GlobalService.serviceProviderMap[gmbBiz.gmbOwner];
  }

  getTaskClass(task) {
    const day = 24 * 3600 * 1000;
    const diff = this.now.valueOf() - task.scheduledAt.valueOf();
    if (diff > day) {
      return 'danger';
    }

    if (diff > 0) {
      return 'warning';
    }

    if (diff > -1 * day) {
      return 'info';
    }
    return 'success';
  }

}
