import { Helper } from 'src/app/classes/helper';
import { GlobalService } from 'src/app/services/global.service';
import { ApiService } from './../../../services/api.service';
import { environment } from 'src/environments/environment';
import { Component, OnInit } from '@angular/core';
import { AlertType } from 'src/app/classes/alert-type';
declare var $: any;
@Component({
  selector: 'app-change-rt-alias',
  templateUrl: './change-rt-alias.component.html',
  styleUrls: ['./change-rt-alias.component.css']
})
export class ChangeRtAliasComponent implements OnInit {

  restaurantId = '';
  restaurant;
  restaurants = [];
  showEnglishWarning = true;

  constructor(private _api: ApiService, private _global: GlobalService) { }

  async ngOnInit() {
    this.restaurants = await this._global.getCachedRestaurantListForPicker();
    $("[data-toggle='tooltip']").tooltip();
  }

  async findRestaurantById() {
    this.restaurant = undefined;
    if (!this.restaurantId) {
      return this._global.publishAlert(AlertType.Danger, 'Please enter restaurant id');
    }
    try {
      let [restaurant] = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'restaurant',
        query: {
          _id: {
            $oid: this.restaurantId.trim()
          }
        },
        projection: {
          name: 1,
          alias: 1,
          web: 1
        },
        limit: 1
      }).toPromise();
      if (!restaurant) {
        return this._global.publishAlert(AlertType.Danger, 'No restaurant found with the ID provided.');
      }
      this.restaurant = restaurant;
    } catch (error) {
      return this._global.publishAlert(AlertType.Danger, 'Some error happened while querying!');
    }
  }

  updateRestaurantAlias() {
    if (this.restaurants.some(rt => rt.alias === this.restaurant.alias)) {
      return this._global.publishAlert(AlertType.Danger, 'Another restaurant with this alias already exists! Please try a different alias.');
    }

    if (!(/^([a-z]+-)+([a-z]+)$/g.test(this.restaurant.alias))) {
      return this._global.publishAlert(AlertType.Danger, 'Error. Please correct the alias format!');
    }

    const newRestaurant = { _id: this.restaurant._id, alias: this.restaurant.alias };

    this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant',
      [{
        old: { _id: this.restaurant._id },
        new: newRestaurant
      }]).subscribe(result => {
        this.restaurants.forEach(rt => {
          if(rt._id === this.restaurant._id) {
            rt.alias = this.restaurant.alias;
          }
        });
        this._global.publishAlert(AlertType.Success, 'Alias changed successfully!');
      },
        error => {
          this._global.publishAlert(AlertType.Danger, 'Error while updating alias!');
        }
      );
      this.republishToAWS();
  }

  async republishToAWS() {
    try {
      // --- Re publish changes
      const domain = Helper.getTopDomain((this.restaurant.web || {}).qmenuWebsite);
      const templateName = (this.restaurant.web || {}).templateName;
      const restaurantId = this.restaurant._id;

      if (!templateName || !domain) {
        return this._global.publishAlert(AlertType.Danger, 'Missing template name or website');
      }

      if (domain.indexOf('qmenu.us') >= 0) {
        return this._global.publishAlert(AlertType.Danger, 'Failed. Can not inject qmenu');
      }

      await this._api.post(environment.qmenuApiUrl + 'utils/publish-website-s3', {
        domain,
        templateName,
        restaurantId
      }).toPromise();

      // --- Invalidate domain
      const result = await this._api.post(environment.appApiUrl + 'events',
        [{ queueUrl: `https://sqs.us-east-1.amazonaws.com/449043523134/events-v3`, event: { name: 'invalidate-domain', params: { domain: domain } } }]
      ).toPromise();

      console.log('republishToAWS() nvalidation result:', result);

      this._global.publishAlert(AlertType.Success, 'Republishing to AWS was successful');
    } catch (error) {
      this._global.publishAlert(AlertType.Danger, 'Error republishing to AWS');
      console.error(error);
    }
  }

}
