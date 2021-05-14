import { Courier } from './../../../classes/courier';
import { Helper } from './../../../classes/helper';
import { environment } from 'src/environments/environment';
import { ApiService } from 'src/app/services/api.service';
import { Component, OnInit } from '@angular/core';
import { RestaurantWithCourier } from 'src/app/classes/restaurant-courier';
import { RestaurantCourierService } from 'src/app/classes/restaurant-courier-service';
import { User } from 'src/app/classes/user';

@Component({
  selector: 'app-restaurants-by-courier',
  templateUrl: './restaurants-by-courier.component.html',
  styleUrls: ['./restaurants-by-courier.component.css']
})
export class RestaurantsByCourierComponent implements OnInit {

  couriers;
  restaurants;
  restaurantCourierService: RestaurantCourierService;
  filteredRestaurants;
  availabilityList = ["All", "signed up", "available", "not available", "unknown"];

  restaurantsColumnDescriptors = [
    {
      label: 'Number'
    },
    {
      label: "Restaurant",
      paths: ['name'],
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },
    {
      label: "Time Zone",
      paths: ['timeZone'],
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },
    {
      label: "Score",
      paths: ['score'],
      sort: (a, b) => (a || 0) > (b || 0) ? 1 : ((a || 0) < (b || 0) ? -1 : 0)
    }
  ];

  constructor(private _api: ApiService) { }

  ngOnInit() {
    this.populateCourierList();
  }

  async populateRestaurantListByCourier() {
    this.couriers = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: "courier",
      query: { },
      projection: { name: 1 },
      limit: 1
    },1000);
    this.restaurants = this.getRestaurants();
  }
 

  async getRestaurants() {
    const restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {disabled:{$ne:true}},
      projection: {
        _id: 1,
        "googleAddress.formatted_address": 1,
        name: 1,
        courier: 1,
        score: 1,
        disabled: 1,
      },
    }, 5000);
    return this.parseRestaurants(restaurants);
  }
  private parseRestaurants(restaurants) {
    const ret = restaurants.map(each => ({
      restaurantId: each._id,
      name: each.name,
      address: each.googleAddress.formatted_address,
      disabled: each.disabled,
      score: each.score,
      timeZone: Helper.getTimeZone(each.googleAddress.formatted_address),
      courier :1
      // courier: (each.courier && each.courier.name === this.courier.name) ? "signed up" : null,
    }));
    return ret;
  }
  // Button: "Update Restaurants in List"
  async updateRestaurantList() {
    await this.restaurantCourierService.updateRestaurantList();
    await this.refresh();
    return;
  }
  // Button: "Rescan"
  async scanPostmates() {
    await this.restaurantCourierService.scanCourierAvailability();
    await this.refresh();
    return;
  }

  filter() {
    // if (this.selectedAvailability === "All") {
    //   this.filteredRestaurants = this.restaurantList;
    // }
    // else if (this.selectedAvailability === "unknown") {
    //   this.filteredRestaurants = this.restaurantList.filter(each => !(["signed up", "available", "not available"].includes(each.availability)));
    // }
    // else {
    //   this.filteredRestaurants = this.restaurantList.filter(each => each.availability === this.selectedAvailability);
    // }

  }

 


  
}
