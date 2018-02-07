import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { environment } from '../../../environments/environment';
import { GlobalService } from '../../services/global.service';
import { global } from '@angular/core/src/util';
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
    this.username = this._global.storeGetUsername();
  }

  ngOnInit() {
  }

  login() {
    this.apiRequesting = true;
    this.apiError = undefined;
    this._api.post(environment.lambdaUrl + 'auth/csr-login', {
      username: this.username,
      password: this.password
    }).subscribe(
      result => {
        this.apiRequesting = false;
        this._global.storeSetUsernameAndToken(this.username, result.token);
        this._router.navigate(['home']);
      },
      error => { this.apiRequesting = false; this.apiError = error.json(); console.log(error); });
  }
}
