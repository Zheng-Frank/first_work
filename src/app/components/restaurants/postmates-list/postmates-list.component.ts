import { Component, OnInit } from "@angular/core";
import { ApiService } from "../../../services/api.service";
import { User } from '../../../classes/user';
import { RestaurantWithCourier } from "../../../classes/restaurant-courier";
import { RestaurantCourierService } from "../../../services/restaurant-courier.service";

@Component({
  selector: 'app-postmates-list',
  templateUrl: './postmates-list.component.html',
  styleUrls: ['./postmates-list.component.css']
})

export class PostmatesListComponent implements OnInit {
  courierName = "Postmates";
  postmatesList: RestaurantWithCourier[];
  user: User; //???
  private restaurantCourierService: RestaurantCourierService; //???

  constructor(private _api: ApiService) { }

  ngOnInit() {
    this.initRestaurantCourierService();
  }

  // Initialization and refresh.
  async initRestaurantCourierService() {
    this.restaurantCourierService = new RestaurantCourierService(this._api);
    await this.restaurantCourierService.getCourierByName(this.courierName);
    this.restaurantCourierService.databaseName = this.courierName.toLowerCase(); // Database name is courier name in lower case.
    this.restaurantCourierService.batchSizeForChecking = 10;
    this.restaurantCourierService.coolDownDays = 20;
    await this.refresh();
    return;
  }

  async refresh() {
    this.postmatesList = await this.restaurantCourierService.reloadRestaurantData();
    return;
  }

  // Button: "CLEAR ALL DATA!!!"
  async initPostmatesDatabase() {
    await this.restaurantCourierService.initDatabase();
    await this.refresh();
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
    // await this.updateRestaurantList(); //???
    await this.restaurantCourierService.scanCourierAvailability();
    await this.refresh();
    return;
  }
}
