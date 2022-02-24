import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { environment } from '../../../environments/environment';
import { GlobalService } from '../../services/global.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  username;
  password;
  apiRequesting = false;
  apiError;
  constructor(private _api: ApiService, private _global: GlobalService, private _router: Router) {
    // 1. make clean logout;
    this._global.logout();
    // 2. retrieve suggested username
    this.username = this._global.storeGet('username');
  }

  ngOnInit() {
  }

  login() {
    this.apiRequesting = true;
    this.apiError = undefined;
    this._api.post(environment.qmenuApiUrl + 'auth/login', {
      username: this.username,
      password: this.password
    }).subscribe(
      result => {
        this.apiRequesting = false;
        this._global.storeSetUsernameAndToken(this.username, result.token);
        let roles = this._global.user.roles;
        if (roles.length === 1 && roles.includes('SST_USER')) {
          this._router.navigate(['qm-bm-sst']);
        } else {
          this._router.navigate(['home']);
        }
      },
      error => { this.apiRequesting = false; this.apiError = error.json(); console.log(error); });
  }
}
