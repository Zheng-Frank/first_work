import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { ApiService } from "../../../services/api.service";
import { GlobalService } from "../../../services/global.service";
import { CacheService } from 'src/app/services/cache.service';

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

  constructor(private _api: ApiService, private _cache: CacheService, private _global: GlobalService) {
  }

  async ngOnInit() {
  }

  async select(restaurant) {
    this.restaurant = new Restaurant(restaurant);

  }

  resetRestaurant() {
    this.restaurant = undefined;

    setTimeout(() => this.myRestaurantPicker.reset(), 100);

  }
}
