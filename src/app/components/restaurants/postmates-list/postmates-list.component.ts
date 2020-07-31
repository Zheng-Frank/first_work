import { Component, OnInit } from "@angular/core";
import { ApiService } from "../../../services/api.service";
import { User } from '../../../classes/user';
import { RestaurantWithCourier } from "../../../classes/restaurant-courier";
import { RestaurantCourierService } from "../../../classes/restaurant-courier-service";

@Component({
  selector: 'app-postmates-list',
  templateUrl: './postmates-list.component.html',
  styleUrls: ['./postmates-list.component.css']
})

export class PostmatesListComponent implements OnInit {
  courierName: string;
  courierDatabaseName: string;
  postmatesList: RestaurantWithCourier[];
  user: User; // Not really used yet.
  restaurantCourierService: RestaurantCourierService;

  constructor(private _api: ApiService) { }

  ngOnInit() {
    this.courierName = "Postmates"
    this.courierDatabaseName = this.courierName.toLowerCase();
    this.initRestaurantCourierService();
  }

  // Initialization and refresh.
  async initRestaurantCourierService() {
    this.restaurantCourierService = new RestaurantCourierService(this._api);
    await this.restaurantCourierService.getCourierByName(this.courierName);
    this.restaurantCourierService.databaseName = this.courierDatabaseName;
    this.restaurantCourierService.batchSizeForChecking = 200;
    this.restaurantCourierService.coolDownDays = 20;
    await this.refresh();
    return;
  }

  async refresh() {
    this.postmatesList = await this.restaurantCourierService.reloadRestaurantData();
    return;
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
}
