import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Restaurant } from '@qmenu/ui';
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
  restaurant: Restaurant;
  id;
  invoices = [];
  constructor(private _route: ActivatedRoute, private _router: Router, private _api: ApiService, private _global: GlobalService) {
    const self = this;
    this._route.params.subscribe(
      params => {
        this.id = params['id'];
        zip(
          this._api
            .get(environment.qmenuApiUrl + "generic", {
              resource: "restaurant",
              query: {
                _id: { $oid: params['id'] }
              },
              projection: {
                logo: true,
                name: true,
                images: true
              },
              limit: 1
            }),
          this._api
            .get(environment.qmenuApiUrl + "generic", {
              resource: "invoice",
              query: {
                "restaurant.id": params['id']
              },
              projection: {
                fromDate: 1,
                toDate: 1,
                total: 1,
                commission: 1,
                subtotal: 1,
                status: 1,
                restaurantCcCollected: 1,
                qMenuCcCollected: 1,
                cashCollected: 1,
                "restaurant.id": 1,
                "restaurant.offsetToEST": 1,
                isCanceled: 1,
                isPaymentCompleted: 1,
                isPaymentSent: 1,
                isSent: 1

              },
              limit: 100
            }),
        )
          .subscribe(
            results => {
              this.restaurant = new Restaurant(results[0][0]);
              this.invoices = results[1].map(i => new Invoice(i));
              // sort by end date!
              this.invoices.sort((i1, i2)=> i1.toDate.valueOf() - i2.toDate.valueOf());
              console.log(results);
            },
            e => this._global.publishAlert(
              AlertType.Danger,
              "Error pulling data from API"
            )
          );
      });
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
    const routes = [];
    const roles = this._global.user.roles || [];
    if (roles.indexOf('MENU_EDITOR') >= 0 || roles.indexOf('ADMIN') >= 0) {
      routes.push({ title: 'Menus', route: 'menus' });
      routes.push({ title: 'Menu Options', route: 'menu-options' });
    }
    if (roles.indexOf('ACCOUNTANT') >= 0 || roles.indexOf('ADMIN') >= 0) {
      routes.push({ title: 'Orders', route: 'orders' });
      routes.push({ title: 'Invoices', route: 'invoices' });
    }
    return routes;
  }

}
