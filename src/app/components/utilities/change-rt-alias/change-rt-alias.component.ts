import { GlobalService } from 'src/app/services/global.service';
import { ApiService } from './../../../services/api.service';
import { environment } from 'src/environments/environment';
import { Component, OnInit } from '@angular/core';
import { AlertType } from 'src/app/classes/alert-type';

@Component({
  selector: 'app-change-rt-alias',
  templateUrl: './change-rt-alias.component.html',
  styleUrls: ['./change-rt-alias.component.css']
})
export class ChangeRtAliasComponent implements OnInit {

  restaurantId = '';
  restaurant;
  restaurants = [];
  newAlias = '';
  constructor(private _api: ApiService, private _global: GlobalService) { }

  async ngOnInit() {
    this.restaurants = await this._global.getCachedRestaurantListForPicker();
  }

  async findRestaurantById() {
    this.restaurant = undefined;
    if (!this.restaurantId) {
      return this._global.publishAlert(AlertType.Danger, 'Please enter restaurant id');
    }
    let restaurant = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        _id: {
          $oid: this.restaurantId
        }
      },
      projection: {
        alias: 1
      },
      limit: 1
    }).toPromise();
    if (!restaurant) {
      return this._global.publishAlert(AlertType.Danger, 'No restaurant found with the ID provided.');
    }
    this.restaurant = restaurant;
  }

  updateRestaurantAlias() {
    if(this.restaurant.some(rt=>rt.alias === this.newAlias)) {
      return this._global.publishAlert(AlertType.Danger, 'Another restaurant with this alias already exists! Please try a different alias.');
    }

    if(!(/^([a-z]+-)+([a-z]+)$/g.test(this.newAlias))) {
      return this._global.publishAlert(AlertType.Danger, 'Error. Please correct the alias format!');
    }

    const newRestaurant = { _id: this.restaurant._id, alias: this.newAlias };

    this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant',
      [{
        old: { _id: this.restaurant._id },
        new: newRestaurant
      }]).subscribe(result => {
        this._global.publishAlert(AlertType.Success, 'Alias changed successfully!');
      },
        error => {
          this._global.publishAlert(AlertType.Danger, 'Error while updating alias!');
        }
      );
  }

}
