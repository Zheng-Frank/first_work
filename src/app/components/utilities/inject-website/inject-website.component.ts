import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";

@Component({
  selector: 'app-inject-website',
  templateUrl: './inject-website.component.html',
  styleUrls: ['./inject-website.component.css']
})
export class InjectWebsiteComponent implements OnInit {

  @Input() restaurantList = [];
  @ViewChild('myRestaurantPicker') set picker(picker) {
    this.myRestaurantPicker = picker;
  }
  myRestaurantPicker;

  restaurant;

  myObj = {
    domain: undefined,
    websiteTemplateName: undefined
  };

  fieldDescriptors = [{
    field: "domain", //
    label: "Domain",
    required: true,
    inputType: "text"
  }];

  templateNames = [];

  constructor(private _api: ApiService, private _global: GlobalService) { }

  async ngOnInit() {
    this.templateNames = await this._api.get(environment.qmenuApiUrl + 'utils/list-template').toPromise();
    // we like to move Chinese Restaurant Template to top
    const cindex = this.templateNames.indexOf('Chinese Restaurant Template');
    if( cindex > 0) {
      this.templateNames.splice(cindex, 1);
      this.templateNames.unshift('Chinese Restaurant Template');
    }
  }

  async formSubmit(event) {
    if (!this.myObj.websiteTemplateName) {
      event.acknowledge('Website template is required');
    }

    try {
      // save domain and websiteTemplateName to DB:
      if (this.restaurant.domain !== this.myObj.domain || this.restaurant.websiteTemplateName !== this.myObj.websiteTemplateName) {
        await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
          old: {
            _id: this.restaurant._id
          },
          new: {
            _id: this.restaurant._id,
            domain: this.myObj.domain,
            websiteTemplateName: this.myObj.websiteTemplateName
          }
        }]).toPromise();
        // update original so no refresh is needed
        this.restaurant.domain = this.myObj.domain;
        this.restaurant.websiteTemplateName = this.myObj.websiteTemplateName;
      }

      // call API
      await this._api.post(environment.qmenuApiUrl + 'utils/publish-template', {
        domain: this.myObj.domain,
        templateName: this.myObj.websiteTemplateName,
        restaurantId: this.restaurant._id
      }).toPromise();

      this._global.publishAlert(AlertType.Success, 'Success');
      event.acknowledge(null);

    } catch (error) {
      event.acknowledge(error);
    }
  }

  async select(restaurant) {
    this.restaurant = new Restaurant(restaurant);
    ['domain', 'websiteTemplateName'].map(field => this.myObj[field] = (this.restaurant || {})[field]);
  }

  resetRestaurant() {
    this.restaurant = undefined;
    ['domain', 'websiteTemplateName'].map(field => this.myObj[field] = undefined);
    setTimeout(() => this.myRestaurantPicker.reset(), 100);
  }

}
