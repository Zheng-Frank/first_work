import { Component, OnInit, Input } from '@angular/core';
import { GmbInfo } from '../../classes/gmb-info';

@Component({
  selector: 'app-gmb-info',
  templateUrl: './gmb-info.component.html',
  styleUrls: ['./gmb-info.component.scss']
})
export class GmbInfoComponent implements OnInit {
  @Input() gmbInfo;
  constructor() { }

  ngOnInit() {
  }

  getGoogleQuery() {
    if (this.gmbInfo['address']) {
      return 'https://www.google.com/search?q='
        + encodeURIComponent(this.gmbInfo['name'] + ' ' + this.gmbInfo['address']['formatted_address']);
    }
  }

}
