import { AlertType } from 'src/app/classes/alert-type';
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
      label: 'From # (QM)'
    },
    {
      label: 'To # (RT/Customer)'
    },
    {
      label: 'CreatedAt',
      paths: ['createdAt'],
      sort: (a, b) => new Date(a || 0).valueOf() - new Date(b || 0).valueOf()
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
  happenedOptions = [happenedTypes.Last_24_Hours, happenedTypes.Last_48_Hours, happenedTypes.Last_3_days, happenedTypes.Last_30_days, happenedTypes.Custom_Range];
  happenedOption = happenedTypes.Last_48_Hours;
  fromDate = '';
  toDate = '';
  searchFilter = '';
  system;
  showAdvancedSearch: boolean = false;
  pagination = true;
  restaurants = [];
  constructor(private _api: ApiService, private _global: GlobalService) { }

  async ngOnInit() {
    this.system = (await this._api.get(environment.qmenuApiUrl + 'generic', { resource: 'system' }).toPromise())[0] || {};
    this.restaurants = await this._global.getCachedRestaurantListForPicker();
    await this.populateSMSProblems();
  }

  getTypeIcon(type) {
    return {
      [toOptionTypes.To_RT]: 'utensils',
      [toOptionTypes.To_Customer]: 'user'
    }[type] || 'question';
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
    this.rows = [];
    this.filteredRows = [];
    // last 48 hours by default
    let timeQuery = [
      {
        'createdAt': { $gt: new Date().valueOf() - 2 * 24 * 3600000 }
      },
      {
        'createdAt': { $lt: new Date().valueOf() }
      }
    ];
    if (this.showAdvancedSearch) {
      if (this.happenedOption === happenedTypes.Last_24_Hours) {
        timeQuery = [
          {
            'createdAt': { $gt: new Date().valueOf() - 1 * 24 * 3600000 }
          },
          {
            'createdAt': { $lt: new Date().valueOf() }
          }
        ];
      } else if (this.happenedOption === happenedTypes.Last_48_Hours) {
        timeQuery = [
          {
            'createdAt': { $gt: new Date().valueOf() - 2 * 24 * 3600000 }
          },
          {
            'createdAt': { $lt: new Date().valueOf() }
          }
        ];
      } else if (this.happenedOption === happenedTypes.Last_3_days) {
        timeQuery = [
          {
            'createdAt': { $gt: new Date().valueOf() - 3 * 24 * 3600000 }
          },
          {
            'createdAt': { $lt: new Date().valueOf() }
          }
        ];
      } else if (this.happenedOption === happenedTypes.Last_30_days) {
        timeQuery = [
          {
            'createdAt': { $gt: new Date().valueOf() - 30 * 24 * 3600000 }
          },
          {
            'createdAt': { $lt: new Date().valueOf() }
          }
        ];
      } else if (this.happenedOption === happenedTypes.Custom_Range) {
        if (!this.fromDate || !this.toDate) {
          return this._global.publishAlert(AlertType.Danger, "please input a correct time date format!");
        }
        if (new Date(this.fromDate).valueOf() - new Date(this.toDate).valueOf() > 0) {
          return this._global.publishAlert(AlertType.Danger, "Please input a correct date format, from time is less than or equals to time!");
        }

        timeQuery = [
          {
            'createdAt': { $gt: new Date(this.fromDate).valueOf() }
          },
          {
            'createdAt': { $lt: new Date(this.toDate).valueOf() }
          }
        ];
      }
    }
    // a job has several event, and need to find the final one 
    const smsJobs = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: "job",
      aggregate: [
        {
          $match: {
            $or: [
              { name: 'send-sms' },
              { name: 'send-order-sms' },
              { name: 'sms-login' }
            ],
            "logs.eventName": "sms-status",
            "logs.status": "failed",
            $and: timeQuery
          }
        },
        {
          $project: {
            name: 1,
            logs: {
              $slice: ['$logs', -1]
            }
          }
        }
      ]
    }, 10000);
    // divided eventIds  
    const eventIds = [];
    smsJobs.forEach(job => {
      (job.logs || []).forEach(log => {
        if (log.eventId && eventIds.indexOf(log.eventId) === -1) {
          eventIds.push(log.eventId);
        }
      });
    });
    // the eventIds array is very large and need to slice it.
    const split_arr = (arr, len) => {
      var newArr = [];
      for (let i = 0; i < arr.length; i += len) {
        newArr.push(arr.slice(i, i + len));
      }
      return newArr;
    }
    /* spell the following conditions
     $or:[
       {
        _id: { $in:['xx','xx'] }
       }
     ]
    */
    let tempEventIds = split_arr(eventIds, Math.ceil(eventIds.length / 100));
     let idsOrArr = [];
     for (let i = 0; i < tempEventIds.length; i++) {
       let item = {
         _id: {
           $in: tempEventIds[i]
         }
       }
       idsOrArr.push(item);
     }
     console.log(JSON.stringify(idsOrArr));
    // query fail sms event
    const failedSMSEvents = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'event',
      aggregate: [
        {
          $match: {
            $or: idsOrArr
          }
        },
        {
          $project: {
            /* bandwidth*/
            // send status (error)
            'params.body.description': 1, // bandwidth
            // number
            'params.body.message.from': 1, // bandwidth
            'params.body.to': 1, // bandwidth

            /* plivo */
            // send status (error)
            'params.body.Status': 1, // plivo
            // number
            'params.body.From': 1, // plivo and twilio
            'params.body.To': 1, // plivo and twilio

            /* twilio */
            // send status (error)
            'params.body.MessageStatus': 1, // twilio

            // provider
            providerName: '$params.providerName',
            // date
            createdAt: 1,
          }
        }
      ],
    }, 10000);
 
    const bandwidth = providerTypes.Bandwidth.toLowerCase();
    const plivo = providerTypes.Plivo.toLowerCase();
    const twilio = providerTypes.Twilio.toLowerCase();
    const providerMap = {
      [twilio]: providerTypes.Twilio,
      [plivo]: providerTypes.Plivo,
      [bandwidth]: providerTypes.Bandwidth
    }
    let providerKeys = Object.keys(providerMap);
    failedSMSEvents.forEach(event => {
      if (providerKeys.includes(event.providerName)) {
        let item = {
          provider: providerMap[event.providerName],
          createdAt: new Date(event.createdAt),
          error: this.getEventError(event)
        }
        if (event.providerName === bandwidth) {
          item['fromNumber'] = this.getEventPhoneNumber(event.providerName, ((event.params.body[0] || {}).message || {}).from);
          item['toNumber'] = this.getEventPhoneNumber(event.providerName, (event.params.body[0] || {}).to);
          item['type'] = this.getEventType(event.providerName, (event.params.body[0] || {}).to);
          item['currentProvider'] = providerMap[this.getCurrentProvider(event.providerName, event.params.body.to)];
        } else if (event.providerName === plivo) {
          item['fromNumber'] = this.getEventPhoneNumber(event.providerName, (event.params.body || {}).From);
          item['toNumber'] = this.getEventPhoneNumber(event.providerName, (event.params.body || {}).To);
          item['type'] = this.getEventType(event.providerName, (event.params.body || {}).To);
          item['currentProvider'] = providerMap[this.getCurrentProvider(event.providerName, event.params.body.To)];
        } else if (event.providerName === twilio) {
          item['fromNumber'] = this.getEventPhoneNumber(event.providerName, (event.params.body || {}).From);
          item['toNumber'] = this.getEventPhoneNumber(event.providerName, (event.params.body || {}).To);
          item['type'] = this.getEventType(event.providerName, (event.params.body || {}).To);
          item['currentProvider'] = providerMap[this.getCurrentProvider(event.providerName, event.params.body.To)];
        }
        this.rows.push(item);
      }
    });
    this.filterRows();
  }

  toggleShowAdvancedSearch() {
    this.showAdvancedSearch = !this.showAdvancedSearch;
    if (!this.showAdvancedSearch) {
      this.searchFilter = '';
      this.fromDate = '';
      this.toDate = '';
      this.populateSMSProblems();
    } else {
      this.searchFilter = '';
      this.happenedOption = happenedTypes.Last_48_Hours;
    }
  }

  debounce(value) {
    this.filterRows();
  }

  filterRows() {
    this.filteredRows = this.rows;
    // filter by provider
    if (this.providerOption !== providerTypes.All) {
      if (this.providerOption === providerTypes.Bandwidth) {
        this.filteredRows = this.filteredRows.filter(row => row.provider === providerTypes.Bandwidth);
      } else if (this.providerOption === providerTypes.Plivo) {
        this.filteredRows = this.filteredRows.filter(row => row.provider === providerTypes.Plivo);
      } else if (this.providerOption === providerTypes.Twilio) {
        this.filteredRows = this.filteredRows.filter(row => row.provider === providerTypes.Twilio);
      }
    }
    // filter by type 
    if (this.toOption !== toOptionTypes.All) {
      if (this.toOption === toOptionTypes.To_RT) {
        this.filteredRows = this.filteredRows.filter(row => row.type.rtInfo);
      } else if (this.toOption === toOptionTypes.To_Customer) {
        this.filteredRows = this.filteredRows.filter(row => !row.type.rtInfo);
      }
    }
    // filter by restaurant 
    if (this.searchFilter && this.searchFilter.trim().length > 0) {
      this.filteredRows = this.filteredRows.filter(row => {
        let lowerCaseSearchFilter = this.searchFilter.toLowerCase();
        if (row.type.rtInfo) {
          const nameMatch = (row.type.rtInfo.name || "").toLowerCase().includes(lowerCaseSearchFilter);
          const idMatch = (row.type.rtInfo._id || "").toLowerCase().includes(lowerCaseSearchFilter);
          return nameMatch || idMatch;
        } else {
          return false;
        }
      });
    }
  }

  getEventError(event) {
    const bandwidth = providerTypes.Bandwidth.toLowerCase();
    const plivo = providerTypes.Plivo.toLowerCase();
    const twilio = providerTypes.Twilio.toLowerCase();
    switch (event.providerName) {
      case plivo:
        return (event.params.body || {}).Status;
      case twilio:
        return (event.params.body || {}).MessageStatus;
      case bandwidth:
        return (event.params.body[0] || {}).description;
      default:
        break;
    }
  }

  getCurrentProvider(providerName, phone) {
    if (this.system.smsSettings.customized) {
      let toPhone = this.getEventPhoneNumber(providerName, phone);
      if ((this.system.smsSettings.customized.toPhones || []).some(phone => phone === toPhone)) {
        return this.system.smsSettings.customized.providerName;
      } else {
        return this.system.smsSettings.defaultProviderName;
      }
    }
    return this.system.smsSettings.defaultProviderName;
  }


  getEventPhoneNumber(providerName, phone) {
    const bandwidth = providerTypes.Bandwidth.toLowerCase();
    const plivo = providerTypes.Plivo.toLowerCase();
    const twilio = providerTypes.Twilio.toLowerCase();
    switch (providerName) {
      case plivo:
        return (phone || '').toString().substring(1);// 1xxxxxxxxxx
      case twilio:
      case bandwidth:
        return (phone || '').toString().substring(2); // +1xxxxxxxxxx
      default:
        break;
    }
  }

  getEventType(providerName, phone) {
    let toPhone = this.getEventPhoneNumber(providerName, phone);
    let restaurant = this.restaurants.filter(rt => (rt.channels || []).some(ch => ch.value === toPhone))[0];;
    let item = {
      text: restaurant ? toOptionTypes.To_RT : toOptionTypes.To_Customer
    }
    if (restaurant) {
      item['rtInfo'] = {
        _id: restaurant._id,
        name: restaurant.name
      };
    }
    return item;
  }

}
