import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { GlobalService } from 'src/app/services/global.service';
import { Gmb3Service } from 'src/app/services/gmb3.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-yelp-dashboard',
  templateUrl: './yelp-dashboard.component.html',
  styleUrls: ['./yelp-dashboard.component.css']
})
export class YelpDashboardComponent implements OnInit {
  restaurants = [];

  constructor(private _api: ApiService, private _global: GlobalService, private _gmb3: Gmb3Service) {
    this.refresh();
  }

  ngOnInit() {
  }

  async refresh() {
    // --- restaurant
    const restaurants = [];
    const restaurantBatchSize = 3000;
    let restaurantSkip = 0;

    while (true) {
      const batch = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'restaurant',
        projection: {
          yelpListing: 1,
        },
        skip: restaurantSkip,
        limit: restaurantBatchSize
      }).toPromise();

      restaurants.push(...batch);

      if (batch.length === 0) {
        break;
      }
      restaurantSkip += restaurantBatchSize;
    }

    this.restaurants = restaurants.filter(rt => rt.yelpListing !== undefined);
  }

}
