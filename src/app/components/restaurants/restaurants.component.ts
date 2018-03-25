import { Component, OnInit } from "@angular/core";
import { ApiService } from "../../services/api.service";
import { environment } from "../../../environments/environment";
import { GlobalService } from "../../services/global.service";
import { AlertType } from "../../classes/alert-type";
import { saveAs } from "file-saver";

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
  getRestaurantData() {
    this.showCrawl = true;
    this.crawling = true;
    this._api
      .get(environment.adminApiUrl + "utils/crawl-restaurant", {
        url: this.crawUrl
      })
      .subscribe(
        result => {
          this.crawling = false;
          saveAs(
            new Blob([JSON.stringify(result)], { type: "text" }),
            "data.json"
          );
        },
        error => {
          this.crawling = true;
          this._global.publishAlert(AlertType.Danger, "Failed to crawl");
          console.log(error);
        }
      );
  }
  createNew() {}
}
