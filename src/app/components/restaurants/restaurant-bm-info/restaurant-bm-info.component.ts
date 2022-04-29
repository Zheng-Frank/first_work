import { ApiService } from 'src/app/services/api.service';
import { environment } from './../../../../environments/environment.prod';
import { Input } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-restaurant-bm-info',
  templateUrl: './restaurant-bm-info.component.html',
  styleUrls: ['./restaurant-bm-info.component.css']
})
export class RestaurantBmInfoComponent implements OnInit {

  @Input() restaurant: Restaurant;
  bmRT;
  constructor(private _api: ApiService) { }

  async ngOnInit() {
    this.loadRTInBM();
  }

  async loadRTInBM() {
    this.bmRT = await this._api.get(`${environment.bmQueryRTAccuratelyApi}&GooglePlaceID=${(this.restaurant.googleListing || {}).place_id}&AuthKey=49da4e63-491a-4b6b-8b30-d879068e4094`).toPromise();
  }

}
