import { GlobalService } from 'src/app/services/global.service';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { contactSectionCallScript } from '../restaurant-setup-entry/setup-call-script';
enum NotifyChannels {
  Phone = 'Phone',
  Fax = 'Fax',
  Email = 'Email',
  SMS = 'SMS',
  CloudPrinting = 'Cloud Printing'
}

enum NotificationsTypes {
  Order = 'Order',
  Invoice = 'Invoice'
}

@Component({
  selector: 'app-restaurant-setup-contact',
  templateUrl: './restaurant-setup-contact.component.html',
  styleUrls: ['./restaurant-setup-contact.component.css']
})
export class RestaurantSetupContactComponent implements OnInit {

  @Input() restaurant: Restaurant;
  @Output() done = new EventEmitter();
  channels;
  notifyChannelTypes;
  changeLanguageFlag = this._global.languageType;// this flag decides show English call script or Chinese
  showCallScript = false;// it will display call script when the switch is opened
  constructor(private _global: GlobalService) { }

  ngOnInit() {
    this.init();
  }

  // make contactSectionCallScript from exporting becomes inner field of class RestaurantSetupContactComponent
  get contactSectionCallScript() {
    return contactSectionCallScript;
  }

  init() {
    this.channels = [];
    this.notifyChannelTypes = [NotifyChannels.Phone, NotifyChannels.SMS, NotifyChannels.Fax, NotifyChannels.Email];
    let { googleListing = {}, people = [], logs = [], channels = [] } = this.restaurant;
    if (!this.channels.includes(NotifyChannels.CloudPrinting) && !logs.some(l => l.type === 'cloud-printing')) {
      this.notifyChannelTypes.push(NotifyChannels.CloudPrinting);
    }
    if (channels.length > 0) {
      channels.forEach(channel => {
        if (channel && ((channel.notifications || []).includes(NotificationsTypes.Order) || (channel.notifications || []).includes(NotificationsTypes.Invoice))) {
          let ch = {
            value: channel.value,
            type: channel.type,
            notifications: {
              order: false,
              invoice: false
            }
          };

          if ((channel.notifications || []).includes(NotificationsTypes.Order)) {
            ch.notifications.order = true;
          }
          if ((channel.notifications || []).includes(NotificationsTypes.Invoice)) {
            ch.notifications.invoice = true;
          }
          this.channels.push(ch);
        }
      });
    } else {
      let person = people[0] || {};
      // add 5 rows includes different notification channel
      for (let i = 0; i < this.notifyChannelTypes.length; i++) {
        let ch = {
          value: '',
          type: '',
          notifications: {
            order: false,
            invoice: false
          }
        };
        if (i === 0) {
          ch.value = googleListing.phone;
          ch.type = NotifyChannels.Phone;
        } else if (i === 1) {
          let sms = (person.channels || []).find(x => x.type === 'SMS') || {};
          ch.value = sms.value;
          ch.type = NotifyChannels.SMS;
        } else {
          ch.type = this.notifyChannelTypes[i];
        }
        this.channels.push(ch);
      }
    }
  }

  get NotifyChannels() {
    return NotifyChannels;
  }

  addNewRow() {
    let ch = {
      value: '',
      type: '',
      notifications: {
        order: false,
        invoice: false
      }
    };
    this.channels.push(ch);
  }

  canSave() {
    return this.channels.some(ch => ch.value && ch.notifications.order === NotificationsTypes.Order);
  }

  // invoive doesn't have cloud print notification channel, and need to disable 
  selectChannelType(channel) {
    if (this.disabledNotify(channel)) {
      channel.notifications.invoice = false;
      channel.value = '';
    }
  }

  disabledNotify(channel) {
    return channel && channel.type === NotifyChannels.CloudPrinting;
  }

  async save() {
    let { logs = [], channels = [], orderNotifications = [] } = this.restaurant;
    let addCloudPrintLog = false;
    let savedChannels = [];
    // remove depulicate rows
    this.channels.forEach(ch => {
      if (((ch.value && ch.type) || (ch.type === NotifyChannels.CloudPrinting)) && !savedChannels.some(x => x && x.value === ch.value && x.type === ch.type)) {
        savedChannels.push(ch);
      }
    });
    savedChannels.forEach(ch => {
      // if select cloud printing, add a log and only need to add once
      if (ch.type === NotifyChannels.CloudPrinting && !addCloudPrintLog) {
        logs.push({
          type: 'cloud-printing',
          problem: 'Restaurant asked us to setup cloud printing',
          response: 'Need to set up cloud printing for order notifications',
          resolved: false
        });
        addCloudPrintLog = true;
      } else {
        let existChannel = channels.find(c => c && c.type === ch.type && c.value === ch.value);
        let existNotification = orderNotifications.find(x => x.channel && x.channel.type === ch.type && x.channel.value === ch.value);

        if (existChannel) {
          // edit existing channel and order notification
          existChannel.value = ch.value;
          existChannel.type = ch.type;
          if (ch.notifications.order) {
            existNotification.channel.value = ch.value;
            existNotification.channel.type = ch.type;
          }
          let notes = existChannel.notifications || [];
          if (ch.notifications.order && !notes.includes(NotificationsTypes.Order)) {
            existChannel.notifications = [...notes, NotificationsTypes.Order];
          }
          if (ch.notifications.invoice && !notes.includes(NotificationsTypes.Invoice)) {
            existChannel.notifications = [...notes, NotificationsTypes.Invoice];
          }
        } else {
          // add new channel and new order notification
          let newChannel = {
            type: ch.type,
            value: ch.value,
            notifications: []
          }
          if (ch.notifications.order) {
            newChannel.notifications.push(NotificationsTypes.Order);
            // only if notifications of a channel has order can add an order notification meanwhile 
            let newOrderNotification = {
              channel: {
                type: ch.type,
                value: ch.value
              }
            }
            orderNotifications.push(newOrderNotification);
          }
          if (ch.notifications.invoice) {
            newChannel.notifications.push(NotificationsTypes.Invoice);
          }
          channels.push(newChannel);
        }
      }
    });

    this.done.emit({ orderNotifications, channels, logs });
  }

}
