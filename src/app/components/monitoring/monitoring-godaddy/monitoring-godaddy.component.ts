import { Component, OnInit } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";

class Row {
  domain: any;
  folder: any;
  restaurant: any;
  gmbBiz: any;

}
@Component({
  selector: 'app-monitoring-godaddy',
  templateUrl: './monitoring-godaddy.component.html',
  styleUrls: ['./monitoring-godaddy.component.css']
})
export class MonitoringGodaddyComponent implements OnInit {

  // domainExample = {
  //   createdAt: "2018-04-30T05:36:28.000Z",
  //   domain: "168restaurantrichmond.com",
  //   expires: "2019-04-30T05:36:28.000Z",
  //   renewAuto: true,
  //   status: "ACTIVE",
  //   isSubdomain: (computed)
  // };

  // folderExample = {
  //   date: "Nov 10 11:48",
  //   files: ["css", "fonts", "images", "index.html", "js"],
  //   hasIndex: (computed!)
  //   name: "101noodleexpresstogo.com"
  // }

  apiRequesting = false;
  rows = [];
  filteredRows = [];

  gmbBizStatus;
  restaurantStatus;
  folderStatus;
  domainFolder;
  domainStatus;
  domainType;

  myColumnDescriptors = [
    {
      label: "Domain",
      paths: ['domain', 'domain'],
      sort: (a, b) => {
        if (!a && !b) {
          return 0
        };
        if (!a) {
          return 0;
        }
        if (!b) {
          return 1;
        }
        return a.toLowerCase() > b.toLowerCase() ? 1 : (a.toLowerCase() < b.toLowerCase() ? -1 : 0);
      }
    },
    {
      label: "Domain Status",
      paths: ['domain', 'status'],
      // sort: (a, b) => a.toLowerCase() > b.toLowerCase() ? 1 : (a.toLowerCase() < b.toLowerCase() ? -1 : 0)
    },
    {
      label: "Age",
      paths: ['domain', 'createdAt'],
      // sort: (a, b) => a.valueOf() > b.valueOf() ? 1 : (a.valueOf() < b.valueOf() ? -1 : 0)
    },
    {
      label: "Type"
    },
    {
      label: "Folder",
      paths: ['folder', 'name'],
      // sort: (a, b) => +a > +b ? 1 : (+a < +b ? -1 : 0)
    },
    {
      label: "Modified",
      paths: ['folder', 'date'],
      // sort: (a, b) => +a > +b ? 1 : (+a < +b ? -1 : 0)
    },
    {
      label: "qMenu Entry",
      paths: ['restaurant', 'name'],
      // sort: (a, b) => a.toLowerCase() > b.toLowerCase() ? 1 : (a.toLowerCase() < b.toLowerCase() ? -1 : 0)
    },
    {
      label: "GMB Entry",
      paths: ['gmbBiz', 'name'],
      // sort: (a, b) => a.toLowerCase() > b.toLowerCase() ? 1 : (a.toLowerCase() < b.toLowerCase() ? -1 : 0)
    },
    {
      label: "Not Linked"
    },
    {
      label: "Index.html"
    },
  ];

  constructor(private _api: ApiService, private _global: GlobalService) { }

  async ngOnInit() {
    await this.reload();
  }

  async reload() {
    // load the last 
    const godaddyData = (await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'godaddy',
      sort: {
        createdAt: -1
      },
      limit: 1
    }).toPromise())[0];

    const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      projection: {
        name: 1,
        domain: 1
      },
      limit: 6000
    }).toPromise();

    const gmbBizList = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbBiz',
      projection: {
        name: 1,
        qmenuWebsite: 1,
        qmenuId: 1
      },
      limit: 6000
    }).toPromise();

    // convert createdAt to Date object!
    godaddyData.domains.map(domain => {
      domain.createdAt = new Date(domain.createdAt);
    });
    godaddyData.folders.map(folder => {
      folder.date = new Date(folder.date);
      folder.hasIndex = folder.files.some(f => f === 'index.html')
    });

    // create rows!
    this.rows.length = 0;

    // create implied subdomains!
    godaddyData.folders.filter(folder => folder.name.indexOf('.') < 0).map(folder => {
      const subdomain = { domain: folder.name + '.qmenu.us', isSubdomain: true, createdAt: new Date(folder.date) };
      godaddyData.domains.push(subdomain);
    });

    // 1. every domain deserves its own row
    godaddyData.domains.map(domain => {
      // find and remove folder!
      let folder;
      for (let i = godaddyData.folders.length - 1; i >= 0; i--) {

        if (godaddyData.folders[i].name + '.qmenu.us' === domain.domain || godaddyData.folders[i].name.toLowerCase() === domain.domain.toLowerCase()) {
          folder = godaddyData.folders[i];
          godaddyData.folders.splice(i, 1);
          break;
        }
      }

      let restaurant;
      for (let i = restaurants.length - 1; i >= 0; i--) {
        if (restaurants[i].domain && restaurants[i].domain.toLowerCase() === domain.domain.toLowerCase()) {
          restaurant = restaurants[i];
          restaurants.splice(i, 1);
          break;
        }
      }

      let gmbBiz;
      for (let i = gmbBizList.length - 1; i >= 0; i--) {
        if (gmbBizList[i].qmenuWebsite && gmbBizList[i].qmenuWebsite.toLowerCase().indexOf(domain.domain.toLowerCase()) >= 0) {
          gmbBiz = gmbBizList[i];
          gmbBizList.splice(i, 1);
          break;
        }
      }

      const row = {
        domain: domain,
        folder: folder,
        restaurant: restaurant,
        gmbBiz: gmbBiz
      };
      this.rows.push(row);
    });

    // second rounds: folders, without paired domains (won't happen because all folders become subdomain?)
    godaddyData.folders.map(folder => {
      const row = {
        folder: folder
      };
      this.rows.push(row);
    });

    console.log('restaurant left: ', restaurants.length);
    // third round: non-matched restaurants
    restaurants.map(r => {
      let gmbBiz;
      for (let i = gmbBizList.length - 1; i >= 0; i--) {
        if (gmbBizList[i].qmenuId === r._id) {
          gmbBiz = gmbBizList[i];
          gmbBizList.splice(i, 1);
          break;
        }
      }
      const row = {
        restaurant: r,
        gmbBiz: gmbBiz
      };
      this.rows.push(row);
    });

    console.log('gmbBiz left: ', gmbBizList.length);
    // forth round: only gmbBiz
    gmbBizList.map(gmbBiz => {
      const row = {
        gmbBiz: gmbBiz
      };
      this.rows.push({ row });
    });

    this.filter();
  }

  async sync() {
    // this.apiRequesting = true;
    // // gmbBiz --> restaurant
    // // 1. gmbBiz has qmenuId, but restaurant doesn't have 
    // const restaurantRowsToBeUpdated = this.rows.filter(row => row.gmbBiz.qmenuId && !row.restaurant.name).map(row => {
    //   const restaurant = this.restaurants.filter(r => r._id === row.gmbBiz.qmenuId)[0];
    //   return ({
    //     restaurant: restaurant,
    //     godaddy: row.godaddy
    //   })
    // }).filter(row => row.restaurant);
    // console.log(restaurantRowsToBeUpdated);

    // await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', restaurantRowsToBeUpdated.map(row => ({
    //   old: { _id: row.restaurant._id },
    //   new: { _id: row.restaurant._id, domain: row.godaddy.domain }
    // }))).toPromise();
    // // restaurant --> gmbBiz
    // const gmbBizToBeUpdated = this.rows.filter(row => row.restaurant.name && !row.gmbBiz.name).map(row => {
    //   const gmbBiz = this.gmbBizList.filter(gmb => gmb.qmenuId === row.restaurant._id)[0];
    //   return ({
    //     gmbBiz: gmbBiz,
    //     godaddy: row.godaddy
    //   })
    // }).filter(row => row.gmbBiz);
    // console.log(gmbBizToBeUpdated);

    // await this._api.patch(environment.adminApiUrl + 'generic?resource=gmbBiz', gmbBizToBeUpdated.map(row => ({
    //   old: { _id: row.gmbBiz._id },
    //   new: { _id: row.gmbBiz._id, qmenuWebsite: 'http://' + row.godaddy.domain }
    // }))).toPromise();

    // this.apiRequesting = false;
    // await this.reload();
  }

  filter() {
    this.filteredRows = this.rows;

    switch (this.domainType) {
      case 'normal':
        this.filteredRows = this.filteredRows.filter(row => row.domain && row.domain.status);
        break;
      case 'subdomain':
        this.filteredRows = this.filteredRows.filter(row => row.domain && !row.domain.status);
        break;
      case 'no domain':
        this.filteredRows = this.filteredRows.filter(row => !row.domain);
        break;
      default:
        break;
    }

    switch (this.domainStatus) {
      case 'ACTIVE':
        this.filteredRows = this.filteredRows.filter(row => row.domain && row.domain.status === 'ACTIVE');
        break;
      case 'NON-ACTIVE':
        this.filteredRows = this.filteredRows.filter(row => row.domain && row.domain.status !== 'ACTIVE');
        break;
      default:
        break;
    }

    switch (this.domainFolder) {
      case 'has folder':
        this.filteredRows = this.filteredRows.filter(row => row.domain && row.folder);
        break;
      case 'no folder':
        this.filteredRows = this.filteredRows.filter(row => row.domain && !row.folder);
        break;
      default:
        break;
    }

    switch (this.folderStatus) {
      case 'missing index.html':
        this.filteredRows = this.filteredRows.filter(row => row.folder && !row.folder.hasIndex);
        break;
      default:
        break;
    }

    switch (this.restaurantStatus) {
      case 'no domain':
        this.filteredRows = this.filteredRows.filter(row => row.restaurant && !row.domain);
        break;
      case 'has domain':
        this.filteredRows = this.filteredRows.filter(row => row.restaurant && row.domain);
        break;
      default:
        break;
    }

    switch (this.gmbBizStatus) {
      case 'no domain':
        this.filteredRows = this.filteredRows.filter(row => row.gmbBiz && !row.domain);
        break;
      case 'has domain':
        this.filteredRows = this.filteredRows.filter(row => row.gmbBiz && row.domain);
        break;
      default:
        break;
    }
    // ;

  }

  highlighted(row) {
    return !row.domain || !row.folder || !row.gmbBiz || !row.restaurant || !row.folder.hasIndex || row.domain.status !== 'ACTIVE' || row.restaurant._id !== row.gmbBiz.qmenuId;
  }

  async diagnose() {
    alert('Script will be running in background for about 10 minutes. Refresh this page after 10 minutes to get the last state of Godaddy account.');
    this.apiRequesting = true;
    const addedJobs = await this._api.post(environment.qmenuApiUrl + 'events/add-jobs', [{
      "name": "diagnose-godaddy",
      "params": {}
    }]).toPromise();
    this.apiRequesting = false;
  }

}
