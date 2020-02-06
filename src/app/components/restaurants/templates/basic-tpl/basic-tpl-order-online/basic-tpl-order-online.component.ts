import { Component, OnInit, Input } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { Helper } from 'src/app/classes/helper';
import { environment } from 'src/environments/environment';
import { ApiService } from 'src/app/services/api.service';
import { GlobalService } from 'src/app/services/global.service';
import { AlertType } from 'src/app/classes/alert-type';

@Component({
  selector: 'app-basic-tpl-order-online',
  templateUrl: './basic-tpl-order-online.component.html',
  styleUrls: ['./basic-tpl-order-online.component.css']
})
export class BasicTplOrderOnlineComponent implements OnInit {

  @Input() restaurant: Restaurant;

  images;
  imageFile;

  constructor(private _api: ApiService, private _global: GlobalService) { }

  async ngOnInit() {
    // Get most recent version of restaurant
    [this.restaurant] = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        _id: { $oid: this.restaurant._id }
      },
      projection: {
        'web.template.promos': 1
      }
    }).toPromise();

    this.images = this.restaurant.web.template.promos;
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

      // --- Re publish changes
      const domain = Helper.getTopDomain(this.restaurant.web.qmenuWebsite);
      const templateName = this.restaurant.web.templateName;
      const restaurantId = this.restaurant._id;

      console.log(domain, templateName, restaurantId);

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

      this._global.publishAlert(AlertType.Success, 'Image replaced suceesfuly');

    } catch (error) {
      console.error(error);
      this._global.publishAlert(AlertType.Danger, 'Error replacing image');
    }

  }

}
