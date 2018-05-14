import { Component, OnInit, Input } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Restaurant } from '@qmenu/ui';
import { ApiService } from '../../../services/api.service';
import { GlobalService } from '../../../services/global.service';
import { environment } from "../../../../environments/environment";
import { AlertType } from '../../../classes/alert-type';
import { zip } from "rxjs";
import { Invoice } from '../../../classes/invoice';

@Component({
  selector: 'app-restaurant-details-host',
  templateUrl: './restaurant-details-host.component.html',
  styleUrls: ['./restaurant-details-host.component.css']
})
export class RestaurantDetailsHostComponent implements OnInit {

  restaurant: Restaurant;
  id;
  constructor(private _route: ActivatedRoute, private _router: Router, private _api: ApiService, private _global: GlobalService) {

    this._route.params.subscribe(
      params => {
        this.id = params['id'];

        this._api
          .get(environment.qmenuApiUrl + "generic", {
            resource: "restaurant",
            query: {
              _id: { $oid: params['id'] }
            },
            projection: {
              logo: 1,
              name: 1,
              images: 1,
              googleAddress: 1,
              channels: 1,
              people: 1,
              rateSchedules: 1,
              serviceSettings: 1
            },
            limit: 1
          }).subscribe(
            results => {
              this.restaurant = new Restaurant(results[0]);
              console.log(this.restaurant);
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
}
