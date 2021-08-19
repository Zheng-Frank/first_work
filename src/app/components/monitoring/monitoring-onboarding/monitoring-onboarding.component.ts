import { Menu } from '@qmenu/ui';
import { AlertType } from 'src/app/classes/alert-type';
import { User } from './../../../classes/user';
import { Component, OnInit } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { Log } from '../../../classes/log';
enum hideInvaidSalesTypes {
  All = 'Valid Sale?',
  ValidSales = 'Valid Sales',
  InvalidSales = 'Invalid Sales'
}

enum MenuTypes {
  All = 'Has Menu?',
  NoMenu = 'No Menu',
  HavingMenu = 'Having Menu'
}

@Component({
  selector: 'app-monitoring-onboarding',
  templateUrl: './monitoring-onboarding.component.html',
  styleUrls: ['./monitoring-onboarding.component.css']
})
export class MonitoringOnboardingComponent implements OnInit {

  salespeople = []; // filter by Sales people.
  salesperson = 'Salesperson...';

  hideInvalidSales = hideInvaidSalesTypes.All; // a flag to control whether hide restaurants of  invalid sales 
  havingGMB: boolean;
  isWarning: boolean;
  filterBy = MenuTypes.All;

  rows = []; // {restaurant, noMenu, noOrder, hasGmb, hadGmb}
  filteredRows = [];
  constructor(private _api: ApiService, private _global: GlobalService) { }

  now = new Date();
  ngOnInit() {
    this.populate();
  }

  async populate() {
    // all restaurant stubs
    let allRestaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        disabled: { $in: [null, false] }
      },
      projection: {
        name: 1,
        "googleAddress.formatted_address": 1,
        alias: 1,
        disabled: 1,
        "menus.disabled": 1,
        "googleListing.cid": 1,
        createdAt: 1,
        "rateSchedules": { $slice: -1 },
        logs: { $slice: -2 },
      }
    }, 4000);
    // get populate all sale agents   
    // restaurantIdsWith
    const validRestaurant = allRestaurants.filter(r => ((r.rateSchedules || [])[0] || {}).agent !== "invalid");
    const havingOrderRestaurantIdSet = new Set(await this._api.get(environment.legacyApiUrl + 'utilities/distinctOrderRestaurantIds').toPromise());
    const restaurantsWithoutValidMenusAndNotDisabled = validRestaurant.filter(r => !r.disabled && (!r.menus || r.menus.filter(menu => !menu.disabled).length === 0));
    const restaurantsWithoutAnyOrder = validRestaurant.filter(r => !havingOrderRestaurantIdSet.has(r._id));

    const dict = {};
    restaurantsWithoutValidMenusAndNotDisabled.map(r => dict[r._id] = { restaurant: r, noMenu: true });
    restaurantsWithoutAnyOrder.map(r => { dict[r._id] = dict[r._id] || { restaurant: r }; dict[r._id].noOrder = true; });

    const cids = Object.keys(dict).map(k => dict[k]).filter(r => r.restaurant.googleListing).map(r => r.restaurant.googleListing.cid);
    const gmbAccounts = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbAccount',
      // query: {
      //   "locations.cid": { $in: cids }
      // },
      projection: {
        "email": 1,
        "locations.cid": 1,
        "locations.status": 1,
        "locations.role": 1,
        "locations.appealId": 1,
      }
    }, 100);


    Object.keys(dict).map(k => {
      const row = dict[k];
      const accountAndStatuses = [];
      gmbAccounts.map(account => (account.locations || []).filter(loc => loc.cid && loc.cid === (row.restaurant.googleListing || {}).cid).map(loc => {
        accountAndStatuses.push({ email: account.email, status: loc.status, role: loc.role, appealId: loc.appealId });

      }));
      const statusOrder = ['Duplicate', 'Verification required', 'Pending verification', 'Suspended', 'Reverification required', 'Published'];
      accountAndStatuses.sort((s1, s2) => statusOrder.indexOf(s2.status) - statusOrder.indexOf(s1.status));
      row.hadGmb = accountAndStatuses.some(i => i.status === 'Published' || i.status === 'Suspended');
      row.accountAndStatuses = accountAndStatuses;
    });

    this.rows = Object.keys(dict).map(id => dict[id]);
    this.rows.map(row => {
      row.restaurant.createdAt = new Date(row.restaurant.createdAt);
      (row.restaurant.logs || []).map(log => new Log(log));
      row.agent = ((row.restaurant.rateSchedules || [])[0] || {}).agent;
    });

    this.rows.sort((r1, r2) => r2.restaurant.createdAt.valueOf() - r1.restaurant.createdAt.valueOf())
    this.rows.filter(r => !r.agent || !(r.agent && (r.agent.trim() === "invalid" || r.agent.trim() === "Invalid" || r.agent.trim() === "none" || r.agent.trim() === "None")))
    .forEach(row=>{
      if(row.agent && !this.salespeople.includes(row.agent)){
        this.salespeople.push(row.agent);
      }
    });
    this.salespeople.sort((a,b)=> (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0));
    if(!this.isAdmin()){
      this.salesperson = this.salespeople.filter(agent=>agent === this._global.user.username)[0]||'Nothing';
      this.rows = this.rows.filter(r =>r.agent === this.salesperson);
    }
    this.filter();
  }

  isAdmin(){
   return this._global.user.roles.indexOf('CSR') >= 0;
  }

  getDaysFromId(mongoId) {
    return Math.floor((this.now.valueOf() - parseInt(mongoId.substring(0, 8), 16) * 1000) / (24 * 3600000));
  }

  filter() {
    this.filteredRows = this.rows;
    if (this.havingGMB) {
      this.filteredRows = this.filteredRows.filter(r => r.accountAndStatuses[0] && r.accountAndStatuses[0].status === 'Published');
    }
    if (this.isWarning) {
      this.filteredRows = this.filteredRows.filter(r => (r.hadGmb && r.noMenu) || (!r.noMenu && r.hadGmb && r.noOrder));
    }

    switch (this.filterBy) {
      case MenuTypes.All:
        this.filteredRows = this.filteredRows;
        break;

      case MenuTypes.NoMenu:
        this.filteredRows = this.filteredRows.filter(r => r.agent !== 'charity' && r.noMenu);
        break;

      case MenuTypes.HavingMenu:
        this.filteredRows = this.filteredRows.filter(r => r.agent !== 'charity' && !r.noMenu && r.noOrder);
        break;
      default:
        break;
    }

    switch (this.hideInvalidSales) {
      case hideInvaidSalesTypes.All:
        this.filteredRows = this.filteredRows;
        break;

      case hideInvaidSalesTypes.ValidSales:
        this.filteredRows = this.filteredRows.filter(r => !r.agent || !(r.agent && (r.agent.trim() === "invalid" || r.agent.trim() === "Invalid" || r.agent.trim() === "none" || r.agent.trim() === "None")));
        break;
      case hideInvaidSalesTypes.InvalidSales:
        this.filteredRows = this.filteredRows.filter(r => !(!r.agent || !(r.agent && (r.agent.trim() === "invalid" || r.agent.trim() === "Invalid" || r.agent.trim() === "none" || r.agent.trim() === "None"))));
        break;
      default:
        break;
    }
    this.filterBySalePerson();
  }

  filterBySalePerson(){
    if(this.salesperson !== 'Salesperson...'){
      this.filteredRows = this.filteredRows.filter(r =>r.agent === this.salesperson);
    }else{
      this.filteredRows = this.filteredRows;
    }
  }

}
