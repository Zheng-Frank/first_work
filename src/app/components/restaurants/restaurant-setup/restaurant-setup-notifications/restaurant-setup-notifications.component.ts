import {Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges} from '@angular/core';
import {environment} from '../../../../../environments/environment';
import {ApiService} from '../../../../services/api.service';
import {Restaurant} from '@qmenu/ui';

enum NotifyChannels {
  Phone = 'Phone',
  Fax = 'Fax',
  Email = 'Email',
  SMS = 'SMS',
  CloudPrinting = 'Cloud Printing'
}

@Component({
  selector: 'app-restaurant-setup-notifications',
  templateUrl: './restaurant-setup-notifications.component.html',
  styleUrls: ['./restaurant-setup-notifications.component.css']
})
export class RestaurantSetupNotificationsComponent implements OnInit, OnChanges {

  @Input() restaurant: Restaurant;
  @Output() done = new EventEmitter();
  phoneNumber = '';
  faxNumber = '';
  email = '';
  smsNumber = '';
  checkedChannels = [];
  channels = [
    NotifyChannels.Phone,
    NotifyChannels.Fax,
    NotifyChannels.Email,
    NotifyChannels.SMS
  ];

  constructor(private _api: ApiService) {
  }

  ngOnInit() {
    this.init();
  }

  init() {
    let {googleListing = {}, people = [], logs, channels = []} = this.restaurant;
    let person = people[0] || {};
    let sms = (person.channels || []).find(x => x.type === 'SMS') || {};
    let phone = channels.find(x => x.type === 'Phone') || {};
    this.phoneNumber = phone.value || googleListing.phone;
    this.smsNumber = sms.value;
    if (!this.channels.includes(NotifyChannels.CloudPrinting) && !logs.some(l => l.type === 'cloud-printing')) {
      this.channels.push(NotifyChannels.CloudPrinting);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.restaurant.currentValue !== changes.restaurant.previousValue) {
      this.init();
    }
  }

  get notifyChannels() {
    return NotifyChannels;
  }

  checkChannel(e) {
    let {target: {checked, value}} = e;
    if (checked) {
      this.checkedChannels.push(value);
    } else {
      this.checkedChannels = this.checkedChannels.filter(x => x !== value);
    }
  }

  canSave() {
    return this.phoneNumber || this.smsNumber || this.faxNumber || this.email || this.checkedChannels.includes(NotifyChannels.CloudPrinting);
  }

  async save() {
    let { logs = [], channels = [], orderNotifications = [] } = this.restaurant;
    this.channels.forEach(ch => {
      // if checked cloud printing, add a log
      if (ch === NotifyChannels.CloudPrinting && this.checkedChannels.includes(ch)) {
        logs.push({
          type: 'cloud-printing',
          problem: 'Restaurant asked us to setup cloud printing',
          response: 'Need to set up cloud printing for order notifications',
          resolved: false
        });
      } else {
        let channel = {
          type: ch,
          value: {
            [NotifyChannels.Phone]: this.phoneNumber,
            [NotifyChannels.Fax]: this.faxNumber,
            [NotifyChannels.Email]: this.email,
            [NotifyChannels.SMS]: this.smsNumber
          }[ch]
        };
        if (channel.value && !channels.some(x => x.type === ch && x.value === channel.value)) {
          channels.push(channel);
        }
        // if checked these channels, add to order notifications
        if (channel.value && this.checkedChannels.includes(ch) &&
          !orderNotifications.some(x => x.channel && x.channel.type === ch && x.channel.value === channel.value)) {
          orderNotifications.push({channel});
        }
      }
    });
    this.done.emit({orderNotifications, channels, logs});
  }

}
