import {Component, OnInit, ViewChild} from '@angular/core';
import {ApiService} from '../../../services/api.service';
import {GlobalService} from '../../../services/global.service';
import {environment} from '../../../../environments/environment';
import {Menu, Restaurant} from '@qmenu/ui';
import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import {AlertType} from '../../../classes/alert-type';
import {MenuCleanupComponent} from '../../restaurants/menu-cleanup/menu-cleanup.component';

@Component({
  selector: 'app-clean-menus',
  templateUrl: './clean-menus.component.html',
  styleUrls: ['./clean-menus.component.css']
})
export class CleanMenusComponent implements OnInit {

  constructor(private _api: ApiService, private _global: GlobalService) {
  }

  @ViewChild('validateModal') validateModal: ModalComponent;
  @ViewChild('cleanupComponent') cleanupComponent: MenuCleanupComponent;
  restaurants: Restaurant[] = [];
  restaurant: Restaurant;

  ngOnInit() {
    this.getRTs();
  }

  async getRTs() {
    this.restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {disabled: {$ne: true}, needCleanMenu: true},
      projection: {name: 1},
      limit: 20000
    }, 10000);
  }

  async validate(rt) {
    let [restaurant] = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {_id: {$oid: rt._id}},
      projection: {name: 1, menus: 1},
      limit: 1
    }).toPromise();
    this.restaurant = restaurant;
    this.validateModal.show();
    setTimeout(() => {
      this.cleanupComponent.collect();
    }, 0);
  }


  cleanupCancel() {
    this.validateModal.hide();
  }

  async cleanupSave({menus, translations}: any) {
    try {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: {
          _id: this.restaurant['_id']
        }, new: {
          _id: this.restaurant['_id'],
          menus, translations
        }
      }]).toPromise();
      this._global.publishAlert(AlertType.Success, 'Success!');
      // @ts-ignore
      this.restaurant.menus = menus.map(m => new Menu(m));
      this.cleanupCancel();
    } catch (error) {
      console.log('error...', error);
      this._global.publishAlert(AlertType.Danger, 'Menus update failed.');
    }
  }
}
