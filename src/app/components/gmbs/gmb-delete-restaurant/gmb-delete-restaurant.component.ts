import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-gmb-delete-restaurant',
  templateUrl: './gmb-delete-restaurant.component.html',
  styleUrls: ['./gmb-delete-restaurant.component.css']
})
export class GmbDeleteRestaurantComponent implements OnInit {
  @Output() onDone = new EventEmitter();
  @Output() onCancel = new EventEmitter();

  restaurantName = 'Peking Chinese Restaurant';
  email = 'qmenu05@gmail.com';
  password;
  zipcode;

  submitClicked = false;
  apiResult = '';
  apiRequesting = false;
  constructor(private _api: ApiService) { }

  ngOnInit() {
  }

  isEmailValid() {
    return this.email && this.email.match(/\S+@\S+\.\S+/);
  }

  cancel() {
    this.onCancel.emit();
  }

  done() {
    this.apiResult = '';

    this.submitClicked = true;
    // trim
    this.email = (this.email || '').trim();

    if (this.isEmailValid() && this.password && this.restaurantName) {
      this.apiRequesting = true;
      this._api
        .post('http://localhost:3000/removeRestaurant', { restaurantName: this.restaurantName, email: this.email, password: this.password, zipcode: this.zipcode })
        .subscribe(
          result => {
            this.apiResult = result;
            this.apiRequesting = false;
          },
          error => {
            this.apiResult = error._body;
            console.log(error);
            this.apiRequesting = false;
          });
    }
  }
}
