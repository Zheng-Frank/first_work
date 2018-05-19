import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
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
export class RestaurantDetailsComponent implements OnInit, OnChanges {
  restaurant: Restaurant;
  @Input() id;
  constructor(private _router: Router, private _api: ApiService, private _global: GlobalService) {

  }

  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.id) {
      this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "restaurant",
        query: {
          _id: { $oid: this.id }
        },
        projection: {
          name: 1,
          alias: 1,
          images: 1,
          channels: 1,
          people: 1,
          rateSchedules: 1,
          serviceSettings: 1,
          promotions: 1,
          googleAddress: 1,
          closedDays: 1,

          autoPrintOnNewOrder: 1,
          printCopies: 1,
          autoPrintVersion: 1,
          customizedRenderingStyles: 1,
          printerSN: 1,
          printerKey: 1,
          printers: 1
        },
        limit: 1
      })
        .subscribe(
          results => {
            this.restaurant = new Restaurant(results[0]);
          },
          error => {
            this._global.publishAlert(AlertType.Danger, error);
          }
        );
    }
  }


  getAddress() {
    return (this.restaurant.address || {});
  }

  goto(route: string) {
    route = route.replace(' ', '-');
    this._router.navigate(['restaurant/' + this.id + '/' + route.toLowerCase()]);
  }

  isSectionVisible(sectionName) {
    const visibilityRolesMap = {
      profile: ['ADMIN', 'MENU_EDITOR', 'ACCOUNTANT'],
      contacts: ['ADMIN', 'MENU_EDITOR', 'ACCOUNTANT'],
      rateSchedules: ['ADMIN', 'ACCOUNTANT'],
      serviceSettings: ['ADMIN', 'MENU_EDITOR'],
      promotions: ['ADMIN', 'MENU_EDITOR'],
      closedDays: ['ADMIN', 'MENU_EDITOR'],
      cloudPrinting: ['ADMIN', 'MENU_EDITOR']
    }
    const roles = this._global.user.roles || [];
    return visibilityRolesMap[sectionName].filter(r => roles.indexOf(r) >= 0).length > 0;
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
    if (!address) {
      return 'Address Missing';
    }
    return (address.street_number ? address.street_number : '') + ' '
      + (address.route ? ' ' + address.route : '') +
      (address.apt ? ', ' + address.apt : '');
  }
  getLine2(address: Address) {
    if (!address) {
      return '';
    }
    return (address.locality ? address.locality + ', ' : (address.sublocality ? address.sublocality + ', ' : ''))
      + (address.administrative_area_level_1 ? address.administrative_area_level_1 : '')
      + ' ' + address.postal_code;
  }


}
