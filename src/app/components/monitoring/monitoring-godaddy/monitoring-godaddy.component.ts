import { Component, OnInit } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";

@Component({
  selector: 'app-monitoring-godaddy',
  templateUrl: './monitoring-godaddy.component.html',
  styleUrls: ['./monitoring-godaddy.component.css']
})
export class MonitoringGodaddyComponent implements OnInit {

  // domainExample = {
  //   "createdAt": "2018-06-04T20:20:25.000Z",
  //   "domain": "101noodleexpresstogo.com",
  //   "domainId": 270000091,
  //   "expirationProtected": false,
  //   "expires": "2019-06-04T20:20:25.000Z",
  //   "holdRegistrar": false,
  //   "locked": true,
  //   "nameServers": null,
  //   "privacy": false,
  //   "renewAuto": true,
  //   "renewDeadline": "2019-07-19T18:20:23.000Z",
  //   "renewable": true,
  //   "status": "ACTIVE",
  //   "transferProtected": false
  // };
  redOnly = false;
  apiRequesting = false;
  rows = [];

  restaurants = [];
  gmbBizList = [];
  domains = [];
  folders = [];
  myColumnDescriptors = [

    {
      label: "Domain",
      paths: ['godaddy', 'domain'],
      sort: (a, b) => a.toLowerCase() > b.toLowerCase() ? 1 : (a.toLowerCase() < b.toLowerCase() ? -1 : 0)
    },
    {
      label: "Has Folder",
      paths: ['hasFolder'],
      sort: (a, b) => +a > +b ? 1 : (+a < +b ? -1 : 0)
    },
    {
      label: "qMenu Entry",
      paths: ['restaurant', 'name'],
      sort: (a, b) => a.toLowerCase() > b.toLowerCase() ? 1 : (a.toLowerCase() < b.toLowerCase() ? -1 : 0)
    },
    {
      label: "GMB Entry",
      paths: ['gmbBiz', 'name'],
      sort: (a, b) => a.toLowerCase() > b.toLowerCase() ? 1 : (a.toLowerCase() < b.toLowerCase() ? -1 : 0)
    },
    {
      label: "qMenu GMB Linked"
    },
    {
      label: "Status",
      paths: ['godaddy', 'status'],
      sort: (a, b) => a.toLowerCase() > b.toLowerCase() ? 1 : (a.toLowerCase() < b.toLowerCase() ? -1 : 0)
    },
    {
      label: "Age",
      paths: ['godaddy', 'createdAt'],
      sort: (a, b) => a.valueOf() > b.valueOf() ? 1 : (a.valueOf() < b.valueOf() ? -1 : 0)
    },
  ];

  constructor(private _api: ApiService, private _global: GlobalService) { }

  async ngOnInit() {
    await this.reload();
  }

  async reload() {
    const godaddyData = await this._api.get(environment.qmenuApiUrl + 'utils/godaddy-domains', {}).toPromise();
    this.domains = godaddyData.domains;
    this.folders = godaddyData.folders.domains;
    this.restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      projection: {
        name: 1,
        domain: 1
      },
      limit: 6000
    }).toPromise();
    this.gmbBizList = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbBiz',
      projection: {
        name: 1,
        qmenuWebsite: 1,
        qmenuId: 1
      },
      limit: 6000
    }).toPromise();

    // convert createdAt to Date object!
    this.domains.map(domain => domain.createdAt = new Date(domain.createdAt));

    this.rows = this.domains.map(domain => ({
      godaddy: domain,
      hasFolder: this.folders.some(folder => folder.toLowerCase() === domain.domain.toLowerCase()),
      restaurant: this.restaurants.filter(r => r.domain && r.domain.toLowerCase().indexOf(domain.domain.toLowerCase()) >= 0)[0] || {},
      gmbBiz: this.gmbBizList.filter(gmbBiz => gmbBiz.qmenuWebsite && gmbBiz.qmenuWebsite.toLowerCase().indexOf(domain.domain.toLowerCase()) >= 0)[0] || {},

    }));

    console.log(this.rows);
  }

  async sync() {
    this.apiRequesting = true;
    // gmbBiz --> restaurant
    // 1. gmbBiz has qmenuId, but restaurant doesn't have 
    const restaurantRowsToBeUpdated = this.rows.filter(row => row.gmbBiz.qmenuId && !row.restaurant.name).map(row => {
      const restaurant = this.restaurants.filter(r => r._id === row.gmbBiz.qmenuId)[0];
      return ({
        restaurant: restaurant,
        godaddy: row.godaddy
      })
    }).filter(row => row.restaurant);
    console.log(restaurantRowsToBeUpdated);

    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', restaurantRowsToBeUpdated.map(row => ({
      old: { _id: row.restaurant._id },
      new: { _id: row.restaurant._id, domain: row.godaddy.domain }
    }))).toPromise();
    // restaurant --> gmbBiz
    const gmbBizToBeUpdated = this.rows.filter(row => row.restaurant.name && !row.gmbBiz.name).map(row => {
      const gmbBiz = this.gmbBizList.filter(gmb => gmb.qmenuId === row.restaurant._id)[0];
      return ({
        gmbBiz: gmbBiz,
        godaddy: row.godaddy
      })
    }).filter(row => row.gmbBiz);
    console.log(gmbBizToBeUpdated);

    await this._api.patch(environment.adminApiUrl + 'generic?resource=gmbBiz', gmbBizToBeUpdated.map(row => ({
      old: { _id: row.gmbBiz._id },
      new: { _id: row.gmbBiz._id, qmenuWebsite: 'http://' + row.godaddy.domain }
    }))).toPromise();

    this.apiRequesting = false;
    await this.reload();
  }

  getFilteredRows() {
    if (this.redOnly) {
      return this.rows.filter(r => !r.hasFolder || r.gmbBiz.qmenuId !== r.restaurant._id || !r.gmbBiz.name || !r.restaurant.name || r.godaddy.status !== 'ACTIVE');
    } else {
      return this.rows;
    }
  }


}
