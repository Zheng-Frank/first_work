import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { GlobalService } from '../../../services/global.service';
import { Gmb3Service } from 'src/app/services/gmb3.service';
import { AlertType } from 'src/app/classes/alert-type';
import { Helper } from 'src/app/classes/helper';

@Component({
  selector: 'app-gmb-biz-list',
  templateUrl: './gmb-biz-list.component.html',
  styleUrls: ['./gmb-biz-list.component.css']
})
export class GmbBizListComponent implements OnInit {
  rows = [];
  filteredRows = [];

  searchFilter;
  restaurantStatus = "restaurant status";
  restaurantProblems = "restaurant problems";
  gmbStatus = "GMB status";
  gmbRole = "GMB role";

  gmbOwnerAndCounts = [];
  gmbWebsiteOwner = "GMB website owner";

  agents = [];
  agent = "Sales agent";

  managedWebsite = 'Manged website';

  isAdmin = false;
  constructor(private _api: ApiService, private _global: GlobalService, private _gmb3: Gmb3Service) {
    this.refresh();
    this.isAdmin = _global.user.roles.some(r => r === 'ADMIN');
  }
  ngOnInit() {
  }

  async refresh() {
    // restaurants -> gmbBiz -> published status


    const restaurants = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: 'restaurant',
      projection: {
        name: 1,
        "googleListing.cid": 1,
        "googleListing.gmbOwner": 1,
        "googleListing.gmbWebsite": 1,
        "googleListing.gmbOpen": 1,
        "googleAddress.formatted_address": 1,
        disabled: 1,
        score: 1,
        "deliverySettings": { $slice: -1 },
        "rateSchedules": { $slice: -1 },
        "serviceSettings.name": 1,
        "serviceSettings.paymentMethods": 1,
        "menus.hours": 1,
        "menus.disabled": 1,
        "web.qmenuWebsite": 1,
        "web.bizManagedWebsite": 1,
        "web.useBizWebsite": 1,
        "web.useBizWebsiteForAll": 1
      }
    }, 2000); 

    const gmbAccounts = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: 'gmbAccount',
      projection: {
        email: 1,
        "locations.statusHistory": { $slice: 2 },
        "locations.cid": 1,
        "locations.appealId": 1,
        "locations.name": 1,
        "locations.address": 1,
        "locations.status": 1,
        "locations.role": 1,
      }
    }, 30);


    const gmbBizList = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: 'gmbBiz',
      projection: {
        name: 1,
        cid: 1,
        qmenuId: 1,
        gmbOwner: 1,
        gmbWebsite: 1
      }
    }, 2000);

  
    // create a cidMap
    const cidMap = {};

    const agentSet = new Set();
    restaurants.map(r => {
      if (r.googleListing && r.googleListing.cid) {
        cidMap[r.googleListing.cid] = cidMap[r.googleListing.cid] || {};
        cidMap[r.googleListing.cid].restaurants = cidMap[r.googleListing.cid].restaurants || [];
        cidMap[r.googleListing.cid].restaurants.push(r);
      }
      if (r.rateSchedules && r.rateSchedules[0]) {
        agentSet.add((r.rateSchedules[0].agent || '').toLowerCase());
        r.agent = (r.rateSchedules[0].agent || '').toLowerCase();
      }
    });

    this.agents = [...agentSet].sort((a1, a2) => a1 > a2 ? 1 : -1);

    gmbBizList.map(biz => {
      if (biz.cid) {
        cidMap[biz.cid] = cidMap[biz.cid] || {};
        cidMap[biz.cid].bizList = cidMap[biz.cid].bizList || [];
        cidMap[biz.cid].bizList.push(biz);
      }
    });

    const gmbOwnerCountMap = {};

    gmbBizList.map(biz => {
      if (biz.gmbOwner) {
        gmbOwnerCountMap[biz.gmbOwner] = (gmbOwnerCountMap[biz.gmbOwner] || 0) + 1
      }
    });

    this.gmbOwnerAndCounts = Object.keys(gmbOwnerCountMap).map(k => ({
      owner: k,
      count: gmbOwnerCountMap[k]
    })).sort((oc1, oc2) => oc1.owner > oc2.owner ? 1 : -1);

    gmbAccounts.map(account => (account.locations || []).map(loc => {
      if (loc.cid) {
        cidMap[loc.cid] = cidMap[loc.cid] || {};
        cidMap[loc.cid].accountLocations = cidMap[loc.cid].accountLocations || [];
        cidMap[loc.cid].accountLocations.push({ account: account, location: loc, bizList: cidMap[loc.cid].bizList });
      }
    }));



    // cids not matched to any restaurants: use qmenuId to match (biz -> qmenuId -> cid -> location and account)

    Object.keys(cidMap).map(cid => {
      cidMap[cid].restaurants = cidMap[cid].restaurants || [];
      if (cidMap[cid].restaurants.length === 0) {
        const qmenuIds = (cidMap[cid].bizList || []).map(biz => biz.qmenuId).filter(qmenuId => qmenuId);
        cidMap[cid].restaurants.push(...restaurants.filter(r => qmenuIds.indexOf(r._id) >= 0));
      }
    });

    // we need to produce a view from restaurant's point of view
    // restaurant -> (cids, shared by others?) -> locationAndAccounts

    const qmenuIdMap = {};
    Object.keys(cidMap).map(cid => {
      const cidRestaurants = cidMap[cid].restaurants || [];
      if (cidRestaurants.length === 0) {
        qmenuIdMap[cid] = qmenuIdMap[cid] || { restaurant: { name: ' NO MATCH' } };
        qmenuIdMap[cid].accountLocations = qmenuIdMap[cid].accountLocations || [];
        qmenuIdMap[cid].accountLocations.push(...(cidMap[cid].accountLocations || []));
      } else {
        cidRestaurants.map(r => {
          qmenuIdMap[r._id] = qmenuIdMap[r._id] || {};
          qmenuIdMap[r._id].restaurant = r;
          qmenuIdMap[r._id].accountLocations = qmenuIdMap[r._id].accountLocations || [];
          qmenuIdMap[r._id].accountLocations.push(...(cidMap[cid].accountLocations || []));
        });
      }
    });

    // sort by name!
    this.rows = Object.keys(qmenuIdMap).map(qmenuId => qmenuIdMap[qmenuId]);
    this.rows.sort((r1, r2) => r1.restaurant.name > r2.restaurant.name ? 1 : (r1.restaurant.name < r2.restaurant.name ? -1 : 0));

    // cleanup: keep ONLY suspended or published
    const statusOrder = ['Duplicate', 'Verification required', 'Pending verification', 'Suspended', 'Reverification required', 'Published'];
    this.rows.map(row => {
      const filtered = row.accountLocations.filter(al => al.location.status === 'Published' || al.location.status === 'Suspneded');
      if (filtered.length > 0) {
        row.accountLocations = filtered;
        return;
      }
      // now let's sort and keep only one
      if (row.accountLocations.length > 0) {
        row.accountLocations.sort((al2, al1) => statusOrder.indexOf(al1.location.status) - statusOrder.indexOf(al2.location.status));
        row.accountLocations.length = 1;
      }
    });

    this.rows = this.rows.filter(r => r.restaurant._id || r.accountLocations.length > 0);

    // if a row has no restaurant._id && cid !== 0 &&  status === Published or Suspended
    this.rows = this.rows.filter(r => r.restaurant._id || (r.accountLocations.some(al => al.location.cid && al.location.cid.length > 3 && al.location.status === 'Published' || al.location.status === 'Suspended')));
    this.filter();
  }

  filter() {
    this.filteredRows = this.rows.slice(0);
    if (this.searchFilter && this.searchFilter.trim()) {
      const text = this.searchFilter.trim().toLowerCase();
      this.filteredRows = this.filteredRows.filter(row => [
        row.restaurant.name || '',
        (row.restaurant.googleAddress || {}).formatted_address || '',
        ((row.accountLocations[0] || {}).location || {}).name,
        ((row.accountLocations[0] || {}).location || {}).address,

      ].some(t => t && t.toLowerCase().indexOf(text) === 0));
    }
    switch (this.restaurantStatus) {
      case 'disabled':
        this.filteredRows = this.filteredRows.filter(r => r.restaurant.disabled);
        break;
      case 'enabled':
        this.filteredRows = this.filteredRows.filter(r => r.restaurant._id && !r.restaurant.disabled);
        break;

      default:
        break;
    }

    // Filter out restaurants with invalid agent first
    if (this.restaurantProblems !== "restaurant problems") {
      this.filteredRows = this.filteredRows.filter(r => ((r.restaurant.rateSchedules || [])[0] || {}).agent !== "invalid");
    }
    switch (this.restaurantProblems) {
      case 'bad service settings':
        this.filteredRows = this.filteredRows.filter(r => r.restaurant._id && (!r.restaurant.serviceSettings || !r.restaurant.serviceSettings.some(setting => setting.paymentMethods && setting.paymentMethods.length > 0)));
        break;
      case 'bad delivery settings':
        // has delivery in service settings, but no deliverySettings found!
        this.filteredRows = this.filteredRows.filter(
          r => r.restaurant._id && r.restaurant.serviceSettings && r.restaurant.serviceSettings.some(ss => ss.name === 'Delivery' && ss.paymentMethods.length > 0) && (!r.restaurant.deliverySettings || r.restaurant.deliverySettings.length === 0));
        break;
      case 'bad menus':
        // bad: 1. no menu at all
        // 2. menus are ALL disabled
        this.filteredRows = this.filteredRows.filter(r => r.restaurant._id && (!r.restaurant.menus || r.restaurant.menus.filter(menu => !menu.disabled).length === 0));
        break;
      case 'bad rate schedules':
        // bad: 1. no rateSchedules
        // 2. rateSchedules have no value for rate or fixed
        this.filteredRows = this.filteredRows.filter(r => r.restaurant._id && (!r.restaurant.rateSchedules || r.restaurant.rateSchedules.filter(rs => !isNaN(rs.fixed) || !isNaN(rs.rate)).length === 0));
        break;
      case 'no qMenu managed website':
        this.filteredRows = this.filteredRows.filter(r => r.restaurant._id && (!r.restaurant.web || !r.restaurant.web.qmenuWebsite));
        break;
      case 'no restaurant managed website':
        this.filteredRows = this.filteredRows.filter(r => r.restaurant._id && (!r.restaurant.web || !r.restaurant.web.bizManagedWebsite));
        break;
      case 'having insisted website':
        this.filteredRows = this.filteredRows.filter(r => r.restaurant._id && r.restaurant.web && (r.restaurant.web.useBizWebsite || r.restaurant.web.useBizWebsiteForAll));
        break;
      case 'GMB name mismatched':
        this.filteredRows = this.filteredRows.filter(r => r.restaurant._id && r.accountLocations.some(al => al.location && al.location.name.toLowerCase() !== r.restaurant.name.toLowerCase()));
        break;
      default:
        break;
    }

    switch (this.gmbStatus) {
      case 'published':
        this.filteredRows = this.filteredRows.filter(r => r.accountLocations.some(al => al.location.status === 'Published'));
        break;
      case 'suspended':
        this.filteredRows = this.filteredRows.filter(r => r.accountLocations.some(al => al.location.status === 'Suspended'));
        break;
      case 'open':
        this.filteredRows = this.filteredRows.filter(r => r.restaurant.googleListing && r.restaurant.googleListing.gmbOpen);
        break;
      case 'lost in 48 hours':
        const now = new Date();
        const recentSpan = 48 * 3600000;
        this.filteredRows = this.filteredRows.filter(r => !r.accountLocations.some(al => al.location.status === 'Published') && r.accountLocations.some(al => al.location.statusHistory[1] && al.location.statusHistory[1].status === 'Published' && now.valueOf() - new Date(al.location.statusHistory[0].time).valueOf() < recentSpan));
        break;
      case 'secondary listing':
        this.filteredRows = this.filteredRows.filter(r => r.restaurant.googleListing && r.accountLocations.some(al => al.location.cid !== r.restaurant.googleListing.cid));
        break;

      default:
        break;
    }

    switch (this.gmbRole) {
      case 'PRIMARY_OWNER':
      case 'OWNER':
      case 'CO_OWNER':
      case 'MANAGER':
      case 'COMMUNITY_MANAGER':
        this.filteredRows = this.filteredRows.filter(r => r.accountLocations.some(al => al.location.role === this.gmbRole));
        break;
      case 'others':
        const knownRoles = ['PRIMARY_OWNER', 'OWNER', 'CO_OWNER', 'MANAGER', 'COMMUNITY_MANAGER'];
        this.filteredRows = this.filteredRows.filter(r => r.accountLocations.some(al => knownRoles.indexOf(al.location.status) < 0));
        break;
      default:
        break;
    }

    switch (this.gmbWebsiteOwner) {
      case 'GMB website owner':
        break;
      case 'NOT qMenu':
        this.filteredRows = this.filteredRows.filter(r => ((r.restaurant.googleListing || {}).gmbWebsite || '').indexOf('target=') > 0 || (r.restaurant.googleListing || {}).gmbOwner !== 'qmenu' || r.accountLocations.some(al => (al.bizList || []).some(biz => biz.gmbOwner !== 'qmenu')));
        break;
      default:
        // test: 1. restaurant.googleListing, if there is no accountLocations, or location.cid -> gmbBiz -> gmbOwner.
        const gmbOwner = this.gmbWebsiteOwner.split(' ')[0];
        this.filteredRows = this.filteredRows.filter(r => (r.restaurant.googleListing || {}).gmbOwner === gmbOwner || r.accountLocations.some(al => (al.bizList || []).some(biz => biz.gmbOwner === gmbOwner)));
        break;
    }

    switch (this.managedWebsite) {
      case 'exists':
        this.filteredRows = this.filteredRows.filter(r => r.restaurant.web && r.restaurant.web.qmenuWebsite);
        break;
      case 'non-exist':
        this.filteredRows = this.filteredRows.filter(r => !r.restaurant.web || !r.restaurant.web.qmenuWebsite);
        break;
      case 'insisted: having qMenu link':
        // first round: insisted and has bizManagedWebsite
        this.filteredRows = this.filteredRows.filter(r => r.restaurant.web && r.restaurant.web.bizManagedWebsite && (r.restaurant.web.useBizWebsite || r.restaurant.web.useBizWebsiteForAll));
        // second round: gmbBiz.gmbWebsite is bizMangedWebsite but has qmenu link
        this.filteredRows = this.filteredRows.filter(r => r.accountLocations.some(al => al.bizList.some(biz => biz.gmbOwner === 'qmenu' && biz.gmbWebsite === r.restaurant.web.bizManagedWebsite)));
        break;

      case 'insisted: no qMenu link':
        // first round: insisted and has bizManagedWebsite
        this.filteredRows = this.filteredRows.filter(r => r.restaurant.web && r.restaurant.web.bizManagedWebsite && (r.restaurant.web.useBizWebsite || r.restaurant.web.useBizWebsiteForAll));
        // second round: gmbBiz.gmbWebsite is bizMangedWebsite but has qmenu link
        this.filteredRows = this.filteredRows.filter(r => r.accountLocations.some(al => al.bizList.some(biz => biz.gmbOwner !== 'qmenu' && biz.gmbWebsite === r.restaurant.web.bizManagedWebsite)));
        break;
      case 'old style qMenu redirect':

        const isOldStyleRedirect = function (url) {
          return url && url.indexOf('qmenu.us') > 0 && url.indexOf('www.qmenu.us') < 0 && url.indexOf('//qmenu.us') < 0;
        }

        // first round: insisted and has bizManagedWebsite
        this.filteredRows = this.filteredRows.filter(r => r.restaurant.web && (isOldStyleRedirect(r.restaurant.web.bizManagedWebsite) || isOldStyleRedirect(r.restaurant.web.qmenuWebsite)));
        // second round: gmbBiz.gmbWebsite is bizMangedWebsite but has qmenu link
        break;
      case 'same as restaurant managed':
        this.filteredRows = this.filteredRows.filter(r => r.restaurant.web && r.restaurant.web.qmenuWebsite && Helper.areDomainsSame(r.restaurant.web.qmenuWebsite, r.restaurant.web.bizManagedWebsite));
        break;
      default:
        break;
    }


    switch (this.agent) {

      case 'Sales agent':
        break;
      default:
        this.filteredRows = this.filteredRows.filter(r => r.restaurant.agent === this.agent);
        break;
    }

  }

  async onEditQmenuId(event, gmbBiz, row) {
    if (confirm('Be very careful! Are you sure you want to assign the restaurant?')) {
      const qmenuId = event.newValue;
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=gmbBiz', [
        {
          old: { _id: gmbBiz._id },
          new: { _id: gmbBiz._id, qmenuId: qmenuId }
        }
      ]).toPromise();

      // assign to original
      gmbBiz.qmenuId = qmenuId;
      row.restaurant = this.rows.filter(row => row.restaurant._id === qmenuId).map(row => row.restaurant)[0];

    }

    console.log(event, gmbBiz);
  }

  async onEdit(event, restaurant, field: string) {
    if (confirm('Be very careful! Are you sure?')) {
      const oldValue = event.oldValue;
      const newValue = (event.newValue || '').trim();
      const oldWeb = {};
      const newWeb = {};
      oldWeb[field] = oldValue;
      newWeb[field] = newValue;

      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: { _id: restaurant._id, web: oldWeb },
        new: { _id: restaurant._id, web: newWeb }
      }]).toPromise();
      this._global.publishAlert(AlertType.Success, 'Updated');
      restaurant.web = restaurant.web || {};
      restaurant.web[field] = newValue;
    }
  }

}
