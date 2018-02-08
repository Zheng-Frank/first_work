import { Component, OnInit, Input } from '@angular/core';
import { GmbInfo } from '../../classes/gmb-info';

@Component({
  selector: 'app-gmb-info',
  templateUrl: './gmb-info.component.html',
  styleUrls: ['./gmb-info.component.scss']
})
export class GmbInfoComponent implements OnInit {
  @Input() gmbInfo = {
    gbmWebsite: 'qmenu.us',
    gmbOwner: 'qmenu2',
    gmbOpen: true
  } ;
  constructor() { }

  ngOnInit() {
  }

}
