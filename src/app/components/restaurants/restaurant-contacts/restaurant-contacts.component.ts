import { Component, OnInit, Input, ViewChild, OnChanges, Output, EventEmitter } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { ModalComponent } from "@qmenu/ui/bundles/qmenu-ui.umd";
import { ApiService } from "../../../services/api.service";
import { PrunedPatchService } from "../../../services/prunedPatch.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";
import { Helper } from "../../../classes/helper";
import { Channel } from "../../../classes/channel";
import { Person } from "../../../classes/person";
import { FormSubmit } from '@qmenu/ui/classes';

@Component({
  selector: 'app-restaurant-contacts',
  templateUrl: './restaurant-contacts.component.html',
  styleUrls: ['./restaurant-contacts.component.css']
})
export class RestaurantContactsComponent implements OnInit, OnChanges {

  @Input() restaurant;
  @Input() viewOnly = false;
  @Output() updateRestaurant = new EventEmitter();

  @ViewChild('modalPerson') modalPerson: ModalComponent;
  @ViewChild('modalChannel') modalChannel: ModalComponent;


  personInEditing: Person = {} as Person;

  channelInEditing: Channel = {} as Channel;
  channelBeforeEditing: Channel = {} as Channel;

  notes: string;
  channelFieldDescriptors = [
    {
      field: "type", //
      label: "Type",
      required: true,
      inputType: "single-select",
      items: [
        { object: "Email", text: "Email", selected: false },
        { object: "Phone", text: "Phone", selected: false },
        { object: "SMS", text: "SMS", selected: false },
        { object: "Fax", text: "Fax", selected: false }
      ]
    },
    {
      field: "value", //
      label: "Value",
      required: true,
      placeholder: 'eg. ‭4043829768‬',
      inputType: "text"
    },
    {
      field: "notifications", //
      label: "Notifications / Purpose",
      required: false,
      inputType: "multi-select",
      items: [
        { object: "Order", text: "Incoming Orders", selected: false },
        { object: "Invoice", text: "Invoice", selected: false },
        { object: "Business", text: "Business Phone", selected: false }
      ]
    }
  ];

  languageDescriptor = {
    field: "language",
    label: "Language",
    required: false,
    inputType: "single-select",
    items: [
      { object: "ENGLISH", text: "English", selected: false },
      { object: "CHINESE", text: "Chinese", selected: false }
    ]
  };

  personFieldDescriptors = [
    {
      field: "title", //
      label: "Title",
      required: false,
      inputType: "single-select",
      items: [
        { object: "Mr.", text: "Mr.", selected: false },
        { object: "Mrs.", text: "Mrs.", selected: false },
        { object: "Ms.", text: "Ms.", selected: false }
      ]
    },
    {
      field: "name", //
      label: "Name",
      required: true,
      inputType: "text"
    },
    {
      field: "roles", //
      label: "Roles",
      required: false,
      inputType: "multi-select",
      items: [
        { object: "Owner", text: "Owner", selected: false },
        { object: "Manager", text: "Manager", selected: false },
        { object: "Employee", text: "Employee", selected: false }
      ]
    },
    {
      field: "channels", //
      label: "Available Channels",
      required: false,
      inputType: "multi-select",
      items: [
      ]
    }
  ];


  channelTypeToFaClassMap = {
    'Email': 'fas fa-envelope',
    'Phone': 'fas fa-phone-volume',
    'SMS': 'fas fa-comments',
    'Fax': 'fas fa-fax'
  };

  crm = "";
  crms = [];

  Languages = { ENGLISH: 'English', CHINESE: 'Chinese' };

  constructor(private _api: ApiService, private _global: GlobalService, private _prunedPatch: PrunedPatchService) { }

  ngOnInit() {
    this.resetPersonFieldDescriptors();
    this.notes = this.restaurant.notes;
    this.getCrms();
    this.crm = this.restaurant.crm;
  }

  ngOnChanges() {
    this.synchronizeNotificationData();
  }

  synchronizeNotificationData() {
    const notifications = this.restaurant.orderNotifications || [];
    (this.restaurant.channels || []).map(ch => {
      const notificationMatch = notifications.find(n => n.channel.value === ch.value && n.channel.type === ch.type);
      if (notificationMatch) {
        if (!ch.notifications) {
          ch.notifications = ['Order']
        } else if (!ch.notifications.includes('Order')) {
          ch.notifications.push('Order');
        }
      } else {
        // this block of code will delete the 'Order' entry from a given channel's notifications array if the following conditions are met:
        // 1) the restaurant has at least one orderNotification
        // 2) no orderNotifications are associated with this channel (by being in this else block, we already know this condition is satisified)
        const channelOrderNotificationIndex = (ch.notifications || []).indexOf('Order');
        if (channelOrderNotificationIndex >= 0 && notifications.length >= 1) {
          ch.notifications.splice(channelOrderNotificationIndex, 1);
        }
      }
      return ch;
    });
  }

  resetPersonFieldDescriptors() {
    this.personFieldDescriptors.map(fd => {
      if (fd.field === 'channels') {
        fd.items = (this.restaurant.channels || []).map(channel => ({
          text: channel.type + ': ' + channel.value,
          object: { type: channel.type, value: channel.value }
        }));
      }
    });
  }

  // get all CRM users
  getCrms() {
    this._api.get(environment.qmenuApiUrl + 'generic', { resource: 'user', query: '{"roles": "CRM"}', limit: 1000, }).subscribe(
      result => {
        this.crms = result.sort((r1, r2) => r1.username > r2.username ? 1 : -1);
      },
      error => {
        this._global.publishAlert(AlertType.Danger, 'Error pulling CRM users from API');
      });
  }

  getPersonWithTitle(person) {
    return person.title ? (person.title + ' ' + person.name) : person.name;
  }

  join(values) {
    return (values || []).join(', ');
  }

  editChannel(channel?: any) {
    if (!channel) {
      this.channelInEditing = {
        index: -1 // we use index as Id since JSON doesn't have Id for each obj,
      } as Channel;
      this.channelBeforeEditing = JSON.parse(JSON.stringify(this.channelInEditing));
    } else {
      this.channelInEditing = JSON.parse(JSON.stringify(channel));
      this.channelBeforeEditing = JSON.parse(JSON.stringify(channel));
      this.channelInEditing.index = this.restaurant.channels.indexOf(channel);
    }
    this.languageDescriptor.items.forEach(x => x.selected = false);
    this.channelFormChange();
    this.modalChannel.show();
  }

  editPerson(person?: any) {
    this.resetPersonFieldDescriptors();
    if (person === null || person === undefined) {
      this.personInEditing = {
        index: -1 // we use index as Id since JSON doesn't have Id for each obj.
      } as Person;
    } else {
      this.personInEditing = JSON.parse(JSON.stringify(person));
      this.personInEditing.index = this.restaurant.people.indexOf(person);
    }
    this.modalPerson.show();
  }

  submitPerson(event: FormSubmit) {
    const newPeople = (this.restaurant.people || []).slice(0);
    if (this.personInEditing.index === -1) {
      newPeople.push(this.personInEditing);
    } else {
      newPeople[this.personInEditing.index] = this.personInEditing;
    }

    // we need to remove temp index!
    delete this.personInEditing.index;

    this.patchDiff('people', newPeople);

    event.acknowledge(null);
    this.modalPerson.hide();
  }

  removePerson(event: FormSubmit) {
    const newPeople = this.restaurant.people.slice(0);
    newPeople.splice(this.personInEditing.index, 1);
    this.patchDiff('people', newPeople);
    event.acknowledge(null);
    this.modalPerson.hide();
  }

  cancelPerson(event) {
    this.modalPerson.hide();
  }

  channelFormChange() {
    if (this.channelInEditing.type === 'Phone') {
      if (!this.channelFieldDescriptors.some(x => x.field === 'language')) {
        this.channelFieldDescriptors.push(this.languageDescriptor);
      }
    } else {
      this.channelFieldDescriptors = this.channelFieldDescriptors.filter(x => x.field !== 'language');
    }
  }


  submitChannel(event: FormSubmit) {

    // keep only digits for phone/sms/fax
    if (['Phone', 'SMS', 'Fax'].indexOf(this.channelInEditing.type) >= 0) {
      this.channelInEditing.value = this.channelInEditing.value.replace(/\D/g, '');
    }

    // currently language only support for Phone
    if (this.channelInEditing.type !== 'Phone') {
      delete this.channelInEditing.language;
    }


    const newChannels = (this.restaurant.channels || []).slice(0);
    const newChannelLength = newChannels.length;
    if (this.channelInEditing.index === -1) {
      newChannels.push(this.channelInEditing);
    } else {

      this.updatePeopleOnChannelChange('UPDATE', this.restaurant.channels[this.channelInEditing.index], this.channelInEditing);
      newChannels[this.channelInEditing.index] = this.channelInEditing;
    }

    // we need to remove temp index!
    delete this.channelInEditing.index;

    // we also want to update this RT's orderNotifications property. updateOrderNotifications function takes care of 
    // logic to make sure records are updated appropriately
    // second argument is a boolean indicating whether the operation just completed is adding a new channel or editing an existing channel
    this.updateOrderNotifications(this.channelInEditing)

    this.patchDiff('channels', newChannels);
    this.channelBeforeEditing = null;
    event.acknowledge(null);
    this.modalChannel.hide();

  }

  updateOrderNotifications(channel) {
    const newOrderNotifications = JSON.parse(JSON.stringify(this.restaurant.orderNotifications || []));
    // if this channel has had order notifications turned OFF during this round of editing, we want to delete any orderNotifications associated with this channel
    const notificationsTurnedOff = (this.channelBeforeEditing.notifications || []).includes('Order') && !(channel.notifications || []).includes('Order');
    console.log(notificationsTurnedOff);
    if (notificationsTurnedOff) {
      console.log('block one');
      // a channel had Order notifications removed -> delete the associated orderNotification
      let matchingNotificationIndex = (this.restaurant.orderNotifications || []).findIndex(n => n.channel.value === channel.value && n.channel.type === channel.type);
      let oldNotificationIndex = (this.restaurant.orderNotifications || []).findIndex(n => n.channel.value === this.channelBeforeEditing.value && n.channel.type === this.channelBeforeEditing.type);
      console.log(matchingNotificationIndex);
      console.log(oldNotificationIndex);
      // if oldNotificationIndex >= 0, the channel value or type has been edited. we should delete the old entry, and let the new entry that
      // will be created take its place

      if (oldNotificationIndex >= 0) {
        newOrderNotifications.splice(oldNotificationIndex, 1);
      }
      if (matchingNotificationIndex >= 0) {
        newOrderNotifications.splice(matchingNotificationIndex, 1); // deleting orderNotification
      }
    } else {
      console.log('block two');
      // 
      let notificationMatch = (this.restaurant.orderNotifications || []).find(n => n.channel.value === channel.value && n.channel.type === channel.type);
      console.log(notificationMatch);
      let oldNotificationIndex = (this.restaurant.orderNotifications || []).findIndex(n => n.channel.value === this.channelBeforeEditing.value && n.channel.type === this.channelBeforeEditing.type);
      console.log(oldNotificationIndex);
      // if oldNotificationIndex >= 0, the channel value or type has been edited. we should delete the old entry, and let the new entry that
      // will be created take its place

      if (oldNotificationIndex >= 0) {
        newOrderNotifications.splice(oldNotificationIndex, 1);
      }

      if (!notificationMatch && (channel.notifications || []).includes('Order')) {
        newOrderNotifications.push({
          channel: {
            type: channel.type,
            value: channel.value
          }
        });
      }
    }

    this.patchDiff('orderNotifications', newOrderNotifications);
  }

  removeChannel(event: FormSubmit) {
    const oldChannel = this.restaurant.channels[this.channelInEditing.index];
    this.updatePeopleOnChannelChange('DELETE', oldChannel);

    const newChannels = this.restaurant.channels.slice(0);
    newChannels.splice(this.channelInEditing.index, 1);

    const notificationMatchIndex = (this.restaurant.orderNotifications || []).findIndex(n => n.channel.value === oldChannel.value && n.channel.type === oldChannel.type);

    if (notificationMatchIndex >= 0) {
      const newNotifications = this.restaurant.orderNotifications.slice(0);
      newNotifications.splice(notificationMatchIndex, 1);
      this.patchDiff('orderNotifications', newNotifications);
    }
    this.patchDiff('channels', newChannels);
    event.acknowledge(null);
    this.modalChannel.hide();
  }

  updatePeopleOnChannelChange(action, oldChannel, newChannel?) {
    if (this.restaurant.people) {
      let affected = false;
      const newPeople = JSON.parse(JSON.stringify(this.restaurant.people));
      (newPeople || []).map(person => {
        for (let i = (person.channels || []).length - 1; i >= 0; i--) {
          if (person.channels[i].type === oldChannel.type && person.channels[i].value === oldChannel.value) {
            switch (action) {
              case 'DELETE':
                person.channels.splice(i, 1);
                affected = true;
                break;
              case 'UPDATE':
                affected = true;
                person.channels[i] = newChannel;
                break;
              default:
                break;
            }
          }
        }
      });

      if (affected) {
        this.patchDiff('people', newPeople);
      }
    }

  }

  cancelChannel(event) {
    this.modalChannel.hide();
  }

  updateCrm(event) {
    // console.log("updateCrm " + this.restaurant['crm']);
    this.patchDiff('crm', this.crm);
  }

  async patchDiff(field, newValue) {
    if (Helper.areObjectsEqual(this.restaurant[field], newValue)) {
      this._global.publishAlert(
        AlertType.Info,
        "Not changed"
      );
    } else {
      // api update here...

      const oldBody = {
        _id: this.restaurant.id || this.restaurant['_id']
      };
      oldBody[field] = this.restaurant[field];

      const newBody = {
        _id: this.restaurant.id || this.restaurant['_id']
      };

      newBody[field] = newValue;

      this._prunedPatch
        .patch(environment.qmenuApiUrl + "generic?resource=restaurant", [{
          old: oldBody, new: newBody
        }])
        .subscribe(
          result => {
            // let's update original, assuming everything successful
            this.restaurant[field] = newValue;
            this._global.publishAlert(
              AlertType.Success,
              "Updated successfully"
            );
            this.updateRestaurant.emit(this.restaurant);
          },
          error => {
            this._global.publishAlert(AlertType.Danger, "Error updating to DB");
          }
        );
    }
  }

}
