import { Component, OnInit, ViewChild } from '@angular/core';
import { User } from '../../classes/user';
import { ApiService } from '../../services/api.service';
import { environment } from '../../../environments/environment';
import { GlobalService } from '../../services/global.service';
// import { ModalComponent } from 'qmenu-ui/bundles/qmenu-ui.umd';
import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
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
  existingRoleItems = [ 'ACCOUNTANT','ADMIN', 'DRIVER', 'GMB', 'MARKETER', 'MARKETING_DIRECTOR', 'MENU_EDITOR'].map(role => ({
    text: role,
    object: role
  }));

  deleting = false;

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {

    // get all users
    this._api.get(environment.adminApiUrl + 'generic', {resource: 'user', limit: 1000 }).subscribe(
      result => {
        this.users = result.map(u => new User(u));
        this.sortUsers(this.users);
      },
      error => {
        this._global.publishAlert(AlertType.Danger, 'Error pulling users from API');
      });
  }

  toggleDeleting() {
    this.deleting = !this.deleting;
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
      label: 'User Name',
      disabled: !!user._id
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

  formRemove(event) {
    // api delete here...
    this._api.delete(environment.adminApiUrl + 'users', {ids: [this.userInEditing._id]}).subscribe(result => {
      event.acknowledge(null);
      this.users = this.users.filter(u => u.username !== this.userInEditing.username);
      this.editingModal.hide();
      this._global.publishAlert(AlertType.Danger, this.userInEditing.username + ' was deleted');
    }, error => {
      event.acknowledge(error.json() || error);
    });
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
        const ignoreFields = ['createdAt', 'updatedAt'];
        // ignore password if empty!
        if (['', null].indexOf(this.userInEditing.password) >= 0) {
          ignoreFields.push('password');
        }

        const diffs = DeepDiff.getDiff(originalUser._id, originalUser, this.userInEditing, ignoreFields);

        if (diffs.length === 0) {
          event.acknowledge('Nothing changed');
        } else {
          // api update here...
          this._api.patch(environment.adminApiUrl + 'users', diffs).subscribe(result => {
            event.acknowledge(null);
            // let's update original, assuming everything successful
            Object.assign(originalUser, this.userInEditing);
            this.editingModal.hide();
            this._global.publishAlert(AlertType.Success, this.userInEditing.username + ' was updated');
          }, error => {
            event.acknowledge(error.json() || error);
          });

        }
      }

    } else {
      // must be new
      this._api.post(environment.adminApiUrl + 'users', [this.userInEditing]).subscribe(result => {
        event.acknowledge(null);
        // we get ids returned
        this.userInEditing._id = result[0];
        this.users.push(new User(this.userInEditing));
        this.sortUsers(this.users);
        this.editingModal.hide();
        this._global.publishAlert(AlertType.Success, this.userInEditing.username + ' was added');
      }, error => {
        event.acknowledge(error.json() || error);
      });
    }
  }

}
