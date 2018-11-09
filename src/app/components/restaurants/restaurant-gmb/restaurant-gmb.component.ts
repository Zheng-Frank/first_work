import { Component, OnInit, Input } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { GmbBiz } from '../../../classes/gmb/gmb-biz';

@Component({
  selector: 'app-restaurant-gmb',
  templateUrl: './restaurant-gmb.component.html',
  styleUrls: ['./restaurant-gmb.component.css']
})
export class RestaurantGmbComponent implements OnInit {

  @Input() restaurant: Restaurant;
  @Input() gmbBiz: GmbBiz;
  
  constructor() { }

  ngOnInit() {
  }

}
