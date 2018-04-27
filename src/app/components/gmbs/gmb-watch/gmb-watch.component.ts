import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-gmb-watch',
  templateUrl: './gmb-watch.component.html'
})
export class GmbWatchComponent implements OnInit {

  gmbWatch =  {
    notificationSettings: {
      emails: [],
      phones: [],
      sms:[]
    }
  }

  constructor() { }

  ngOnInit() {
  }

}
