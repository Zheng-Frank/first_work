import { ApiService } from './../../../services/api.service';
import { environment } from './../../../../environments/environment';
import { Component, OnInit } from '@angular/core';
import { GlobalService } from 'src/app/services/global.service';

enum toOptionTypes {
  All = 'Type?',
  To_RT = 'To Restaurant',
  To_Customer = 'To Customer'
}

enum providerTypes {
  All = 'Provider?',
  Twilio = 'Twilio',
  Plivo = 'Plivo',
  Bandwidth = 'Bandwidth'
}

enum happenedTypes {
  All = 'Happened?',
  Last_24_Hours = 'Last 24 hrs',
  Last_48_Hours = 'Last 48 hrs',
  Last_3_days = 'Last 3 days',
  Last_30_days = 'Last 30 days',
  Custom_Range = 'Custom range'
}

@Component({
  selector: 'app-mornitoring-sms',
  templateUrl: './mornitoring-sms.component.html',
  styleUrls: ['./mornitoring-sms.component.css']
})
export class MornitoringSmsComponent implements OnInit {

  rows = [];
  filteredRows = []; // the filter rows used to show types of sms problem.
  myColumnDescriptors = [
    {
      label: 'Type'
    },
    {
      label: 'Number'
    },
    {
      label: 'Date'
    },
    {
      label: 'Provider'
    },
    {
      label: 'Current Provider'
    },
    {
      label: 'Error'
    }
  ];
  // filtered conditions
  toOptions = [toOptionTypes.All, toOptionTypes.To_RT, toOptionTypes.To_Customer];
  toOption = toOptionTypes.All;
  providerOptions = [providerTypes.All, providerTypes.Twilio, providerTypes.Plivo, providerTypes.Bandwidth];
  providerOption = providerTypes.All;
  happenedOptions = [happenedTypes.All, happenedTypes.Last_24_Hours, happenedTypes.Last_48_Hours, happenedTypes.Last_3_days, happenedTypes.Last_30_days, happenedTypes.Custom_Range];
  happenedOption = happenedTypes.All;
  fromDate = '';
  toDate = '';
  searchFilter = '';
  system;

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
    this.populateSMSProblems();
  }

  get happenedTypes() {
    return happenedTypes;
  }
  /**
   * json example:
   * twilio:
  {
  "_id": "620d155597790d0009bdede7",
  "body": {
    "SmsSid": "SMadf8b25e3b7d4ff69d2bddc2534ddbbb",
    "SmsStatus": "sent",
    "MessageStatus": "sent",
    "To": "+16145965997",
    "MessageSid": "SMadf8b25e3b7d4ff69d2bddc2534ddbbb",
    "AccountSid": "AC6b8fb6f4b3f2352ae1cde75c033bbe20",
    "From": "+18555588548",
    "ApiVersion": "2010-04-01"
  },
  "providerName": "twilio"
}
  plivo:
   {
  "_id": "6079d9e1a54aca975677eb06",
  "name": "sms-status",
  "params": {
    "providerName": "plivo",
    "jobId": "6079d9e00a125f56fde6faba",
    "body": {
      "From": "18447935942",
      "MessageTime": "2021-04-16+18:39:29.088198",
      "MessageUUID": "13bd7acc-9ee3-11eb-b35e-0242ac110005",
      "ParentMessageUUID": "13bd7acc-9ee3-11eb-b35e-0242ac110005",
      "PartInfo": "1+of+1",
      "PowerpackUUID": "",
      "QueuedTime": "2021-04-16+18:39:29.089793",
      "Sequence": "1",
      "Status": "queued",
      "To": "14042424838",
      "TotalAmount": "0.00000",
      "TotalRate": "0.00000",
      "Units": "1",
      "action": "sms-callback",
      "event": "{\"name\":\"sms-status\",\"params\":{\"providerName\":\"plivo\",\"jobId\":\"6079d9e00a125f56fde6faba\"}}"
    }
  },
  "createdAt": 1618598369369,
  "logs": [
    {
      "time": "2021-04-16T18:39:29.601Z",
      "status": "triggered"
    }
  ]
}
  bandwidth: 
   {
  "_id": "606e6a6bbcf64e8cce847623",
  "name": "sms-status",
  "params": {
    "providerName": "bandwidth",
    "body": [
      {
        "time": "2021-04-08T02:28:58.971Z",
        "type": "message-delivered",
        "to": "+14075807504",
        "description": "ok",
        "message": {
          "id": "161784893790627hhq62iyvsaupsl",
          "owner": "+14702228341",
          "applicationId": "23a06612-164e-452e-90ac-03358a13243c",
          "time": "2021-04-08T02:28:57.906Z",
          "segmentCount": 1,
          "direction": "out",
          "to": [
            "+14075807504"
          ],
          "from": "+14702228341",
          "text": "",
          "tag": "606e69c8cb126c0009c7a03d"
        }
      }
    ]
  },
  "createdAt": 1617848939182,
  "logs": [
    {
      "time": "2021-04-08T02:28:59.280Z",
      "status": "triggered"
    }
  ]
}


   */
  async populateSMSProblems() {
    // 90 days by default
    // bandwidth event
    const bandwidth = providerTypes.Bandwidth.toLowerCase();
    const plivo = providerTypes.Plivo.toLowerCase();
    const twilio = providerTypes.Twilio.toLowerCase();
    const failedBandwidthEvents = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'event',
      aggregate: [
        {
          $match: {
            'name': 'sms-status',
            'params.providerName': bandwidth,
            'params.body.type': 'message-failed',
            $and: [
              {
                'createdAt': { $gt: new Date().valueOf() - 7 * 24 * 3600000 }
              },
              {
                'createdAt': { $lt: new Date().valueOf() }
              }
            ]
          }
        },
        {
          $project: {
            // send status (error)
            'params.body.type': 1, // bandwidth
            // number
            'params.body.message.from': 1, // bandwidth
            'params.body.to': 1, // bandwidth
            // provider
            providerName: '$params.providerName',
            // date
            createdAt: 1
          }
        }
      ],
    }, 10000);
    // plivo event
    const failedPlivoEvents = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'event',
      aggregate: [
        {
          $match: {
            'name': 'sms-status',
            'params.providerName': plivo,
            'params.body.Status': 'undelivered',
            $and: [
              {
                'createdAt': { $gt: new Date().valueOf() - 7 * 24 * 3600000 }
              },
              {
                'createdAt': { $lt: new Date().valueOf() }
              }
            ]
          }
        },
        {
          $project: {
            // send status (error)
            'params.body.Status': 1, // plivo
            // number
            'params.body.From': 1, // plivo
            'params.body.To': 1, // plivo
            // provider
            providerName: '$params.providerName',
            // date
            createdAt: 1
          }
        }
      ],
    }, 10000);
    // twilio event 
    const failedTwilioEvents = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'event',
      aggregate: [
        {
          $match: {
            'name': 'sms-status',
            'params.providerName': twilio,
            'params.body.MessageStatus': 'undelivered',
            $and: [
              {
                'createdAt': { $gt: new Date().valueOf() - 7 * 24 * 3600000 }
              },
              {
                'createdAt': { $lt: new Date().valueOf() }
              }
            ]
          }
        },
        {
          $project: {
            // send status (error)
            'params.body.MessageStatus': 1, // twilio
            // number
            'params.body.From': 1, // twilio
            'params.body.To': 1, // twilio
            // provider
            providerName: '$params.providerName',
            // date
            createdAt: 1
          }
        }
      ],
    }, 10000);
    const failedSMSEvents = [...new Set(failedBandwidthEvents), ...new Set(failedPlivoEvents), ...new Set(failedTwilioEvents)];
    const providerMap = {
      [providerTypes.Twilio]: twilio,
      [providerTypes.Plivo]: plivo,
      [providerTypes.Bandwidth]: bandwidth
    }
    let providerKeys = Object.keys(providerMap);
    failedSMSEvents.forEach(event => {
      if (providerKeys.includes(event.providerName)) {
        let item = {
          type: this.getEventType(event),
          provider: providerMap[event.providerName],
          currentProvider: providerMap[this.getCurrentProvider(event)],
          createdAt: event.createdAt,
        }
        if (event.providerName === bandwidth) {
          item['fromNumber'] = this.getEventPhoneNumber(event.providerName, event.params.body.message.from);
          item['toNumber'] = this.getEventPhoneNumber(event.providerName, event.params.body.to);
        } else if (event.providerName === plivo || event.providerName === twilio) {
          item['fromNumber'] = this.getEventPhoneNumber(event.providerName, event.params.body.From);
          item['toNumber'] = this.getEventPhoneNumber(event.providerName, event.params.body.To);
        } 
        this.rows.push(item);
      }
    });
    // use sms settings of system to construct the currentProvider of rows
    this.system = (await this._api.get(environment.qmenuApiUrl + 'generic', { resource: 'system' }).toPromise())[0] || {};
    this.filterRows();
  }

  filterRows() {
    this.filteredRows = this.rows;
  }

  getCurrentProvider(event) {
    const bandwidth = providerTypes.Bandwidth.toLowerCase();
    const plivo = providerTypes.Plivo.toLowerCase();
    const twilio = providerTypes.Twilio.toLowerCase();
    if (this.system.smsSettings.customized) {
      let fromPhone = '';
      switch (event.providerName) {
        case plivo:
          fromPhone = (event.params.body.From || '').length.toString().substring(1);// 1xxxxxxxxxx
        case twilio:
        case bandwidth:
          fromPhone = (event.params.body.message.from || '').length.toString().substring(2); // +1xxxxxxxxxx
        default:
          break;
      }
      return (this.system.smsSettings.customized.toPhones || []).find(phone => phone === fromPhone).providerName;
    }
    return this.system.smsSettings.defaultProviderName;
  }


  getEventPhoneNumber(providerName, phone) {
    const bandwidth = providerTypes.Bandwidth.toLowerCase();
    const plivo = providerTypes.Plivo.toLowerCase();
    const twilio = providerTypes.Twilio.toLowerCase();
    switch (providerName) {
      case plivo:
        return (phone || '').length.toString().substring(1);// 1xxxxxxxxxx
      case twilio:
      case bandwidth:
        return (phone || '').length.toString().substring(2); // +1xxxxxxxxxx
      default:
        break;
    }
  }

  async getEventType(event) {
    const restaurants = await this._global.getCachedRestaurantListForPicker();
    let restaurant = undefined;
    const bandwidth = providerTypes.Bandwidth.toLowerCase();
    const plivo = providerTypes.Plivo.toLowerCase();
    const twilio = providerTypes.Twilio.toLowerCase();
    switch (event.providerName) {
      case plivo:
        let toNumber = (event.params.body.To || '').length.toString().substring(1);// 1xxxxxxxxxx
        restaurant = restaurants.filter(rt => (rt.channels || []).some(ch => ch.value === toNumber))[0];
        break;
      case twilio:
      case bandwidth:
        let toNumber1 = (event.params.body.to || '').length.toString().substring(2); // +1xxxxxxxxxx
        restaurant = restaurants.filter(rt => (rt.channels || []).some(ch => ch.value === toNumber1))[0];
        break;
      default:
        break;
    }
    let item = {
      type: restaurant ? toOptionTypes.To_RT : toOptionTypes.To_Customer
    }
    if (restaurant) {
      item['rtInfo'] = restaurant;
    }
    return item;
  }

  async populateSMSProblemsByTime() {

  }

}
