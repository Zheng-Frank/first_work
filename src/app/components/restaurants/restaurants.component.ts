import { Component, OnInit } from "@angular/core";
import { ApiService } from "../../services/api.service";
import { environment } from "../../../environments/environment";
import { GlobalService } from "../../services/global.service";

@Component({
  selector: "app-restaurants",
  templateUrl: "./restaurants.component.html",
  styleUrls: ["./restaurants.component.scss"]
})
export class RestaurantsComponent implements OnInit {
  constructor(private _api: ApiService, private _global: GlobalService) {}

  ngOnInit() {}

  sync() {
    // pull existing production restaurants (using name and place_id???)
    // add to service provider, if not in
    // add to data collected 
  }

  createNew() {}
}
