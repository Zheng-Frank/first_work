import { Component, OnInit, Input } from '@angular/core';
import { Router } from '@angular/router';
import { Restaurant, Address } from '@qmenu/ui';
import { ApiService } from '../../../services/api.service';
import { GlobalService } from '../../../services/global.service';
import { environment } from "../../../../environments/environment";
import { AlertType } from '../../../classes/alert-type';
import { zip } from "rxjs";
import { Invoice } from '../../../classes/invoice';

@Component({
  selector: 'app-restaurant-details',
  templateUrl: './restaurant-details.component.html',
  styleUrls: ['./restaurant-details.component.css']
})
export class RestaurantDetailsComponent implements OnInit {
  @Input() restaurant: Restaurant;
  id;
  invoices = [];
  constructor(private _router: Router, private _api: ApiService, private _global: GlobalService) {

  }

  ngOnInit() {
  }


  getAddress() {
    return (this.restaurant.address || {});
  }

  goto(route: string) {
    route = route.replace(' ', '-');
    this._router.navigate(['restaurant/' + this.id + '/' + route.toLowerCase()]);
  }

  getVisibleRoutes() {
    const routes = [
      // {
      //   title: 'Menus',
      //   route: 'menus',
      //   roles: ['ADMIN', 'MENU_EDITOR']
      // },
      // {
      //   title: 'Menu Options',
      //   route: 'menu-options',
      //   roles: ['ADMIN', 'MENU_EDITOR']
      // },
      // {
      //   title: 'Orders',
      //   route: 'orders',
      //   roles: ['ADMIN', 'ACCOUNTANT']
      // },
      {
        title: 'Invoices',
        route: '/restaurants/' + this.restaurant['_id'] + '/invoices',
        roles: ['ADMIN', 'ACCOUNTANT']
      }
    ];
    const roles = this._global.user.roles || [];

    return routes.filter(r => r.roles.some(role => roles.indexOf(role) >= 0));
  }

  getLine1(address: Address) {
    if(!address) {
      return 'Address Missing';
    }
    return (address.street_number ? address.street_number : '') + ' '
      + (address.route ? ' ' + address.route : '') +
      (address.apt ? ', ' + address.apt : '');
  }
  getLine2(address: Address) {
    if(!address) {
      return '';
    }
    return (address.locality ? address.locality + ', ' : (address.sublocality ? address.sublocality + ', ' : ''))
      + (address.administrative_area_level_1 ? address.administrative_area_level_1 : '')
      + ' ' + address.postal_code;
  }


}
