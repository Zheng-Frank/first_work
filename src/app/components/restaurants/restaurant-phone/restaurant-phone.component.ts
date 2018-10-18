import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { Restaurant, Phone } from '@qmenu/ui';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";

@Component({
  selector: 'app-restaurant-phone',
  templateUrl: './restaurant-phone.component.html',
  styleUrls: ['./restaurant-phone.component.css']
})
export class RestaurantPhoneComponent implements OnInit {

  @Input() restaurant: Restaurant;
  @ViewChild('phoneEditingModal') phoneEditingModal;

  phoneInEditing: Phone;

  ngOnInit() {
  }
  constructor(private _api: ApiService) {
  }

  getPhones() {
    console.log("phones=", this.restaurant.phones);
    return this.restaurant.phones || [];
  }

  edit(phone: Phone) {
    // we like to make a copy of the phone instead
    let p = new Phone(phone.phoneNumber);
    p.callable = phone.callable;
    p.faxable = phone.faxable;
    p.textable = phone.textable;
    p.type = phone.type;
    p.id = phone.id;
    p.restaurant = phone.restaurant;
    this.phoneInEditing = p;
    this.phoneEditingModal.show();
  }

  editNew() {
    this.edit(new Phone());
  }

  onDone(phone) {
    console.log('phone=', phone);
    this.phoneEditingModal.hide();
    if (phone.id) {
      let phoneClone = JSON.parse(JSON.stringify(phone));
      phoneClone.restaurant = this.restaurant['_id'];
      this._api.put(environment.legacyApiUrl + "phone/"+ phone.id,  phoneClone)
      .subscribe(
          d => {
              let phones = this.restaurant.phones;
              for (let i = phones.length - 1; i >= 0; i--) {
                  if (phones[i].id === d.id) {
                      phones[i] = d;
                  }
              }
          }
      );
    } else {
      let pClone = JSON.parse(JSON.stringify(phone));
      pClone.restaurant = this.restaurant['_id'];
      this._api.post(environment.legacyApiUrl + "phone",  pClone)
      .subscribe(
          d => {
              this.restaurant.phones = this.restaurant.phones || [];
              this.restaurant.phones.push(d);
          }
      );
    }

  }

  onCancel(phone) {
    this.phoneEditingModal.hide();
  }

  onDelete(phone) {
    this.phoneEditingModal.hide();
    this._api.delete(environment.legacyApiUrl+'phone/' + phone.id).subscribe(
      // remove!
      d => {
          this.restaurant.phones = this.restaurant.phones.filter(p => p.id !== d.id);
      }
  );
  }
}

