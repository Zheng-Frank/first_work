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
  summaryColumnDescriptors = [
    {
      label: 'Ranking'
    },
    {
      label: "Website count",
    },
    {
      label: "Improvement/Worsening",
    }
  ];
  summaryRankingRows = [];
  filterSummaryRankingRows = [];

  constructor() { }

  ngOnInit() {
  }

}
