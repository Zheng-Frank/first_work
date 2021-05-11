import { query } from '@angular/core/src/render3/query';
import { filter } from 'rxjs/operators';
import { AlertType } from 'src/app/classes/alert-type';
import { GlobalService } from './../../../services/global.service';
import { Component, Input } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { ApiService } from 'src/app/services/api.service';
import { environment } from 'src/environments/environment';
import { User } from 'src/app/classes/user';

@Component({
  selector: 'app-restaurant-qr-settings',
  templateUrl: './restaurant-qr-settings.component.html',
  styleUrls: ['./restaurant-qr-settings.component.css']
})
export class RestaurantQrSettingsComponent {
  @Input() restaurant: Restaurant;
  users = [];
  salesPerson;
  editing = false;
  customizedRenderingStyles;
  viewOnly;
  userRoles = ['ADMIN', 'CSR'];

  constructor(private _api: ApiService, private _global: GlobalService) {
    this.getUser();
  }
  ngOnInit() {

  }
  toggleEditing() {
    this.editing = !this.editing;
    this.viewOnly = this.restaurant['qrSettings'].viewOnly;

  }
  cancel() {
    this.editing = !this.editing;
  }
  async getUser() {
    // get all users
    this.users = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'user',
      query: {
        disabled: {
          $ne: true
        },
        username:{
          $ne:''
        }
      },
      projection: {
        _id: 1,
        username: 1,
        roles: 1
      },
      limit: 1000
    }, 500);
    this.users = this.users.map(u => {
      if (this.isCSRAndAdmin(u)) {
        return {
          _id: u._id,
          username: u.username
        };
      }
    });
  }

  // if user is admin or csr,he or she could see the sales person editor function.
  isVisable() {
    return this._global.user.roles.some(r => this.userRoles.includes(r));
  }
  // the drop down only show user who is admin or csr.
  isCSRAndAdmin(u: User) {
    return u.roles.some(r => this.userRoles.includes(r));
  }
  async doEdit() {
    try {
      if (this.isVisable()) {
        // this.salesPerson = JSON.parse(JSON.stringify(this.salesPerson));
        await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
          old: { _id: this.restaurant._id, qrSettings: {} },
          new: { _id: this.restaurant._id, qrSettings: { viewOnly: this.viewOnly, salesPerson:this.salesPerson } }
        }]).toPromise();  // only admin and csr person can edit it.
      } else {
        await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
          old: { _id: this.restaurant._id, qrSettings: {} },
          new: { _id: this.restaurant._id, qrSettings: { viewOnly: this.viewOnly } }
        }]).toPromise();
      }
    } catch (e) {
      console.log(e);
    }
    this.restaurant['qrSettings'].viewOnly = this.viewOnly;
    this.restaurant['qrSettings'].salesPerson = this.salesPerson;
    this.editing = false;
  }

}