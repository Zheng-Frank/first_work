import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-seo-tracking',
  templateUrl: './seo-tracking.component.html',
  styleUrls: ['./seo-tracking.component.css']
})
export class SeoTrackingComponent implements OnInit {

  viewTypes = ['Summary','Special Restaurant'];
  viewType = 'Summary';
  providerTypes = ['qMenu'];
  providerType = 'qMenu';
  statuses = [
    { name: 'Total moves up', btnClass: 'btn-secondary' },
    { name: 'Total moves down', btnClass: 'btn-info' },
    { name: 'Net total moves', btnClass: 'btn-success' },
    { name: 'Average ranking', btnClass: 'btn-danger' }]
  totalRankingHistory = [
    { name: 'Total moves up', value: '+143423' },
    { name: 'Total moves down', value: '+143423' },
    { name: 'Net total moves', value: '+14342' },
    { name: 'Average ranking', value: '1.33 to 1.22' }
  ];
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
  searchFilter = '';
  summaryRankingRows = [];
  filterSummaryRankingRows = [];
  constructor() { }

  ngOnInit() {
  }

  prvoiderFilter(){

  }
  specialTRFilter(){

  }
}
