import { Component, OnInit } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { Helper } from "src/app/classes/helper";

@Component({
  selector: 'app-monitoring-restaurants',
  templateUrl: './monitoring-restaurants.component.html',
  styleUrls: ['./monitoring-restaurants.component.css']
})
export class MonitoringRestaurantsComponent implements OnInit {

  selectRestaurant;

  restaurants = [];
  filteredRestaurants = [];

  gmb = 'ALL';
  gmbList = ['ALL', 'having GMB', 'no GMB'];

  status = 'ALL';
  statusList = ['ALL', 'enabled', 'disabled'];

  daysCreated = 'ALL';
  daysCreatedList = ['ALL', '0 - 7', '8 - 30', '> 30'];

  timeZone = "ALL";
  timeZoneList = ["ALL", ...["PDT", "MDT", "CDT", "EDT", "HST", "AKDT"].sort()];

  score = 'ALL';
  scoreList = ['ALL', 'NOT 0', '0', '1', '2', '3', '4', '> 4'];


  errorName = 'ALL';
  errorNameList = [];

  detailedError = 'ALL';
  detailedErrorList = [];

  myColumnDescriptors = [
    {
      label: "#"
    },
    {
      label: "Created",
      paths: ['createdAt'],
      sort: (a, b) => new Date(a).valueOf() - new Date(b).valueOf()
    },
    {
      label: "Restaurant",
      paths: ['name'],
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },
    {
      label: "Timezone",
      paths: ['timezone'],
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },

    {
      label: "Score",
      paths: ['score'],
      sort: (a, b) => (a || 0) - (b || 0)
    },
    {
      label: "GMB"
    },
    {
      label: "Errors"
    }
  ];


  constructor(private _api: ApiService, private _global: GlobalService) {
  }

  async ngOnInit() {
    this.populate();
  }

  async populate() {

    const gmbAccounts = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbAccount',
      query: {},
      projection: {
        email: 1,
        "locations.cid": 1,
        "locations.status": 1
      }
    }, 300);

    const publishedCids = new Set();
    gmbAccounts.map(account => (account.locations || []).map(loc => {
      if (loc.status === 'Published') {
        publishedCids.add(loc.cid);
      }
    }));
    //non-disabled, never had GMB, without tasks, more than 30 days on platform
    this.restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {},
      projection: {
        name: 1,
        "googleAddress.formatted_address": 1,
        "googleAddress.timezone": 1,
        alias: 1,
        disabled: 1,
        "googleListing.cid": 1,
        "googleListing.gmbOwner": 1,
        createdAt: 1,
        "rateSchedules.agent": 1,
        "web.ignoreGmbOwnershipRequest": 1,
        "web.agreeToCorporate": 1,
        diagnostics: { $slice: 1 },
        "diagnostics.time": 1,
        "diagnostics.result": 1,
        score: 1
      }
    }, 4000);

    // inject: problems total, isGmbPublished
    this.restaurants.map(rt => {
      // sum all errors in each item
      rt.errors = (((rt.diagnostics || [])[0] || {}).result || []).reduce((sum, item) => sum + (item.errors || []).length, 0);
      rt.gmbPublished = rt.googleListing && rt.googleListing.cid && publishedCids.has(rt.googleListing.cid);
      rt.timezone = Helper.getTimeZone((rt.googleAddress || {}).formatted_address);
    });

    // populate errorItems:
    const errorNames = new Set();
    this.restaurants.map(rt => (rt.diagnostics || []).map(diagnostics => diagnostics.result.map(item => errorNames.add(item.name))));
    this.errorNameList = ['ALL', 'NONE', ...errorNames];

    const errorStats = {};
    this.restaurants.map(rt => (rt.diagnostics || []).map(diagnostics => diagnostics.result.map(item => (item.errors || []).map(error => {
      errorStats[error] = errorStats[error] || new Set();
      errorStats[error].add(rt);
    }))));

    const groupedErrorRts = Object.keys(errorStats).map(key => ({
      error: key,
      restaurants: errorStats[key].size
    }));

    groupedErrorRts.sort((b, a) => a.restaurants - b.restaurants);
    this.detailedErrorList.push('ALL', ...groupedErrorRts.map(g => g.error));

    console.log(this.detailedErrorList);
    console.log(groupedErrorRts);
    this.filter();
  }

  filter() {
    this.filteredRestaurants = this.restaurants.filter(rt => {
      let ok = true;

      // check status
      switch (this.status) {
        case 'disabled':
          ok = rt.disabled;
          break;
        case 'enabled':
          ok = !rt.disabled;
          break;
        default:
          break;
      }
      if (!ok) {
        return false;
      }

      // check gmb
      switch (this.gmb) {
        case 'having GMB':
          ok = rt.gmbPublished;
          break;
        case 'no GMB':
          ok = !rt.gmbPublished;
          break;
        default:
          break;
      }
      if (!ok) {
        return false;
      }

      // days created
      const daysCreated = (new Date().valueOf() - new Date(rt.createdAt).valueOf()) / (24 * 3600000);
      if (this.daysCreated.split(' ').length === 2) {
        // > 30
        ok = daysCreated > +this.daysCreated.split(' ')[1];

      } else if (this.daysCreated.split(' ').length === 3) {
        // 0 - 7
        ok = daysCreated > +this.daysCreated.split(' ')[0] && daysCreated < +this.daysCreated.split(' ')[2];
      }
      if (!ok) {
        return false;
      }

      // timezone
      if(this.timeZone !== 'ALL') {
        ok = Helper.getTimeZone((rt.googleAddress || {}).formatted_address) === this.timeZone;
      }

      // score
      const score = rt.score || 0;

      if (this.score === 'NOT 0') {
        ok = score > 0;
      } else if (this.score === 'ALL') {
        // nothing
      } else if (this.score.split(' ').length === 2) {
        // > 4
        ok = score > +this.score.split(' ')[1];
      } else {
        ok = score === +this.score;
      }

      if (!ok) {
        return false;
      }

      // errors
      switch (this.errorName) {
        case 'ALL':
          break;
        case 'NONE':
          ok = !(((rt.diagnostics || [])[0] || {}).result || []).some(item => (item.errors || []).length > 0);
          break;
        default:
          ok = (((rt.diagnostics || [])[0] || {}).result || []).some(item => item.name === this.errorName && (item.errors || []).length > 0);
          break;
      }

      // errors
      switch (this.detailedError) {
        case 'ALL':
          break;
        default:
          ok = (((rt.diagnostics || [])[0] || {}).result || []).some(item => (item.errors || []).some(error => error === this.detailedError));
          break;
      }


      return ok;
    });
  }

  showError(restaurant) {
    this.selectRestaurant = this.selectRestaurant === restaurant ? undefined : restaurant;
  }

}
