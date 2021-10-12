import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { GlobalService } from '../../../services/global.service';
import { Gmb3Service } from 'src/app/services/gmb3.service';
import { AlertType } from 'src/app/classes/alert-type';
import { Helper } from 'src/app/classes/helper';
import { lineSplit } from 'pdf-lib';

@Component({
  selector: 'app-gmb-wrong-link',
  templateUrl: './gmb-wrong-link.component.html',
  styleUrls: ['./gmb-wrong-link.component.css']
})
export class GmbWrongLinkComponent implements OnInit {
  now = new Date();
  rows = [];
  filteredRows = [];
  gmbLogs = {};
  websiteStatus = 'any';
  websiteStatuses = [
    'any',
    'missing',
    'not missing'
  ];
  myColumnDescriptors = [
    {
      label: "#"
    },
    {
      label: "qMenu Restaurant",
    },
    {
      label: "Created",
      paths: ['restaurant', 'createdAt'],
      sort: (a, b) => a.valueOf() - b.valueOf()
    },
    {
      label: "Agent",
      paths: ['restaurant', 'agent'],
    },
    {
      label: "Role",
    },
    {
      label: "Score",
      paths: ['restaurant', 'score'],
      sort: (a, b) => (a || 0) - (b || 0)
    },
    {
      label: "GMB Account",
    },
    {
      label: "Websites",
    },
    {
      label: "Notes",
    }
  ];
  constructor(private _api: ApiService, private _global: GlobalService) {
    // put a nice default of filtering of only missing qmenu website for marketers
    this.websiteStatus = this._global.user.roles.some(r => r === 'MARKETER_INTERNAL') ? 'missing' : 'any'
  }

  async ngOnInit() {
    await this.populate();
    await this.refreshLogs();
  }

  changeFilter() {
    this.filteredRows = this.rows.filter(r => {
      switch (this.websiteStatus) {
        case 'missing':
          return !r.restaurant.web || !r.restaurant.web.qmenuWebsite;
        case 'not missing':
          return r.restaurant.web && r.restaurant.web.qmenuWebsite;
        default:
          return true;
      }
    });
  }

  async populate() {
    // restaurants -> gmbBiz -> published status
    const restaurants = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: 'restaurant',
      projection: {
        name: 1,
        "googleListing.cid": 1,
        "googleListing.gmbOwner": 1,
        "googleListing.gmbWebsite": 1,
        "googleAddress.formatted_address": 1,
        disabled: 1,
        score: 1,
        "web.qmenuWebsite": 1,
        "web.bizManagedWebsite": 1,
        "web.useBizWebsite": 1,
        "web.useBizWebsiteForAll": 1,
        "web.useBizMenuUrl": 1,
        "web.useBizOrderAheadUrl": 1,
        "web.useBizReservationUrl": 1,
        "web.ignoreGmbOwnershipRequest": 1,
        "rateSchedules.agent": 1,
      }
    }, 11000);

    // const restaurants = rawRestaurants.filter(r => r._id === "608ddea741bf021081ac586e");

    const gmbAccounts = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbAccount',
      aggregate: [
        { '$match': { _id: { $exists: true } } },
        {
          $project: {
            email: 1,
            locations: {
              $filter: {
                input: "$locations",
                as: "location",
                cond: { $in: ["$$location.status", ['Published']] }
              },
              // statusHistory: 0
            }
          }
        },
        {
          $project: {
            email: 1,
            "locations.cid": 1,
            "locations.status": 1,
            "locations.role": 1,
            "locations.appealId": 1
          }
        },
      ]
    }).toPromise();

    // create a published cidAccountLocationMap
    const cidAccountLocationMap = {};
    const roles = ['SITE_MANAGER', 'COMMUNITY_MANAGER', 'MANAGER', 'OWNER', 'CO_OWNER', 'PRIMARY_OWNER'];
    gmbAccounts.map(account => (account.locations || []).map(loc => {
      if (loc.cid && loc.status === 'Published') {
        // match the highest ownership
        if (!cidAccountLocationMap[loc.cid] || roles.indexOf(cidAccountLocationMap[loc.cid].location.role) < roles.indexOf(loc.role)) {
          cidAccountLocationMap[loc.cid] = {
            account: account,
            location: loc
          }
        }
      }
    }));

    restaurants.map(r => {
      r.createdAt = new Date(parseInt(r._id.substring(0, 8), 16) * 1000);
      if (r.googleListing && r.googleListing.cid) {
        r.accountLoc = cidAccountLocationMap[r.googleListing.cid];
      }
      r.agent = (r.rateSchedules || []).map(rs => rs.agent).filter(a => a)[0];
    });

    const mismatchedRestaurants = restaurants.filter(restaurant => {
      // define conditions that lead us to conclude that a RT has incorrect links
      const isEnabled = restaurant.disabled ? !restaurant.disabled : true; // 1) RT must not be disabled
      let isqMenuLinkOnGmb;
      if (restaurant.web && restaurant.googleListing) {
        isqMenuLinkOnGmb = this.isWebsiteOk(restaurant); // 3) qMenu link should not already be on GMB
      } else {
        isqMenuLinkOnGmb = false;
      }
      const rtInsistsOwnLinks = restaurant.web && (restaurant.web.useBizWebsiteForAll || restaurant.web.useBizWebsite || restaurant.web.useBizMenuUrl
        || restaurant.web.useBizOrderAheadUrl || restaurant.web.useBizReservationUrl) // 4) rt should not have their own insisted links

      return isEnabled && !isqMenuLinkOnGmb && !rtInsistsOwnLinks;
    });

    const publishedMismatchedRestaurants = mismatchedRestaurants.filter(r => r.accountLoc && r.accountLoc.location.status === 'Published');
    // sort by name!
    this.rows = publishedMismatchedRestaurants.map(r => ({ restaurant: r })).sort((r1, r2) => r1.restaurant.name > r2.restaurant.name ? 1 : (r1.restaurant.name < r2.restaurant.name ? -1 : 0));
    this.changeFilter();
  }

  isWebsiteOk(rt) {
    const desiredWebsites = Helper.getDesiredUrls(rt);
    return Helper.areDomainsSame(rt.googleListing.gmbWebsite, desiredWebsites.website);
  }

  async refreshLogs() {
    const gmbLogs = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'gmb-mismatched-log',
      query: {},
      projection: {},
      limit: 5000
    }).toPromise();

    this.gmbLogs = {};

    gmbLogs.forEach(log => {
      if (!this.gmbLogs[log.restaurantId]) {
        this.gmbLogs[log.restaurantId] = [log];
      } else {
        this.gmbLogs[log.restaurantId].push(log);
      }
    });
  }

  listOfMatchingLogEntries(restaurantId) {
    if (this.gmbLogs[restaurantId]) {
      return this.gmbLogs[restaurantId];
    }
  }

  async addLog(r: any) {
    if (r.content) {
      try {
        const newLog = {
          restaurantId: r.restaurant._id,
          log: r.content,
          username: this._global.user.username,
          createdAt: new Date()
        };

        await this._api.post(environment.qmenuApiUrl + 'generic?resource=gmb-mismatched-log', [newLog]).toPromise();
        this._global.publishAlert(AlertType.Success, `New log successfully added`);
        this.refreshLogs();
      } catch (error) {
        console.error('error while adding comment.', error);
        this._global.publishAlert(AlertType.Danger, `Error while adding log.`);
      }
      r.content = "";
    } else {
      console.error("Error: Log cannot be blank");
      this._global.publishAlert(AlertType.Danger, `Error: Log cannot be blank.`);
    }
  }

  formatLink(link) {
    if (!link || link.length === 0) {
      return 'N/A';
    }
    if (link.length < 90) {
      return link;
    }
    return link.slice(0, 90) + '...';
  }
}
