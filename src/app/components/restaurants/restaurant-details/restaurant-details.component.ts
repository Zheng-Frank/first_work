import { Component, OnInit, Input, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
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
export class RestaurantDetailsComponent implements OnInit, OnChanges, OnDestroy {
  restaurant: Restaurant;
  @Input() id;

  tabs = [
    "Settings",
    "Menus",
    "Menu Options",
    "Orders",
    "Invoices"
  ];
  activeTab = 'Settings';

  constructor(private _router: Router, private _api: ApiService, private _global: GlobalService) {

  }

  ngOnInit() {
    this.activeTab = this._global.storeGet('restaurantDetailsTab') || 'Settings';
  }

  ngOnDestroy() {
    this._global.storeSet('restaurantDetailsTab', this.activeTab);
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
          paymentMeans: 1,
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
          printers: 1,

          // profile needed fields

          email: 1,
          taxRate: 1,
          surchargeAmount: 1,
          surchargeName: 1,
          pickupTimeEstimate: 1,
          deliveryTimeEstimate: 1,
          logo: 1,
          excludeAmex: 1,
          requireZipcode: 1,
          allowScheduling: 1,
          timeZone: 1,
          notification: 1,
          ccProcessingRate: 1,
          ccProcessingFlatFee: 1,
          stripeSecretKey: 1,
          stripePublishableKey: 1,
          preferredLanguage: 1,

          deliveryByTme: 1,

          menus: 1,
          menuOptions: 1
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

  setActiveTab(tab) {
    this.activeTab = tab;
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
      profile: ['ADMIN', 'MENU_EDITOR', 'ACCOUNTANT', 'CSR'],
      contacts: ['ADMIN', 'MENU_EDITOR', 'ACCOUNTANT', 'CSR'],
      rateSchedules: ['ACCOUNTANT'],
      paymentMeans: ['ACCOUNTANT', 'CSR'],
      serviceSettings: ['ADMIN', 'MENU_EDITOR', 'CSR'],
      promotions: ['ADMIN', 'MENU_EDITOR', 'CSR'],
      closedDays: ['ADMIN', 'MENU_EDITOR', 'CSR'],
      cloudPrinting: ['ADMIN', 'MENU_EDITOR', 'CSR']
    }
    const roles = this._global.user.roles || [];
    return visibilityRolesMap[sectionName].filter(r => roles.indexOf(r) >= 0).length > 0;
  }

  getVisibleRoutes() {
    const routes = [
      {
        title: 'Menus',
        route: '/restaurants/' + this.restaurant['_id'] + '/menus',
        roles: ['ADMIN', 'MENU_EDITOR']
      },
      {
        title: 'Menu Options',
        route: '/restaurants/' + this.restaurant['_id'] + '/menu-options',
        roles: ['ADMIN', 'MENU_EDITOR']
      },
      {
        title: 'Orders',
        route: '/restaurants/' + this.restaurant['_id'] + '/orders',
        roles: ['ADMIN', 'CSR']
      },
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
