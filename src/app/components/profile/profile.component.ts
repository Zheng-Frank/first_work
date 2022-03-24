import { Component } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { GlobalService } from '../../services/global.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent {

  constructor(private _api: ApiService, private _global: GlobalService) {
  }

  getUser() {
    return this._global.user;
  }

}
