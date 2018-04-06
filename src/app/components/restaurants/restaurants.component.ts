import { Component, OnInit } from "@angular/core";
import { ApiService } from "../../services/api.service";
import { environment } from "../../../environments/environment";
import { GlobalService } from "../../services/global.service";
import { AlertType } from "../../classes/alert-type";

@Component({
  selector: "app-restaurants",
  templateUrl: "./restaurants.component.html",
  styleUrls: ["./restaurants.component.scss"]
})
export class RestaurantsComponent implements OnInit {
  constructor(private _api: ApiService, private _global: GlobalService) {}

  showCrawl = false;
  crawling = false;
  crawUrl;

  ngOnInit() {}
  toggleCrawl() {
    this.showCrawl = !this.showCrawl;
  }

  createNew() {}
}
