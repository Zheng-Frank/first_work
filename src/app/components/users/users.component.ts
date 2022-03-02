import { Component, OnInit, ViewChild } from '@angular/core';
import { User } from '../../classes/user';
import { ApiService } from '../../services/api.service';
import { environment } from '../../../environments/environment';
import { GlobalService } from '../../services/global.service';
import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import { AlertType } from '../../classes/alert-type';
import { Helper } from "../../classes/helper";

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {
  @ViewChild('editingModal') editingModal: ModalComponent;
  users: User[] = [];
  roleUsers = [];
  showDisabled = false;
  userInEditing = new User();
  // for editing
  formFieldDescriptors = [];


  existingUsernameItems = [];
  existingRoleItems = [
    'ACCOUNTANT',
    'ADMIN',
    'CRM',
    'CSR_MANAGER',
    'CSR',
    'DEVELOPER',
    'DRIVER',
    'FRAUD_TRACKER',
    'GMB_SPECIALIST',
    'GMB',
    'INVOICE_VIEWER',
    'IVR_CSR_MANAGER',
    'IVR_GMB_MANAGER',
    'IVR_INTERNAL_MANAGER',
    'IVR_SALES_MANAGER',
    'MARKETER_EXTERNAL',
    'MARKETER_INTERNAL',
    'MARKETER_MANAGER',
    'MARKETER',
    'MENU_EDITOR', 'PAYER',
    'PHONE_ORDERING_AGENT',
    'RATE_EDITOR',
    'SIGNUP_AGENT',
    'SST_USER',
    // NOTE: please add new roles in alphabetical order
  ].map(role => ({
    text: role,
    object: role
  }));

  exisingLanguages = ['EN', 'CH'].map(lan => ({ text: lan, object: lan }));

  deleting = false;
  showMore = false;
  showNotes = false; // it will show email info, skype info and others in notes field of user json if it is checked
  constructor(private _api: ApiService, private _global: GlobalService) { }

  get userRoles() {
    return this._global.user.roles || [];
  }

  isAdmin() {
    return this.userRoles.includes('ADMIN');
  }

  ngOnInit() {

    // get all users
    this._api.get(environment.qmenuApiUrl + 'generic', { resource: 'user', limit: 1000 }).subscribe(
      result => {
        if (this.userRoles.includes('CSR_MANAGER') && !this.isAdmin()) {
          // CSR_MANAGER can only see uses that not admin or csr_manager
          result = result.filter(x => {
            let roles = x.roles || [];
            return !roles.includes('ADMIN') && !roles.includes('CSR_MANAGER');
          });
        }
        this.users = result.map(u => new User(u));
        this.sortAndCatogorize(this.users);

      },
      error => {
        this._global.publishAlert(AlertType.Danger, 'Error pulling users from API');
      });
  }

  getTableUserCount() {
    return this.users.filter(user => this.showDisabled || !user.disabled).length;
  }

  getDisabledUsers() {
    return this.users.filter(user => user.disabled);
  }
  toggleDeleting() {
    this.deleting = !this.deleting;
  }

  sortAndCatogorize(users) {
    users.sort((u1, u2) => u1.username.localeCompare(u2.username));
    const roleMap = {};
    this.users.map(u => (u.roles || []).map(r => {
      roleMap[r] = roleMap[r] || [];
      roleMap[r].push({ username: u.username, disabled: u.disabled });
    }));

    this.roleUsers = Object.keys(roleMap).map(role => ({ role: role, users: roleMap[role] }));

    if (!this.isAdmin()) {
      this.roleUsers = this.roleUsers.filter(x => !['ADMIN', 'CSR_MANAGER'].includes(x.role));
    }
    this.roleUsers.sort((ru1, ru2) => ru1.role > ru2.role ? 1 : -1);
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
      inputType: 'select',
      required: false,
      items: [{object: '', text: '', selected: false}, ...this.users
        .filter(u => u.username !== user.username && !u.disabled)
        .map(u => ({ object: u.username, text: u.username, selected: false }))]
    },
    {
      field: 'roles',
      label: 'Roles',
      inputType: 'multi-select',
      required: false,
      minSelection: 0,
      maxSelection: 100,
      items: this.existingRoleItems.map(x => {
        let disabled = !this.isAdmin() && (x.text === 'ADMIN' || x.text.endsWith('_MANAGER'));
        return { ...x, disabled };
      })
    },
    {
      field: 'ivrUsername',
      label: 'IVR Username',
      required: false,
    },
    {
      field: 'languages',
      label: 'Languages',
      inputType: 'multi-select',
      required: false,
      minSelection: 0,
      maxSelection: 10,
      items: this.exisingLanguages
    },
    {
      field: 'disabled',
      label: 'Disabled',
      inputType: 'checkbox',
      required: false,
    }
    ];
    this.showMore = false;
    this.userInEditing = user;
    this.editingModal.show();
  }

  formRemove(event) {
    // api delete here...
    this._api.delete(environment.qmenuApiUrl + 'generic',
      {
        resource: 'user',
        ids: [this.userInEditing._id]
      }).subscribe(result => {
        event.acknowledge(null);
        this.users = this.users.filter(u => u.username !== this.userInEditing.username);
        this.editingModal.hide();
        this._global.publishAlert(AlertType.Danger, this.userInEditing.username + ' was deleted');
      }, error => {
        event.acknowledge(error.json() || error);
      });
  }

  formSubmit(event) {

    if (this.userInEditing.notes && this.userInEditing.notes.length > 1000) {
      event.acknowledge(null);
      return this._global.publishAlert(AlertType.Danger, 'Notes limit 1000 characters!');
    }
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

        const originalUserClone = JSON.parse(JSON.stringify(originalUser));
        const userInEditingClone = JSON.parse(JSON.stringify(this.userInEditing));
        ignoreFields.map(f => {
          delete originalUserClone[f];
          delete this.userInEditing[f];
        });

        if (Helper.areObjectsEqual(originalUserClone, userInEditingClone)) {
          event.acknowledge('Nothing changed');
        } else {
          // api update here...
          this._api.patch(environment.qmenuApiUrl + 'generic?resource=user', [{ old: originalUserClone, new: userInEditingClone }]).subscribe(result => {
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
      // return error message if user exists
      if (this.users.some(u => u.username === this.userInEditing.username)) {
        event.acknowledge(null);
        return this._global.publishAlert(AlertType.Danger, 'User exists!');
      }
      // must be new
      this._api.post(environment.qmenuApiUrl + 'users', [this.userInEditing]).subscribe(result => {
        event.acknowledge(null);
        // we get ids returned
        this.userInEditing._id = result[0];
        this.users.push(new User(this.userInEditing));
        this.sortAndCatogorize(this.users);
        this.editingModal.hide();
        this._global.publishAlert(AlertType.Success, this.userInEditing.username + ' was added');
      }, error => {
        event.acknowledge(error.json() || error);
      });
    }
  }

}
