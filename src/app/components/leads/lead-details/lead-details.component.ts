import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { AlertType } from 'src/app/classes/alert-type';
import { CallLog } from 'src/app/classes/call-log';
import { RawLead } from 'src/app/classes/raw-lead';
import { ApiService } from 'src/app/services/api.service';
import { GlobalService } from 'src/app/services/global.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-lead-details',
  templateUrl: './lead-details.component.html',
  styleUrls: ['./lead-details.component.css']
})
export class LeadDetailsComponent implements OnInit {

  @Input() lead: RawLead;

  neighborQmenuLeads = [];
  logInEditing;
  showingJson = false;
  now = new Date();
  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
  }

  async ngOnChanges(changes: SimpleChanges) {
    this.neighborQmenuLeads = [];
    this.showingJson = false;
    this.logInEditing = null;
    this.now = new Date();

    if (this.lead) {
      console.log('load lead details')
      const projectedFields = [
        'name',
        'address',
        'city',
        'state',
        'zipcode',
        'phone',
        'website',
        'email',
        'hours',
        'cuisine',
        'latitude',
        'longitude',
        'density',
        'qmenuDensity',
        'qmenuScoreAvg',
        'qmenuScoreSum',
        'scoredQmenuDensity',
        'qmenuPercentage',
        'cuisines',
        'crawledAt',
        'googleListing',
        'campaigns',
        'restaurant',
        'contacts'
      ];
      const [detailedLead] = await this._api
        .post(environment.appApiUrl + "smart-restaurant/api", {
          method: 'get',
          resource: 'raw-lead',
          query: { _id: { $oid: this.lead._id } },
          payload: projectedFields.reduce((obj, field) => (obj[field] = 1, obj), {}),
          limit: 1
        })
        .toPromise();

      Object.assign(this.lead, detailedLead);

      // get a list of qmenu neighbors, and later rank according to dist limit 100

      const BOUNDING_RADIUS = 3; // 3x3 mile square
      const bound = this.calculateSquareRadius(this.lead.latitude, this.lead.longitude, BOUNDING_RADIUS);

      const neighborQmenuLeads = await this._api
        .post(environment.appApiUrl + "smart-restaurant/api", {
          method: 'get',
          resource: 'raw-lead',
          query: {
            latitude: { $gt: bound.latMin, $lt: bound.latMax },
            longitude: { $gt: bound.lngMin, $lt: bound.lngMax },
            'restaurant._id': { $exists: true },
          },
          payload: {
            name: 1,
            address: 1,
            city: 1,
            state: 1,
            'googleListing.address': 1,
            'restaurant._id': 1,
            'restaurant.score': 1,
            latitude: 1,
            longitude: 1
          },
          limit: 100
        })
        .toPromise();

      // inject a distance!
      console.log()
      neighborQmenuLeads.map(l => l.distance = this.getDistanceFromGeometry(l.latitude, l.longitude, detailedLead.latitude, detailedLead.longitude));
      neighborQmenuLeads.sort((l1, l2) => l1.distance - l2.distance);
      if (neighborQmenuLeads.length > 10) {
        neighborQmenuLeads.length = 10;
      }
      this.neighborQmenuLeads = neighborQmenuLeads;
    }
  }

  getScheduledAtStatusClass(lead) {
    const scheduledAt = lead.campaigns.map(c => c.scheduledAt)[0] || Date.now();
    const day = 24 * 3600 * 1000;
    const diff = new Date().valueOf() - (new Date(scheduledAt)).valueOf();
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

  async refreshGmb() {
    try {
      const crawledResult = await this._api.get(environment.qmenuApiUrl + "utils/scan-gmb", { q: decodeURIComponent(this.getQ(this.lead)) }).toPromise();
      await this._api
        .post(environment.appApiUrl + "smart-restaurant/api", {
          method: 'set',
          resource: 'raw-lead',
          query: {
            _id: { $oid: this.lead._id },
          },
          payload: {
            crawledAt: { $date: new Date() },
            googleListing: crawledResult
          }
        })
        .toPromise();
      // skip reload and directly mutate the data
      this.lead.crawledAt = new Date();
      this.lead.googleListing = crawledResult;
    } catch (error) {
      this._global.publishAlert(AlertType.Danger, 'Failed to refresh');
    }
  }

  async submitCallLog(event) {
    // save the call log (unshift!), skipping try-catch to be lazy!\
    await this._api
      .post(environment.appApiUrl + "smart-restaurant/api", {
        method: 'unshift',
        resource: 'raw-lead',
        query: {
          _id: { $oid: this.lead._id },
        },
        payload: {
          'campaigns.0.logs': event.object
        }
      })
      .toPromise();
    // immediately insert the new data to existing lead (bad mutation!) to avoid calling API to refresh
    this.lead.campaigns[0].logs = this.lead.campaigns[0].logs;
    this.lead.campaigns[0].logs.unshift(new CallLog(event.object));

    if (event.object.callbackTime) {
      // make callbackTime as scheduledAt
      await this._api
        .post(environment.appApiUrl + "smart-restaurant/api", {
          method: 'set',
          resource: 'raw-lead',
          query: {
            _id: { $oid: this.lead._id },
          },
          payload: {
            'campaigns.0.scheduledAt': { $date: event.object.callbackTime }
          }
        })
        .toPromise();
      this.lead.campaigns[0].scheduledAt = new Date(event.object.callbackTime);
    }

    event.acknowledge(null);
    this.logInEditing = null;
  }

  async editCallLog(log?: CallLog) {
    //  make the call-logger back compatible: to added 'phones' field with only one phone in it
    this.lead['phones'] = [this.lead.phone].filter(p => p);

    if (!log) {
      this.logInEditing = new CallLog();
      this.logInEditing.time = new Date();
      this.logInEditing.caller = this._global.user.username;
      this.logInEditing.phone = this.lead.phone;
    } else if (this.logInEditing === log) {
      // same as log in editing, so it's toggle
      this.logInEditing = null;
    } else {
      // editing given log
      this.logInEditing = log;
    }
  }

  getCallLogs() {
    const logs = [];
    (this.lead.campaigns || []).map(c => (c.logs || []).map(l => logs.push(new CallLog(l))));
    // sort by time
    logs.sort((l2, l1) => l1.time.valueOf() - l2.time.valueOf());
    return logs;
  }

  getQ(lead) {
    return encodeURIComponent([lead.name, lead.address, lead.city, lead.state].join(', '))
  }

  getFunnelComments(funnel) {
    return funnel.filters.map(f => f.comment).filter(c => c).join(", ");
  }

  getTimeZoneTime(state) {

    // NOTE: NOT SUPPER ACCURATE! one state could have multiple timezones. this is an approximation
    const stateTzMap = {
      PDT: ['WA', 'OR', 'CA', 'NV', 'AZ'],
      MDT: ['MT', 'ID', 'WY', 'UT', 'CO', 'NM'],
      CDT: ['ND', 'SD', 'MN', 'IA', 'NE', 'KS',
        'OK', 'TX', 'LA', 'AR', 'MS', 'AL', 'TN', 'MO', 'IL', 'WI'],
      EDT: ['MI', 'IN', 'KY', 'GA', 'FL', 'SC', 'NC', 'VA', 'WV',
        'OH', 'PA', 'NY', 'VT', 'NH', 'ME', 'MA', 'RJ', 'CT',
        'NJ', 'DE', 'MD', 'DC', 'RI'],
      HST: ['HI'],
      AKDT: ['AK']
    };

    const tzMap = {
      PDT: 'America/Los_Angeles',
      MDT: 'America/Denver',
      CDT: 'America/Chicago',
      EDT: 'America/New_York',
      HST: 'Pacific/Honolulu',
      AKDT: 'America/Anchorage',
    };

    const tz = Object.keys(stateTzMap).find(k => stateTzMap[k].indexOf(state) >= 0);

    const timezone = tzMap[tz];
    return new Date().toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: timezone });
  }

  /**
 * WORKS ONLY when there is no 108 -> -180 changes (normal areas of US)
 * https://stackoverflow.com/questions/1689096/calculating-bounding-box-a-certain-distance-away-from-a-lat-long-coordinate-in-j
 * Calculate the lat and len of a square around a point.
 * @return latMin, latMax, lngMin, lngMax
 */
  private calculateSquareRadius(lat, lng, radius) {
    // const R = 6371;  // earth radius in km
    const R = 3958.8; // earth radius in miles
    const latMin = lat - this.toDegrees(radius / R);
    const latMax = lat + this.toDegrees(radius / R);
    const lngMin = lng - this.toDegrees(radius / R / Math.cos(this.toRadians(lat)));
    const lngMax = lng + this.toDegrees(radius / R / Math.cos(this.toRadians(lat)));
    return { latMin, latMax, lngMin, lngMax };
  }

  private toDegrees(radians) {
    const pi = Math.PI;
    return radians * (180 / pi);
  }

  private toRadians(degrees) {
    const pi = Math.PI;
    return degrees * (pi / 180);
  }

  // everything in miles!
  private getDistanceFromGeometry(lat1, lng1, lat2, lng2) {
    const deg2rad = function (deg) {
      return deg * (Math.PI / 180)
    };

    var R = 3959; // Radius of the earth in miles
    var dLat = deg2rad(lat2 - lat1); // deg2rad below
    var dLon = deg2rad(lng2 - lng1);
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d;
  }

}
