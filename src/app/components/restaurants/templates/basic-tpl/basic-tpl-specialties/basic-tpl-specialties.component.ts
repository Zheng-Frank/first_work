import { Component, OnInit, Input } from '@angular/core';

import { Restaurant } from '@qmenu/ui';
import { ApiService } from 'src/app/services/api.service';
import { GlobalService } from 'src/app/services/global.service';
import { environment } from 'src/environments/environment';
import { Helper } from 'src/app/classes/helper';
import { AlertType } from 'src/app/classes/alert-type';

@Component({
  selector: 'app-basic-tpl-specialties',
  templateUrl: './basic-tpl-specialties.component.html',
  styleUrls: ['./basic-tpl-specialties.component.css']
})
export class BasicTplSpecialtiesComponent implements OnInit {

  @Input() restaurant: Restaurant;

  images;
  imageFile;
  imageUrl;

  constructor(private _api: ApiService, private _global: GlobalService) { }

  async ngOnInit() {
    // Get most recent version of restaurant
    [this.restaurant] = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        _id: { $oid: this.restaurant._id }
      },
      projection: {
        'web.template.specialties': 1
      }
    }).toPromise();

    this.images = this.restaurant.web.template.specialties;
  }

  async uploadFile(event, index) {
    try {
      this.imageFile = event;

      // Upload Image
      const { Location: url }: any = await Helper.uploadImage(this.imageFile, this._api);
      this.images[index] = url;

      // Save to mDB
      const newRestaurant = JSON.parse(JSON.stringify(this.restaurant));

      newRestaurant.web.template.specialties = this.images;

      const result = await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: { _id: this.restaurant['_id'] },
        new: newRestaurant
      }]).toPromise();

      this._global.publishAlert(AlertType.Success, 'Image replaced suceesfuly');

    } catch (error) {
      console.error(error);
      this._global.publishAlert(AlertType.Danger, 'Error replacing image');
    }

  }

}
