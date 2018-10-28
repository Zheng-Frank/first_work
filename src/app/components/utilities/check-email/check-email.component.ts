import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";

@Component({
  selector: 'app-check-email',
  templateUrl: './check-email.component.html',
  styleUrls: ['./check-email.component.css']
})
export class CheckEmailComponent implements OnInit {

  @Input() restaurantList = [];
  @ViewChild('myRestaurantPicker') set picker(picker) {
    this.myRestaurantPicker = picker;
  }
  myRestaurantPicker;

  restaurant;
  gmbBiz;

  qmenuPop3Email;
  qmenuPop3Host;
  qmenuPop3Password;

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
  }

  async select(restaurant) {
    this.restaurant = new Restaurant(restaurant);
    // reset first
    this.gmbBiz = undefined;
    ['qmenuPop3Email', 'qmenuPop3Host', 'qmenuPop3Password'].map(field => this[field] = undefined);
    // requery gmbBiz
    this.gmbBiz = (await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbBiz',
      query: {
        qmenuId: restaurant._id || restaurant.id
      }
    }).toPromise())[0];

    ['qmenuPop3Email', 'qmenuPop3Host', 'qmenuPop3Password'].map(field => this[field] = (this.gmbBiz || {})[field]);
  }

  resetRestaurant() {
    this.restaurant = undefined;
    this.gmbBiz = undefined;
    ['qmenuPop3Email', 'qmenuPop3Host', 'qmenuPop3Password'].map(field => this[field] = undefined);

    setTimeout(() => this.myRestaurantPicker.reset(), 100);

  }

  retrieveEmailCode(code) {

  }
}
