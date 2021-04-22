import { Component, OnInit, Input } from '@angular/core';
import { Restaurant } from '@qmenu/ui';

import { GlobalService } from 'src/app/services/global.service';
import { CrawlTemplateService } from 'src/app/services/crawl-template.service';
import { ApiService } from 'src/app/services/api.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-restaurant-web-template',
  templateUrl: './restaurant-web-template.component.html',
  styleUrls: ['./restaurant-web-template.component.css']
})
export class RestaurantWebTemplateComponent implements  OnInit {

  @Input() restaurant: Restaurant;

  templateName;

  constructor(private _api: ApiService, private _crawl: CrawlTemplateService, private _global: GlobalService) { }

  // tslint:disable-next-line: use-life-cycle-interface
  async ngOnInit() {
    [this.restaurant] = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        _id: { $oid: this.restaurant._id }
      },
      projection: {
      }
    }).toPromise();

    if(this.restaurant.web.template) {
      this.templateName = this.restaurant.web.template.name;
    }

    console.log('onInit');
  }

  async crawlTemplate() {
    this.templateName = await this._crawl.crawlTemplate(this.restaurant);
    await this.ngOnInit();
  }
}
