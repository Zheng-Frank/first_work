import { Component, OnInit, Input } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { ApiService } from 'src/app/services/api.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-basic-tpl',
  templateUrl: './basic-tpl.component.html',
  styleUrls: ['./basic-tpl.component.css']
})
export class BasicTplComponent implements OnInit {

  @Input() restaurant: Restaurant;

  constructor(private _api: ApiService) { }

  async ngOnInit() {
    // Get most recent version of restaurant
    [this.restaurant] = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        _id: { $oid: this.restaurant._id }
      },
      projection: {}
    }).toPromise();
  }
}
