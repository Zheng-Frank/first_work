import { Component, OnInit, Input } from '@angular/core';
import { Restaurant } from '@qmenu/ui';

import { ApiService } from 'src/app/services/api.service';
import { GlobalService } from 'src/app/services/global.service';
import { environment } from 'src/environments/environment';
import { Helper } from 'src/app/classes/helper';
import { AlertType } from 'src/app/classes/alert-type';

@Component({
  selector: 'app-restaurant-web-template',
  templateUrl: './restaurant-web-template.component.html',
  styleUrls: ['./restaurant-web-template.component.css']
})
export class RestaurantWebTemplateComponent implements OnInit {

  @Input() restaurant: Restaurant;

  templateComponentName;

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
    // Or else wont render component in dev (ExpressionChangedAfterItHasBeenCheckedError)
    setTimeout(() => {
      if (this.restaurant.web.template) {
        this.templateComponentName = this.restaurant.web.template.name;
      }
    }, 0);
  }

  async createTemplate() {
    try {
      // --- Populate db with template info
      const result = await this._api.post(environment.qmenuApiUrl + 'utils/publish-website-s3', {
        website: this.restaurant.web.qmenuWebsite,
        id: this.restaurant._id
      }).toPromise();

      // --- Retrieve most recent document
      if (result.status.nModified === 1) {
        const [updateRestaurant] = await this._api.get(environment.qmenuApiUrl + 'generic', {
          resource: 'restaurant',
          query: {
            _id: { $oid: this.restaurant._id }
          },
          projection: {}
        }).toPromise();

        // Render template
        this.templateComponentName = updateRestaurant.web.template.name;
      }

      // --- Inject to S3
      const domain = Helper.getTopDomain(this.restaurant.web.qmenuWebsite);
      const templateName = this.restaurant.web.templateName;

      if (!templateName || !domain) {
        return this._global.publishAlert(AlertType.Danger, 'Missing template name or website');
      }

      if (domain.indexOf('qmenu.us') >= 0) {
        return this._global.publishAlert(AlertType.Danger, 'Failed. Can not inject qmenu');
      }

      await this._api.post(environment.qmenuApiUrl + 'utils/publish-website-s3', {
        domain: domain,
        templateName: this.restaurant.web.templateName,
        restaurantId: this.restaurant._id
      }).toPromise();

      return this._global.publishAlert(AlertType.Success, 'Template created succesfuly');

    } catch (error) {
      console.error(error);
      return this._global.publishAlert(AlertType.Danger, 'Error while creating template');
    }

  }

}
