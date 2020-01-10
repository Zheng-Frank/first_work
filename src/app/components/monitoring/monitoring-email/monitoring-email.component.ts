import { Component, OnInit } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";

@Component({
  selector: 'app-monitoring-email',
  templateUrl: './monitoring-email.component.html',
  styleUrls: ['./monitoring-email.component.css']
})
export class MonitoringEmailComponent implements OnInit {
  myColumnDescriptors = [
    {
      label: "Restaurant"
    },
    {
      label: "Email"
    },
    {
      label: "Type"
    }
  ];

  badSnsEventRows = [];
  emailRestaurantDict = {};

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
  }

  async findFailedEmails() {
    this.badSnsEventRows = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'event',
      query: {
        "name": "sns",
        "params.mail": { $exists: true },
        createdAt: { $gt: new Date().valueOf() - 1 * 24 * 3600000 }
      },
      projection: {
        "params.notificationType": 1,
        "params.mail.destination": 1
      },
      limit: 30000
    }).toPromise();

    const badJobRows = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'job',
      query: {
        "name": "send-order-email",
        "logs.status": "error",
        createdAt: { $gt: new Date().valueOf() - 1 * 24 * 3600000 }
      },
      projection: {
        "params.to": 1,
        "logs.errorDetails.message": 1
      },
      limit: 300
    }).toPromise();

    // fit badJobRows to badSnsEventRows (lazy)
    badJobRows.map(row => {
      const badRow = {
        params: {
          mail: {
            destination: [row.params.to]
          },
          notificationType: row.logs[0].errorDetails.message
        }
      };
      this.badSnsEventRows.push(badRow);
    });


    const restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      projection: {
        name: 1,
        channels: 1
      }
    }, 6000);

    restaurants.map(restaurant => {
      const emailsInChannels = (restaurant.channels || []).filter(c => c.type === 'Email' && c.notifications && c.notifications.indexOf('Order') >= 0).map(c => c.value).map(e => e.toLowerCase());
      emailsInChannels.map(email => this.emailRestaurantDict[email] = restaurant);
    });

    // distinct by email!
    for (let i = this.badSnsEventRows.length - 1; i > 0; i--) {
      if (this.badSnsEventRows.slice(0, i).some(row => row.params.mail.destination[0] === this.badSnsEventRows[i].params.mail.destination[0])) {
        this.badSnsEventRows.splice(i, 1);
      }
    }

  }

  getRestaurant(row) {
    return this.emailRestaurantDict[row.params.mail.destination[0]];
  }

}
