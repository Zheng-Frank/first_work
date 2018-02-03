import { Component, OnInit } from '@angular/core';
import { GlobalService } from '../../services/global.service';
import { AlertType } from '../../classes/alert-type';
import { DeepDiff } from '../../classes/deep-diff';

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

    DeepDiff.test();

  }

}
