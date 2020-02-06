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

  async crawlTemplate() {
    try {
      const domain = Helper.getTopDomain(this.restaurant.web.qmenuWebsite);
      const templateName = this.restaurant.web.templateName;
      const restaurantId = this.restaurant._id;

      // crawl template
      await this._api.post(environment.qmenuApiUrl + 'utils/crawl-template', {
        domain,
        templateName,
        restaurantId
      }).toPromise();

      // --- Retrieve most recent document
      const [updateRestaurant] = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'restaurant',
        query: {
          _id: { $oid: this.restaurant._id }
        },
        projection: {}
      }).toPromise();

      // Render template
      this.templateComponentName = updateRestaurant.web.template.name;

      return this._global.publishAlert(AlertType.Success, 'Template crawled succesfuly');

    } catch (error) {
      console.error('Error crawling template: ', error);
      return this._global.publishAlert(AlertType.Danger, 'Error while crawling template');
    }

  }

}
