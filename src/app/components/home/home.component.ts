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

  isAdmin = false;
  isMenuEditor = false;
  constructor(private _router: Router , private _api: ApiService, private _global: GlobalService) {
    this.isAdmin = _global.user.roles.some(r => r === 'ADMIN');
    this.isMenuEditor = _global.user.roles.some(r => r === 'MENU_EDITOR');
  }

  async ngOnInit() {
    // retrieve restaurant list
    this.restaurantList = await this._global.getCachedVisibleRestaurantList();
    // force log out
    if (['sam', 'lemon'].indexOf(this._global.user.username) >= 0 && this._global.user.roles.some(r => r === 'ADMIN')) {
      this._global.logout();
    }

    if (['abby'].indexOf(this._global.user.username) >= 0) {
      this._global.logout();
    }
    // const result = await this._api.get2(environment.qmenuApiUrl + 'generic2', {a: 123, b: 456, c: 789}).toPromise();
    // console.log(result);
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
      search: ['ADMIN', 'CSR', 'MENU_EDITOR', 'MARKETER'],
      "fax-problems": ['ADMIN', 'CSR'],
      "email-problems": ['ADMIN', 'CSR'],
      "unconfirmed-orders": ['ADMIN', 'CSR'],
      "image-manager": ['ADMIN'],
      "gmb-campaign": ['ADMIN'],
      "bulk-messaging": ['ADMIN'],      
      "awaiting-onboarding": ['ADMIN', 'MENU_EDITOR'],
      "disabled-restaurants": ['ADMIN'],
      "monitoring-hours": ['ADMIN', 'CSR']      
    }
    return this._global.user.roles.some(r => sectionRolesMap[section].indexOf(r) >= 0);
  }

  selectRestaurant(restaurant) {
    if (restaurant && restaurant._id) {
      this._router.navigate(['/restaurants/' + restaurant._id]);
    }
  }

}
