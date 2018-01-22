import { Component, OnInit } from '@angular/core';
import { GlobalService } from '../../services/global.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  toggle;

  constructor(private _global: GlobalService) { }

  ngOnInit() {
  }

  test() {
    this._global.publishAlert({
      text: 'my test' + this._global.alerts.length,
      type: 'info',
      timeout: 10000
    });
    this._global.publishAlert({
      text: 'my test' + this._global.alerts.length,
      type: 'danger',
      timeout: 3000
    });
  }

}
