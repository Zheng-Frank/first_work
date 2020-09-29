import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { RestaurantMenuShufflerComponent } from '../restaurant-menu-shuffler/restaurant-menu-shuffler.component';

@Component({
  selector: 'app-invalid-list',
  templateUrl: './invalid-list.component.html',
  styleUrls: ['./invalid-list.component.css']
})
export class InvalidListComponent implements OnInit {
  rows = [];
  filteredRows = [];

  numberOfRestaurant = 0;
  
  pagination: boolean = true;

  now = new Date();
  apiLoading = false;

  myColumnDescriptors = [
    {
      label: "Number"
    },
    {
      label: "Restaurant Name"
    },
    {
      label: "Created At",
      paths: ['createdAt'],
      sort: (a, b) => a.valueOf() - b.valueOf()
    }
  ];

  constructor(private _api: ApiService) {
    this.refresh();
    // this.test();
  }

  ngOnInit() {
  }

  async refresh() {
    this.apiLoading = false;

    // Getting data from tables 
    const restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        "rateSchedules": { $exists: true },
      },
      projection: {
        _id: 1,
        "googleAddress.formatted_address": 1,
        name: 1,
        createdAt: 1,
        "rateSchedules.agent" : 1,
        "rateSchedules": { $slice: -1 },
        disabled: 1
      }
    }, 6000);

    const dict = [];
    restaurants.filter(restaurant =>
      restaurant.rateSchedules[0].agent === "invalid" && !restaurant.disabled
    ).map(restaurant => {
      dict.push({
        id: restaurant._id,
        name: restaurant.name,
        address: restaurant.googleAddress.formatted_address,
        createdAt: new Date(restaurant.createdAt)
      });
    });
    dict.sort((r1, r2) => r2.createdAt.valueOf() - r1.createdAt.valueOf());
    this.rows = dict;
    this.filter();

    this.apiLoading = false;
  }

  async filter() {
    this.filteredRows = this.rows;

    // Update number of restaurants shown
    this.numberOfRestaurant = this.filteredRows.length;
  }

}
