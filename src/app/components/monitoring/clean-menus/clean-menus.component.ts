import {Component, OnInit, ViewChild} from '@angular/core';
import {ApiService} from '../../../services/api.service';
import {GlobalService} from '../../../services/global.service';
import {environment} from '../../../../environments/environment';
import {Menu, Restaurant} from '@qmenu/ui';
import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import {AlertType} from '../../../classes/alert-type';
import {MenuCleanupComponent} from '../../restaurants/menu-cleanup/menu-cleanup.component';
import {Helper} from '../../../classes/helper';
import { MenuCleaner } from 'src/app/classes/menu-cleaner';
import {PrunedPatchService} from '../../../services/prunedPatch.service';

@Component({
  selector: 'app-clean-menus',
  templateUrl: './clean-menus.component.html',
  styleUrls: ['./clean-menus.component.css']
})
export class CleanMenusComponent implements OnInit {

  constructor(private _api: ApiService, private _prunedPatch: PrunedPatchService, private _global: GlobalService) {
  }

  @ViewChild('validateModal') validateModal: ModalComponent;
  @ViewChild('cleanupComponent') cleanupComponent: MenuCleanupComponent;
  @ViewChild('previewAutoModal') previewAutoModal: ModalComponent;
  restaurants: Restaurant[] = [];
  restaurant: Restaurant;
  handleIDsOnly = false;
  extractedMcs = [];

  async ngOnInit() {
    await this.getRTs();
  }

  async getRTs() {
    const rts = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: { disabled: { $ne: true } },
      projection: { 'menus.name': 1, 'menus.mcs.name': 1, 'menus.mcs.mis.name': 1, 'menus.mcs.mis.number': 1, name: 1, translations: 1 }
    }, 500);

    this.restaurants = rts.filter(rt => MenuCleaner.needClean(rt));
  }
  previewClose() {
    this.restaurant = null;
    this.extractedMcs = [];
    this.previewAutoModal.hide();
  }
  async previewAuto(rt) {
    let [restaurant] = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {_id: {$oid: rt._id}},
      projection: {name: 1, menus: 1, translations: 1},
      limit: 1
    }).toPromise();
    this.restaurant = restaurant;
    this.extractedMcs = [];
    this.restaurant.menus.forEach(menu => {
      menu.mcs.forEach(mc => {
        // @ts-ignore
        let {numbers, confidence} = MenuCleaner.extractMenuItemNumber(mc) || {};
        if (numbers) {
          this.extractedMcs.push({menu: menu.name, ...mc, numbers, confidence});
        }
      });
    });
    this.previewAutoModal.show();
  }

  async clean(rt) {
    let [restaurant] = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {_id: {$oid: rt._id}},
      projection: {name: 1, menus: 1, translations: 1},
      limit: 1
    }).toPromise();
    this.restaurant = restaurant;
    this.handleIDsOnly = false;
    this.validateModal.show();
    setTimeout(() => {
      this.cleanupComponent.collect();
    }, 0);
  }

  handleIDsOnlyChange() {
    setTimeout(() => {
      this.cleanupComponent.collect();
    }, 0);
  }


  cleanupCancel() {
    // @ts-ignore
    this.restaurant = null;
    this.validateModal.hide();
    this.handleIDsOnly = false;
  }

  async cleanupSave({menus, translations}: any) {
    try {
      await this._prunedPatch.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: {_id: this.restaurant['_id']},
        new: {_id: this.restaurant['_id'], menus, translations}
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
