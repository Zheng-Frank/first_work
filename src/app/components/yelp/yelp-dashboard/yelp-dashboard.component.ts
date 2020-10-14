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
    this.restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      query: { yelpListing: { $exists: true } },
      resource: 'restaurant',
      ptojection: { yelpListing: 1 }
    }, 50000);
  }
  
}
