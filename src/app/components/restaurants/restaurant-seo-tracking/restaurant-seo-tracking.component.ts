import { Input } from '@angular/core';
import { Component, OnInit } from '@angular/core';
import { Restaurant } from '@qmenu/ui';

@Component({
  selector: 'app-restaurant-seo-tracking',
  templateUrl: './restaurant-seo-tracking.component.html',
  styleUrls: ['./restaurant-seo-tracking.component.css']
})
export class RestaurantSeoTrackingComponent implements OnInit {

  @Input() restaurant: Restaurant;
  specificColumnDescriptors = [
    {
      label: 'Provider'
    },
    {
      label: "Old Ranking",
    },
    {
      label: "New Ranking",
    }
  ];
  specificRankingRows = [];
  filterSpecificRankingRows = [];

  constructor() { }

  ngOnInit() {
  }

}
