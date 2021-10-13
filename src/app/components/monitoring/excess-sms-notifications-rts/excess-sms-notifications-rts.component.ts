import { Helper } from './../../../classes/helper';
import { AlertType } from './../../../classes/alert-type';
import { filter } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { ApiService } from './../../../services/api.service';
import { Component, OnInit } from '@angular/core';
import { GlobalService } from 'src/app/services/global.service';

@Component({
  selector: 'app-excess-sms-notifications-rts',
  templateUrl: './excess-sms-notifications-rts.component.html',
  styleUrls: ['./excess-sms-notifications-rts.component.css']
})
export class ExcessSmsNotificationsRtsComponent implements OnInit {


  excessSMSRTs = [];
  restaurantsColumnDescriptors = [
    {
      label: 'Number'
    },
    {
      label: "Restaurant",
      paths: ['name'],
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },
    {
      label: "Channels",
      paths: ['channels'],
      sort: (a, b) => b.filter(channel => channel.type === 'SMS' && channel.notifications && channel.notifications.includes('Order')).length - a.filter(channel => channel.type === 'SMS' && channel.notifications && channel.notifications.includes('Order')).length
    }
  ];
  channelTypeToFaClassMap = {
    'Email': 'fas fa-envelope',
    'Phone': 'fas fa-phone-volume',
    'SMS': 'fas fa-comments',
    'Fax': 'fas fa-fax'
  };
  Languages = { ENGLISH: 'English', CHINESE: 'Chinese' };
  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
    this.aggregateExcessSMSRTs();
  }

  async deleteChannel(rt, channel) {
    // remove this channel from local channels 
    let newChannels = (rt.channels || []).filter(c => !Helper.areObjectsEqual(c, channel));
    // update remote channels of restaurant 
    this._api
      .patch(environment.qmenuApiUrl + "generic?resource=restaurant", [{
        old: {
          _id: rt._id
        }, new: {
          _id: rt._id,
          channels: newChannels
        }
      }])
      .subscribe(
        result => {
          // let's update original, assuming everything successful
          this.excessSMSRTs.forEach(restaurant => {
            if (restaurant._id === rt._id) {
              rt.channels = newChannels;
            }
          });
          this._global.publishAlert(
            AlertType.Success,
            "Delete successfully"
          );
        },
        error => {
          this._global.publishAlert(AlertType.Danger, "Error updating to DB! " + error.message);
        }
      );
    // it means this restaurant has a right channels configuration and should't appear in the table, if newChannels.length < 4 
    if (newChannels.filter(channel => channel.type === 'SMS' && channel.notification && channel.notification.includes('Order')).length < 4) {
      await this.aggregateExcessSMSRTs();
    }
  }

  join(values) {
    return (values || []).join(', ');
  }

  async aggregateExcessSMSRTs() {
    this.excessSMSRTs = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      aggregate: [
        {
          '$match': {
            'disabled': {
              '$ne': true
            },
            'channels.type': 'SMS',
            'channels.notifications': {
              '$exists': true,
              '$elemMatch': { // At least one element satisfies the condition
                '$eq': 'Order'
              }
            },
            'channels.3': {
              '$exists': true
            }
          }
        },
        {
          '$project': {
            'name': 1,
            'channels': 1
          }
        }
      ],
      limit: 20000
    }).toPromise();
    this.excessSMSRTs = this.excessSMSRTs.filter(rt => (rt.channels || []).filter(c => c.type === 'SMS' && c.notifications && c.notifications.includes('Order')).length >= 4)
    this.excessSMSRTs.sort((a,b)=>b.channels.filter(channel => channel.type === 'SMS' && channel.notifications && channel.notifications.includes('Order')).length - a.channels.filter(channel => channel.type === 'SMS' && channel.notifications && channel.notifications.includes('Order')).length);
  }

  isSMSChannel(channel) {
    return channel.type === 'SMS' && channel.notifications && channel.notifications.includes('Order')
  }

}
