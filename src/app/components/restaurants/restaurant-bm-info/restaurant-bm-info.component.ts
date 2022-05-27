import { ApiService } from 'src/app/services/api.service';
import { environment } from './../../../../environments/environment.prod';
import { Input } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { Component, OnInit } from '@angular/core';
import { GlobalService } from 'src/app/services/global.service';

@Component({
  selector: 'app-restaurant-bm-info',
  templateUrl: './restaurant-bm-info.component.html',
  styleUrls: ['./restaurant-bm-info.component.css']
})
export class RestaurantBmInfoComponent implements OnInit {

  @Input() bmRT;
  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
  }
}
