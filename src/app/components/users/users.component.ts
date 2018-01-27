import { Component, OnInit } from '@angular/core';
import { User } from '../../classes/user';
import { ApiService } from '../../services/api.service';
import { environment } from '../../../environments/environment';
import { GlobalService } from '../../services/global.service';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {

  users: User[] = [];
  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {

    // get all users
    this._api.get(environment.apiBaseUrl + 'users', { ids: [] }).subscribe(
      result => {
        this.users = result.map(u => new User(u));
      },
      error => {
        console.log(error);
      });
  }

}
