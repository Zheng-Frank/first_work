import { GlobalService } from 'src/app/services/global.service';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ApiService } from '../../../../services/api.service';
import { Restaurant } from '@qmenu/ui';
import { contactSectionCallScript } from '../restaurant-setup-entry/setup-call-script';

enum NotifyChannels {
  Phone = 'Phone',
  Fax = 'Fax',
  Email = 'Email',
  SMS = 'SMS',
  CloudPrinting = 'Cloud Printing'
}

@Component({
  selector: 'app-restaurant-setup-contact',
  templateUrl: './restaurant-setup-contact.component.html',
  styleUrls: ['./restaurant-setup-contact.component.css']
})
export class RestaurantSetupContactComponent implements OnInit {

  @Input() restaurant: Restaurant;
  @Output() done = new EventEmitter();
  phoneNumber = '';
  faxNumber = '';
  emailAddress = '';
  smsNumber = '';
  checkedChannels = [];
  channels = [
    NotifyChannels.Phone,
    NotifyChannels.Fax,
    NotifyChannels.Email,
    NotifyChannels.SMS
  ];
  snapshot = {
    [NotifyChannels.Phone]: '',
    [NotifyChannels.SMS]: '',
    [NotifyChannels.Email]: '',
    [NotifyChannels.Fax]: ''
  };
  changeLanguageFlag = this._global.languageType;// this flag decides show English call script or Chinese
  showCallScript = false;// it will display call script when the switch is opened
  constructor(private _api: ApiService, private _global: GlobalService) {
  }

  ngOnInit() {
    this.init();
  }

  // make contactSectionCallScript from exporting becomes inner field of class RestaurantSetupContactComponent
  get contactSectionCallScript() {
    return contactSectionCallScript;
  }

  init() {
    let { googleListing = {}, people = [], logs = [], channels = [], orderNotifications = [] } = this.restaurant;
    let person = people[0] || {};
    let sms = (person.channels || []).find(x => x.type === 'SMS') || {};
    let phone = channels.find(x => x.type === 'Phone') || {};
    let email = channels.find(x => x.type === 'Email') || {};
    let fax = channels.find(x => x.type === 'Fax') || {};
    this.phoneNumber = phone.value || googleListing.phone;
    this.emailAddress = email.value;
    this.faxNumber = fax.value;
    this.smsNumber = sms.value;
    if (!this.channels.includes(NotifyChannels.CloudPrinting) && !logs.some(l => l.type === 'cloud-printing')) {
      this.channels.push(NotifyChannels.CloudPrinting);
    }
    this.checkedChannels = this.channels.filter(x => orderNotifications.some(y => y.channel && y.channel.type === x));
    this.snapshot = {
      [NotifyChannels.Phone]: this.phoneNumber,
      [NotifyChannels.SMS]: this.smsNumber,
      [NotifyChannels.Fax]: this.faxNumber,
      [NotifyChannels.Email]: this.emailAddress
    };
    // init call script according to some existing information.
    if (this.phoneNumber) {
      contactSectionCallScript.ChineseCallScript.bizphone_inquiry = contactSectionCallScript.ChineseCallScript.bizphone_inquiry.replace('[XXX]', "[" + this.phoneNumber + "]");
      contactSectionCallScript.EnglishCallScript.bizphone_inquiry = contactSectionCallScript.EnglishCallScript.bizphone_inquiry.replace('[XXX]', "[" + this.phoneNumber + "]");
    }
    if (this.smsNumber) {
      contactSectionCallScript.ChineseCallScript.cellphone_inquiry = contactSectionCallScript.ChineseCallScript.cellphone_inquiry.replace('[XXX]', "[" + this.smsNumber + "]");
      contactSectionCallScript.EnglishCallScript.cellphone_inquiry = contactSectionCallScript.EnglishCallScript.cellphone_inquiry.replace('[XXX]', "[" + this.smsNumber + "]");
    }
  }

  get notifyChannels() {
    return NotifyChannels;
  }

  inputChanged(channel) {
    let value = {
      [NotifyChannels.Phone]: this.phoneNumber,
      [NotifyChannels.SMS]: this.smsNumber,
      [NotifyChannels.Fax]: this.faxNumber,
      [NotifyChannels.Email]: this.emailAddress
    }[channel];
    if (!value) {
      this.checkedChannels = this.checkedChannels.filter(x => x !== channel);
    }
  }

  checkChannel(e) {
    let { target: { checked, value } } = e;
    if (checked) {
      this.checkedChannels.push(value);
    } else {
      this.checkedChannels = this.checkedChannels.filter(x => x !== value);
    }
  }

  canSave() {
    return this.phoneNumber || this.smsNumber || this.faxNumber || this.emailAddress || this.checkedChannels.includes(NotifyChannels.CloudPrinting);
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
            [NotifyChannels.Email]: this.emailAddress,
            [NotifyChannels.SMS]: this.smsNumber
          }[ch]
        } as any;
        let snapshot = this.snapshot[ch];
        let exist = channels.find(c => c.type === ch && [channel.value, snapshot].includes(c.value));
        if (exist) {
          if (channel.value) {
            exist.value = channel.value;
          } else {
            channels = channels.filter((x => x !== exist));
          }
        } else {
          if (channel.value) {
            channels.push(channel);
          }
        }
        let existOrderNotification = orderNotifications.find(x => x.channel && x.channel.type === ch && [channel.value, snapshot].includes(x.channel.value));
        if (existOrderNotification) {
          if (channel.value) {
            if (this.checkedChannels.includes(ch)) {
              existOrderNotification.channel = { ...channel };
              let notes = channel.notifications || [];
              if (!notes.includes('Order')) {
                channel.notifications = [...notes, 'Order'];
              }
            } else {
              // remove if no checked already
              orderNotifications = orderNotifications.filter(x => x !== existOrderNotification);
            }
          } else {
            orderNotifications = orderNotifications.filter(x => x !== existOrderNotification);
          }
        } else {
          if (channel.value && this.checkedChannels.includes(ch)) {
            orderNotifications.push({ channel: { ...channel } });
            let notes = channel.notifications || [];
            if (!notes.includes('Order')) {
              channel.notifications = [...notes, 'Order'];
            }
          }
        }
      }
    });
    this.done.emit({ orderNotifications, channels, logs });
  }

}
