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
  handleIDsOnly = true;

  async ngOnInit() {
    await this.getRTs();
  }

  async getRTs() {
    let rts = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {disabled: {$ne: true}, menuCleaned: {$ne: true}},
      projection: {name: 1},
      limit: 20000
    }, 10000);
    let needCleanMenus = new Set(require('./rts-need-clean-menu.json'));
    this.restaurants = rts.filter(rt => needCleanMenus.has(rt._id));
  }

  async validate(rt) {
    let [restaurant] = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {_id: {$oid: rt._id}},
      projection: {name: 1, menus: 1, translations: 1},
      limit: 1
    }).toPromise();
    this.restaurant = restaurant;
    this.handleIDsOnly = true;
    this.validateModal.show();
    setTimeout(() => {
      this.cleanupComponent.collect();
    }, 0);
  }


  cleanupCancel() {
    // @ts-ignore
    this.restaurants = this.restaurants.filter(rt => !rt.menuCleaned);
    this.restaurant = null;
    this.validateModal.hide();
    this.handleIDsOnly = true;
  }

  async cleanupSkip() {
    try {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: {
          _id: this.restaurant['_id']
        }, new: {
          _id: this.restaurant['_id'], menuCleaned: true
        }
      }]).toPromise();
      this._global.publishAlert(AlertType.Success, 'Success!');
      let rt = this.restaurants.find(x => x._id === this.restaurant._id);
      if (rt) {
        // @ts-ignore
        rt.menuCleaned = true;
      }
      this.cleanupCancel();
    } catch (error) {
      console.log('error...', error);
      this._global.publishAlert(AlertType.Danger, 'Menus update failed.');
    }
  }

  async cleanupSave({menus, translations}: any) {
    try {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: {
          _id: this.restaurant['_id']
        }, new: {
          _id: this.restaurant['_id'],
          menus, translations, menuCleaned: true
        }
      }]).toPromise();
      this._global.publishAlert(AlertType.Success, 'Success!');
      // @ts-ignore
      this.restaurant.menus = menus.map(m => new Menu(m));
      let rt = this.restaurants.find(x => x._id === this.restaurant._id);
      if (rt) {
        // @ts-ignore
        rt.menuCleaned = true;
      }
      this.cleanupCancel();
    } catch (error) {
      console.log('error...', error);
      this._global.publishAlert(AlertType.Danger, 'Menus update failed.');
    }
  }
}
