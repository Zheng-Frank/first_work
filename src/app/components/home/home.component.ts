import { Component, OnInit } from "@angular/core";
import { ApiService } from "../../services/api.service";
import { environment } from "../../../environments/environment";
import { GlobalService } from "../../services/global.service";
import { AlertType } from "../../classes/alert-type";
import { CacheService } from "../../services/cache.service";
import { Router } from '@angular/router';
@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  restaurantList = [];
  searchTerm = '';

  selectedRestaurant;

  constructor(private _router: Router, private _api: ApiService, private _global: GlobalService, private _cache: CacheService) { }

  async ngOnInit() {
    // retrieve restaurant list
    this.restaurantList = await this._global.getCachedVisibleRestaurantList();
  }

  getFilteredList() {
    let results = [];
    let limit = 20;
    // Follow those importance
    // 1. empty
    // 2. starts with
    // 3. phones starts with
    // 4. name.indexOf
    // 5. phones indexOf

    for (let i = 0; i < this.restaurantList.length && results.length < limit; i++) {
      const restaurant = this.restaurantList[i];
      if (!this.searchTerm) {
        results.push(restaurant);
      } else {
        this.searchTerm = this.searchTerm.replace(/[^a-zA-Z 0-9]+/g, "");
      }
    }

    for (let i = 0; i < this.restaurantList.length && results.length < limit; i++) {
      const restaurant = this.restaurantList[i];
      if (results.indexOf(restaurant) < 0 && this.searchTerm && (restaurant.name.toLowerCase().indexOf(this.searchTerm.toLocaleLowerCase()) === 0)) {
        results.push(restaurant);
      }
    }

    for (let i = 0; i < this.restaurantList.length && results.length < limit; i++) {
      const restaurant = this.restaurantList[i];
      if (results.indexOf(restaurant) < 0 && this.searchTerm && (restaurant.phones || []).some(phone => (phone.phoneNumber || '').indexOf(this.searchTerm) === 0)) {
        results.push(restaurant);
      }
    }

    for (let i = 0; i < this.restaurantList.length && results.length < limit; i++) {
      const restaurant = this.restaurantList[i];
      if (results.indexOf(restaurant) < 0 && this.searchTerm && (restaurant.name.toLowerCase().indexOf(this.searchTerm.toLocaleLowerCase()) >= 0)) {
        results.push(restaurant);
      }
    }

    for (let i = 0; i < this.restaurantList.length && results.length < limit; i++) {
      const restaurant = this.restaurantList[i];
      if (results.indexOf(restaurant) < 0 && this.searchTerm && (restaurant.restaurantId == this.searchTerm)) {
        results.push(restaurant);
      }
    }

    for (let i = 0; i < this.restaurantList.length && results.length < limit; i++) {
      const restaurant = this.restaurantList[i];
      if (results.indexOf(restaurant) < 0 && this.searchTerm && (restaurant.phones || []).some(phone => (phone.phoneNumber || '').indexOf(this.searchTerm) >= 0)) {
        results.push(restaurant);
      }
    }

    for (let i = 0; i < this.restaurantList.length && results.length < limit; i++) {
      const restaurant = this.restaurantList[i];
      if (results.indexOf(restaurant) < 0 && this.searchTerm && (restaurant._id.toLowerCase().startsWith(this.searchTerm.toLocaleLowerCase()) || restaurant._id.toLowerCase().endsWith(this.searchTerm.toLocaleLowerCase()))) {
        results.push(restaurant);
      }
    }

    return results;
  }

  select(restaurant) {
    if (this.selectedRestaurant === restaurant) {
      this.selectedRestaurant = undefined;
      return;
    }
    this.selectedRestaurant = restaurant;
  }

  isVisible(section) {
    const sectionRolesMap = {
      email: ['ADMIN', 'CSR', 'MENU_EDITOR'],
      template: ['ADMIN', 'CSR', 'MENU_EDITOR'],
      search: ['ADMIN', 'CSR', 'MENU_EDITOR']
    }
    return this._global.user.roles.some(r => sectionRolesMap[section].indexOf(r) >= 0);
  }

  selectRestaurant(restaurant) {
    if (restaurant && restaurant._id) {
      this._router.navigate(['/restaurants/' + restaurant._id]);
    }
  }

}
