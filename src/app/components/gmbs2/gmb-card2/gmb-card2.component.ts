import { Component, OnInit, Input, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { GmbAccount } from '../../../classes/gmb/gmb-account';
import { FormEvent } from '@qmenu/ui';
import { GmbBiz } from 'src/app/classes/gmb/gmb-biz';
import { GlobalService } from 'src/app/services/global.service';

@Component({
  selector: 'app-gmb-card2',
  templateUrl: './gmb-card2.component.html',
  styleUrls: ['./gmb-card2.component.css']
})
export class GmbCard2Component implements OnInit, OnChanges {

  @Input() gmbAccount: GmbAccount;
  @Input() disabled = false;

  @Output() edit: EventEmitter<any> = new EventEmitter();
  @Output() scanRequests: EventEmitter<any> = new EventEmitter();
  @Output() login: EventEmitter<any> = new EventEmitter();
  @Output() scanBizList: EventEmitter<any> = new EventEmitter();

  now = new Date();

  scanningBizList = false;
  scanningRequests = false;
  loginRequest = false;

  expandBizLis = false;

  constructor(private _global: GlobalService) { }

  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges) {
  }

  clickEdit() {
    this.edit.emit(JSON.parse(JSON.stringify(this.gmbAccount)));
  }

  clickScanRequests() {
    this.scanningRequests = true;
    this.scanRequests.emit({
      object: this.gmbAccount,
      acknowledge: (error) => {
        this.scanningRequests = false;
      }
    });
  }

  clickLogin() {
    this.loginRequest= true;
    this.login.emit({
      object: this.gmbAccount,
      acknowledge: (error) => {
        this.loginRequest = false;
      }
    });
  }
  
  clickScanBizList() {
    this.scanningBizList = true;
    this.scanBizList.emit({
      object: this.gmbAccount,
      acknowledge: (error) => {
        this.scanningBizList = false;
      }
    });
  }
  isAdmin(){
    return this._global.user.roles.some(r => r ==='ADMIN');
  }

}
