import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { ModalComponent } from "@qmenu/ui/bundles/qmenu-ui.umd";
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";
import { Helper } from "../../../classes/helper";
import { FormSubmit } from '@qmenu/ui/classes';

@Component({
  selector: 'app-restaurant-contacts',
  templateUrl: './restaurant-contacts.component.html',
  styleUrls: ['./restaurant-contacts.component.css']
})
export class RestaurantContactsComponent implements OnInit {

  @Input() restaurant: Restaurant;

  @ViewChild('modalPerson') modalPerson: ModalComponent;
  @ViewChild('modalChannel') modalChannel: ModalComponent;


  personInEditing: any = {
  };

  channelInEditing: any = {
  };

  channelFieldDescriptors = [
    {
      field: "type", //
      label: "Typpe",
      required: true,
      inputType: "single-select",
      items: [
        { object: "Email", text: "Email", selected: false },
        { object: "Voice", text: "Voice", selected: false },
        { object: "SMS", text: "SMS", selected: false },
        { object: "Fax", text: "Fax", selected: false }
      ]
    },
    {
      field: "value", //
      label: "Value",
      required: true,
      inputType: "text"
    },
    {
      field: "notifications", //
      label: "Receive Notifications",
      required: false,
      inputType: "multi-select",
      items: [
        { object: "Order", text: "Incoming Orders", selected: false },
        { object: "Invoice", text: "Invoice", selected: false }
      ]
    }
  ];

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


  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
    this.resetPersonFieldDescriptors();
  }

  resetPersonFieldDescriptors() {
    this.personFieldDescriptors.map(fd => {
      if (fd.field === 'channels') {
        fd.items = (this.restaurant.channels || []).map(channel => ({
          text: channel.type + ': ' + channel.value,
          object: channel.type + ': ' + channel.value
        }))
      }
    });
  }

  getPersonWithTitle(person) {
    return person.title ? (person.title + ' ' + person.name) : person.name;
  }

  join(values) {
    return (values || []).join(', ')
  }

  editChannel(channel?: any) {
    if (!channel) {
      this.channelInEditing = {
        index: -1, // we use index as Id since JSON doesn't have Id for each obj,
      };
    } else {
      this.channelInEditing = JSON.parse(JSON.stringify(channel));
      this.channelInEditing.index = this.restaurant.channels.indexOf(channel);
    }
    this.modalChannel.show();
  }

  editPerson(person?: any) {
    this.resetPersonFieldDescriptors();
    if (!person) {
      this.personInEditing = {
        index: -1 // we use index as Id since JSON doesn't have Id for each obj.
      };
    } else {
      this.personInEditing = JSON.parse(JSON.stringify(person));
      this.personInEditing.index = this.restaurant.people.indexOf(person);
    }
    this.modalPerson.show();
  }

  submitPerson(event: FormSubmit) {
    // construct person, also possibly update channels to include this person
    const person = JSON.parse(JSON.stringify(this.personInEditing));
    this.restaurant.people = this.restaurant.people || [];
    if (person.index === -1) {
      this.restaurant.people.push(person);
    } else {
      this.restaurant.people[person.index] = person;
    }
    // we need to remove temp index!
    delete person.index;

    event.acknowledge(null);
    this.modalPerson.hide();
  }

  removePerson(event: FormSubmit) {
    this.restaurant.people.splice(this.personInEditing.index, 1);
    event.acknowledge(null);
    this.modalPerson.hide();
  }

  cancelPerson(event) {
    this.modalPerson.hide();
  }

  submitChannel(event: FormSubmit) {
    // construct person, also possibly update channels to include this person
    const channel = JSON.parse(JSON.stringify(this.channelInEditing));
    this.restaurant.channels = this.restaurant.channels || [];
    if (channel.index === -1) {
      this.restaurant.channels.push(channel);
    } else {
      const oldChannel = this.restaurant.channels[channel.index];
      // we also need to update whatever in person.channels!
      this.updatePeopleOnChannelChange('UPDATE', oldChannel, channel);

      this.restaurant.channels[channel.index] = channel;
    }
    // we need to remove temp index!
    delete channel.index;

    event.acknowledge(null);
    this.modalChannel.hide();
  }

  removeChannel(event: FormSubmit) {
    const oldChannel = this.restaurant.channels[this.channelInEditing.index];
    this.updatePeopleOnChannelChange('DELETE', oldChannel);
    this.restaurant.channels.splice(this.channelInEditing.index, 1);
    event.acknowledge(null);
    this.modalChannel.hide();
  }

  updatePeopleOnChannelChange(action, oldChannel, newChannel?) {
    (this.restaurant.people || []).map(person => {
      for (let i = (person.channels || []).length - 1; i >= 0; i--) {
        if (person.channels[i] === oldChannel.type + ': ' + oldChannel.value) {
          switch (action) {
            case 'DELETE':
              person.channels.splice(i, 1);
              break;
            case 'UPDATE':
              person.channels[i] = newChannel.type + ': ' + newChannel.value;
              break;
            default:
              break;
          }
        }
      }
    });
  }

  cancelChannel(event) {
    this.modalChannel.hide();
  }

  remove(contact) {
    const newContacts = this.restaurant.contacts.filter(c => c !== contact);
    this.patchDiff(newContacts);
  }

  addNew() {
    const newContacts = JSON.parse(JSON.stringify((this.restaurant.contacts || [])));
    newContacts.push({ name: null });
    this.patchDiff(newContacts);
  }

  editLabelChange(event, contact, property) {
    // preserve old contacts
    const oldContacts = JSON.parse(JSON.stringify(this.restaurant.contacts));

    // update the property
    contact[property] = event.newValue;
    const newContacts = this.restaurant.contacts;

    // put the old contacts back to restaurant. When API call is success, it will be updated.
    this.restaurant.contacts = oldContacts;
    this.patchDiff(newContacts);

  }

  patchDiff(newContacts) {
    if (Helper.areObjectsEqual(this.restaurant.contacts, newContacts)) {
      this._global.publishAlert(
        AlertType.Info,
        "Not changed"
      );
    } else {
      // api update here...
      this._api
        .patch(environment.qmenuApiUrl + "generic?resource=restaurant", [{
          old: {
            _id: this.restaurant['_id'],
            contacts: this.restaurant.contacts
          }, new: {
            _id: this.restaurant['_id'],
            contacts: newContacts
          }
        }])
        .subscribe(
          result => {
            // let's update original, assuming everything successful
            this.restaurant.contacts = newContacts;
            this._global.publishAlert(
              AlertType.Success,
              "Updated successfully"
            );
          },
          error => {
            this._global.publishAlert(AlertType.Danger, "Error updating to DB");
          }
        );
    }
  }

}
