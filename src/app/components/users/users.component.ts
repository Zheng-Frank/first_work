import { Component, OnInit, ViewChild } from '@angular/core';
import { User } from '../../classes/user';
import { Alert } from '../../classes/alert';
import { ApiService } from '../../services/api.service';
import { environment } from '../../../environments/environment';
import { GlobalService } from '../../services/global.service';
// import { ModalComponent } from 'qmenu-ui/bundles/qmenu-ui.umd';
import { ModalComponent } from 'qmenu-ui/qmenu-ui.es5';
import { AlertType } from '../../classes/alert-type';
import { DeepDiff } from '../../classes/deep-diff';

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
  formFieldDescriptors = [];


  existingUsernameItems = [];
  existingRoleItems = ['ADMIN', 'DRIVER', 'MENU_EDITOR', 'MARKETING_DIRECTOR', 'MARKETER', 'ACCOUNTANT'].map(role => ({
    text: role,
    object: role
  }));

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {

    // get all users
    this._api.get(environment.apiBaseUrl + 'users', { ids: [] }).subscribe(
      result => {
        this.users = result.map(u => new User(u));
        this.sortUsers(this.users);
      },
      error => {
        this._global.publishAlert(AlertType.Danger, 'Error pulling users from API');
      });
  }

  sortUsers(users) {
    users.sort((u1, u2) => u1.username.localeCompare(u2.username));
  }

  edit(user) {
    // use a copy instead of original
    if (!user) {
      user = new User();
    } else {
      user = new User(user);
    }

    this.formFieldDescriptors = [{
      field: 'username',
      label: 'User Name'
    },
    {
      field: 'password',
      label: user._id ? 'Password (leave blank, unless updating)' : 'Password',
      required: !user._id, // not required if editing
      inputType: 'password'
    },
    {
      field: 'manager',
      label: 'Manager',
      inputType: 'single-select',
      required: false,
      items: this.users
        .filter(u => u.username !== user.username)
        .map(u => ({ object: u.username, text: u.username, selected: false }))
    },
    {
      field: 'roles',
      label: 'Roles',
      inputType: 'multi-select',
      required: true,
      minSelection: 0,
      maxSelection: 100,
      items: this.existingRoleItems
    }
    ];

    this.userInEditing = user;
    this.editingModal.show();
  }

  test() {
    
    const diff = DeepDiff.getDiff([1, 2, '3', 4], [1, 2, 3]);

    console.log(JSON.parse(JSON.stringify(diff)));




  }
  formSubmit(event) {
    if (this.userInEditing._id) {
      // patching
      const originalUser = this.users.filter(u => u._id === this.userInEditing._id)[0];
      if (!originalUser) {
        // something terrible happened!
        this._global.publishAlert(AlertType.Danger, 'Something wrong!');
        event.acknowledge(null);
      } else {
        // create patch, ignore password!
        if (['', null].indexOf(this.userInEditing.password) < 0) {
          delete this.userInEditing.password;
          delete originalUser.password;
        }
        // const patches = patchGen(originalUser, this.userInEditing);
        // if (patches.length === 0) {
        //   event.acknowledge('Nothing changed');
        // } else {
        //   // api update here...
        //   console.log(patches);
        //   event.acknowledge(null);
        // }
      }

    } else {
      // must be new
      this._api.post(environment.apiBaseUrl + 'users', [this.userInEditing]).subscribe(result => {
        event.acknowledge(null);
        // we get ids returned
        this.userInEditing._id = result[0];
        this.users.push(new User(this.userInEditing));
        this.sortUsers(this.users);
        this.editingModal.hide();
        this._global.publishAlert(AlertType.Success, this.userInEditing.username + ' was added');
      }, error => {
        event.acknowledge(error);
      });
    }
  }

}
