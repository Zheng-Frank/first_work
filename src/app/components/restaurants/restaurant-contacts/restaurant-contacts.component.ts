import { Component, OnInit, Input } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";
import { Helper } from "../../../classes/helper";

@Component({
  selector: 'app-restaurant-contacts',
  templateUrl: './restaurant-contacts.component.html',
  styleUrls: ['./restaurant-contacts.component.css']
})
export class RestaurantContactsComponent implements OnInit {

  @Input() restaurant: Restaurant;
  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
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
