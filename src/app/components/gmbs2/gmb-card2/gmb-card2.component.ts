import { Component, OnInit, Input, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { GmbAccount } from '../../../classes/gmb/gmb-account';

@Component({
  selector: 'app-gmb-card2',
  templateUrl: './gmb-card2.component.html',
  styleUrls: ['./gmb-card2.component.css']
})
export class GmbCard2Component implements OnInit, OnChanges {

  @Input() gmbAccount: GmbAccount;

  @Output() edit: EventEmitter<any> = new EventEmitter();

  accountName;


  constructor() { }

  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges) {
    this.accountName = this.gmbAccount ? (this.gmbAccount.email || '').split('@')[0] : 'N/A';
  }

  clickEdit() {
    this.edit.emit(JSON.parse(JSON.stringify(this.gmbAccount)));
  }

}
