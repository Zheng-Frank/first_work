import { Component, OnInit, ViewChild } from '@angular/core';
import { User } from '../../classes/user';
import { ApiService } from '../../services/api.service';
import { environment } from '../../../environments/environment';
import { GlobalService } from '../../services/global.service';
// import { ModalComponent } from 'qmenu-ui/bundles/qmenu-ui.umd';
import { ModalComponent } from 'qmenu-ui/qmenu-ui.es5';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {
  @ViewChild('editingModal') editingModal: ModalComponent;
  users: User[] = [];

  userInEditing = new User();

  // for editing
  formFieldDescriptors = [
    {
      field: 'username',
      label: 'User Name'
    },
    {
      field: 'manager',
      label: 'Manager',
      inputType: 'select'
    },
    {
      field: 'agree',
      label: 'Agree to the terms.',
      inputType: 'checkbox'
    }
  ];

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

  edit(user) {
    this.userInEditing = user ? new User(user) : new User();
    this.editingModal.show();
  }


  formSubmit(event) {
    console.log(event);
    // simulate API request...
    setTimeout(() => event.acknowledge(new Date().valueOf() % 2 === 0 ? null : 'Simulated error occured.'), 1000);
  }

}
