import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { GlobalService } from '../../../services/global.service';
import { AlertType } from 'src/app/classes/alert-type';
import { Helper } from 'src/app/classes/helper';

enum modeTypes {
  Not_Even_1 = 'Not even 1 QM link',
  Main_Link_Not = 'Main link not QM'
}

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
  modeOptions = [modeTypes.Not_Even_1, modeTypes.Main_Link_Not];
  modeOption = modeTypes.Not_Even_1;
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
      label: "Link Status"
    },
    {
      label: "Notes",
    }
  ];
  restaurants = [];
  gmbWebsiteOwnerDict = {};
  constructor(private _api: ApiService, private _global: GlobalService) {
    // put a nice default of filtering of only missing qmenu website for marketers
    this.websiteStatus = this._global.user.roles.some(r => r === 'MARKETER_INTERNAL') ? 'missing' : 'any'
  }

  async ngOnInit() {
    await this.populate();
    await this.refreshLogs();
  }

  changeFilter() {
    // filter mode
    switch (this.modeOption) {
      case modeTypes.Not_Even_1:
        this.rows = this.restaurants.filter(restaurant => {
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
        }).filter(r => r.accountLoc && r.accountLoc.location.status === 'Published').map(r => ({ restaurant: r }));
        break;
      case modeTypes.Main_Link_Not:
        this.rows = this.restaurants.filter(r => r.hasGmb && !r.hasGMBWebsite).map(r => ({ restaurant: r }));
        break;
      default:
        break;
    }
    // sort by name!
    this.rows.sort((r1, r2) => r1.restaurant.name > r2.restaurant.name ? 1 : (r1.restaurant.name < r2.restaurant.name ? -1 : 0));
    // filter by websiteStatus
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
    this.restaurants = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: 'restaurant',
      projection: {
        name: 1,
        "googleListing.cid": 1,
        "googleListing.place_id": 1,
        "googleListing.gmbOwner": 1,
        "googleListing.gmbWebsite": 1,
        "googleAddress.formatted_address": 1,
        disabled: 1,
        score: 1,
        "web.qmenuWebsite": 1,
        "web.bizManagedWebsite": 1,
        "web.menuUrl": 1,
        "web.orderAheadUrl": 1,
        "web.reservationUrl": 1,
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

    const gmbBiz = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbBiz',
      projection: { cid: 1, gmbOwner: 1, qmenuId: 1, place_id: 1, gmbWebsite: 1, menuUrls: 1, reservations: 1, serviceProviders: 1 },
    }, 10000);
    const gmbWebsiteOwnerDict = {};
    gmbBiz.forEach(({ cid, place_id, qmenuId, gmbOwner, gmbWebsite, menuUrls, reservations, serviceProviders }) => {
      let key = place_id + cid;
      gmbWebsiteOwnerDict[key] = {
        gmbOwner: gmbOwner,
        gmbBiz: {
          gmbWebsite: gmbWebsite || '',
          menuUrls: menuUrls || [],
          reservations: reservations || [],
          serviceProviders: serviceProviders || []
        }
      };
      if (qmenuId) {
        gmbWebsiteOwnerDict[qmenuId + cid] = gmbOwner;
      }
    })

    this.restaurants.map(r => {
      r.createdAt = new Date(parseInt(r._id.substring(0, 8), 16) * 1000);
      if (r.googleListing && r.googleListing.cid) {
        r.accountLoc = cidAccountLocationMap[r.googleListing.cid];
      }
      r.agent = (r.rateSchedules || []).map(rs => rs.agent).filter(a => a)[0];
      /*
      Not all the RTs that should be on this page are actually appearing on the page. 
      Any RT where we own the GMB but our Qmenu link isn't on the GMB 
      (or some competitor's link is on the GMB instead), should appear on that page. 
      */
      let key = r.googleListing.place_id + r.googleListing.cid;
      r.hasGmb = (gmbWebsiteOwnerDict[key] || gmbWebsiteOwnerDict[r._id + r.googleListing.cid]) && gmbAccounts.some(acc => (acc.locations || []).some(loc => loc.cid === r.googleListing.cid && loc.status === 'Published' && ['PRIMARY_OWNER', 'OWNER', 'CO_OWNER', 'MANAGER'].includes(loc.role)))
      r.hasGMBWebsite = gmbWebsiteOwnerDict[key] === 'qmenu' || gmbWebsiteOwnerDict[r._id + r.googleListing.cid] === 'qmenu';
      // generate link status
      let gmbBizgmbWebsite = gmbWebsiteOwnerDict[key] ? [(gmbWebsiteOwnerDict[key].gmbBiz || {}).gmbWebsite] : gmbWebsiteOwnerDict[r._id + r.googleListing.cid] ? [(gmbWebsiteOwnerDict[r._id + r.googleListing.cid].gmbBiz || {}).gmbWebsite] : [];
      let gmbBizmenuUrls = gmbWebsiteOwnerDict[key] ? (gmbWebsiteOwnerDict[key].gmbBiz || {}).menuUrls : gmbWebsiteOwnerDict[r._id + r.googleListing.cid] ? (gmbWebsiteOwnerDict[r._id + r.googleListing.cid].gmbBiz || {}).menuUrls : [];
      let gmbBizserviceProviders = gmbWebsiteOwnerDict[key] ? (gmbWebsiteOwnerDict[key].gmbBiz || {}).serviceProviders : gmbWebsiteOwnerDict[r._id + r.googleListing.cid] ? (gmbWebsiteOwnerDict[r._id + r.googleListing.cid].gmbBiz || {}).serviceProviders : [];
      let gmbBizreservations = gmbWebsiteOwnerDict[key] ? (gmbWebsiteOwnerDict[key].gmbBiz || {}).reservations : gmbWebsiteOwnerDict[r._id + r.googleListing.cid] ? (gmbWebsiteOwnerDict[r._id + r.googleListing.cid].gmbBiz || {}).reservations : [];

      let qmenuWebsite = ((r.web || {}).qmenuWebsite || '').trim().toLowerCase();
      let restaurantWebsite = ((r.web || {}).bizManagedWebsite || '').trim().toLowerCase();
      let menuWebsite = ((r.web || {}).menuUrl || '').trim().toLowerCase();
      let orderWebsite = ((r.web || {}).orderAheadUrl || '').trim().toLowerCase();
      let reservationWebsite = ((r.web || {}).reservationUrl || '').trim().toLowerCase(); 
      // normalize websites!
      if (qmenuWebsite && !qmenuWebsite.startsWith('http')) {
        qmenuWebsite = 'http://' + qmenuWebsite;
      }

      if (restaurantWebsite && !restaurantWebsite.startsWith('http')) {
        restaurantWebsite = 'http://' + restaurantWebsite;
      }

      if(menuWebsite && !menuWebsite.startsWith('http')) {
        menuWebsite = 'http://' + menuWebsite;
      }

      if(orderWebsite && !orderWebsite.startsWith('http')) {
        orderWebsite = 'http://' + orderWebsite;
      }

      if(reservationWebsite && !reservationWebsite.startsWith('http')) {
        reservationWebsite = 'http://' + reservationWebsite;
      }

      r.linkStatuses = [
        {
          label: 'GMB Website',
          qmenu: qmenuWebsite,
          insisted: r.web && (r.web.useBizWebsite || r.web.useBizWebsiteForAll) ? restaurantWebsite : 'N/A',
          actual: gmbBizgmbWebsite,
          status: this.getWebsiteStatus([], 'gmbWebsite', r),
          showMoreDesiredUrl: false,
          showMoreActualUrl: false
        },
        {
          label: 'GMB Menu URLs',
          qmenu: qmenuWebsite,
          insisted: r.web && (r.web.useBizMenuUrl || r.web.useBizWebsiteForAll) ? menuWebsite : 'N/A',
          actual: gmbBizmenuUrls,
          status: this.getWebsiteStatus(gmbBizmenuUrls, 'menuUrl', r),
          showMoreDesiredUrl: false,
          showMoreActualUrl: false
        },
        {
          label: 'GMB Order Services',
          qmenu: qmenuWebsite,
          insisted: r.web && (r.web.useBizOrderAheadUrl || r.web.useBizWebsiteForAll) ? orderWebsite : 'N/A',
          actual: gmbBizserviceProviders,
          status: this.getWebsiteStatus(gmbBizserviceProviders, 'orderAheadUrl', r),
          showMoreDesiredUrl: false,
          showMoreActualUrl: false
        },
        {
          label: 'GMB Reservations',
          qmenu: qmenuWebsite,
          insisted: r.web && (r.web.useBizReservationUrl || r.web.useBizWebsiteForAll) ? reservationWebsite : 'N/A',
          actual: gmbBizreservations,
          status: this.getWebsiteStatus(gmbBizreservations, 'reservation', r),
          showMoreDesiredUrl: false,
          showMoreActualUrl: false
        }
      ]
    });
    this.changeFilter();
  }

  /** otherUrls is in {menuUrls, reservations, and serviceProviders} */
  /** target is {website, menuUrl, orderAheadUrl, reservation} */
  getWebsiteStatus(otherUrls, target, rt) {
    let styleMap = {
      'isOK': 'text-success',
      'equalsToRT': 'text-danger',
      'NotEqualsToBoth': 'text-muted'
    };

    let isEqualsToRT = false;
    let isEqualsToQmenu = false;
    switch (target) {
      case 'gmbWebsite':
        isEqualsToRT = Helper.areDomainsSame(rt.googleListing.gmbWebsite, (rt.web || {}).bizManagedWebsite);
        isEqualsToQmenu = Helper.areDomainsSame(rt.googleListing.gmbWebsite, (rt.web || {}).qmenuWebsite);
        break;
      case 'menuUrl':
      case 'orderAheadUrl':
      case 'reservation':
        isEqualsToRT = (otherUrls || []).some(url => Helper.areDomainsSame(url, (rt.web || {}).bizManagedWebsite));
        isEqualsToQmenu = (otherUrls || []).some(url => Helper.areDomainsSame(url, (rt.web || {}).qmenuWebsite));
        break;
      default:
        break;
    }
    if (isEqualsToRT) {
      return {
        style: styleMap['equalsToRT'],
        text: '✗'
      }
    } else if (isEqualsToQmenu) {
      return {
        style: styleMap['isOK'],
        text: '✓'
      }
    } else {
      return {
        style: styleMap['NotEqualsToBoth'],
        text: '✗'
      }
    }
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
    if (link.length < 30) {
      return link;
    }
    return link.slice(0, 30) + '...';
  }
}
