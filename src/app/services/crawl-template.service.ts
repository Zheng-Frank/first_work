import { Injectable } from '@angular/core';
import { Helper } from '../classes/helper';
import { environment } from 'src/environments/environment';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class CrawlTemplateService {

  private templateName;

  constructor(private _api: ApiService) { }

  public async crawlTemplate(restaurant) {
    try {
      const domain = Helper.getTopDomain(restaurant.web.qmenuWebsite);
      const templateName = restaurant.web.templateName;
      const restaurantId = restaurant._id;

      // crawl template
      const result = await this._api.post(environment.qmenuApiUrl + 'utils/crawl-template', {
        domain,
        templateName,
        restaurantId
      }).toPromise();

      // --- Retrieve most recent document
      const [updateRestaurant] = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'restaurant',
        query: {
          _id: { $oid: restaurant._id }
        },
        projection: { 'web.template': 1}
      }).toPromise();

      // Render template
      this.templateName = updateRestaurant.web.template.name;

      return this.templateName;

    } catch (error) {
      console.error('Error crawling template: ', error);
    }

  }
}
