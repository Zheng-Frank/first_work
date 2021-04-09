import { Component, OnInit, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import {Menu, Hour, Restaurant} from '@qmenu/ui';
import { Helper } from '../../../classes/helper';
import { ApiService } from '../../../services/api.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-menu-editor',
  templateUrl: './menu-editor.component.html',
  styleUrls: ['./menu-editor.component.css']
})
export class MenuEditorComponent implements OnInit {

  menu: Menu;
  @Input() timezone = 'America/New_York';
  @Output() onDelete = new EventEmitter();
  @Output() onDone = new EventEmitter();
  @Output() onCancel = new EventEmitter();
  @Input() enableDelete = true;
  @Input() restaurant: Restaurant;

  clickedAddHour = false;
  clickedDelete = false;
  selectedOption = 'New Menu';

  uploadImageError: string;

  targets = [
    {
      value: 'ONLINE_ONLY',
      text: 'Online only'
    }, {
      value: 'DINE_IN_ONLY',
      text: 'Dine-in only'
    }, {
      value: 'ALL',
      text: 'Both online and dine-in'
    }];

  selectedTarget = this.targets[0];

  constructor(private _api: ApiService, private _http: HttpClient) { }

  ngOnInit() {
  }

  isValid() {
    if (!this.menu || !this.restaurant.menus) {
      return false;
    }
    const nonselfMenus = this.restaurant.menus.filter(each => each.id !== this.menu.id);
    return this.menu.name && !nonselfMenus.some(each => each.name === this.menu.name)
  }

  createArrayOfMenuNames() {
    return this.restaurant.menus.map(menu => menu.name)
  }

  radioSelect(event) {
    if (event === 'New Menu') {
      this.setMenu(new Menu());
    }
  }

  copyMenu(selectedMenuName) {
    const menuCopy = new Menu(this.restaurant.menus.find(menu => menu.name === selectedMenuName));
    menuCopy.name += ' - Copy';
    delete menuCopy.id; // delete the copy's id, or else we will just end up editing the existing menu
    menuCopy.mcs.map(mc => {
      mc.id += '0'
      mc.mis.map(mi => {
        mi.id += '0'; // append a 0 to all Mc and Mi id's to keep them unique
      })
    })
    this.setMenu(menuCopy);
  }

  setMenu(menu: Menu) {
    this.menu = menu;
    if (menu === new Menu()) {
      // if the passed-in menu is a blank menu, then we should reset our editing modal
      this.selectedOption = 'New Menu';
    }
    this.selectedTarget = this.targets.filter(t => t.value === menu['targetCustomer'])[0] || this.targets[0];
  }

  getHours() {
    return this.menu.hours || [];
  }

  getStringOfDays(hours: Hour[]) {
    return hours.map(d => d.toDayString(this.restaurant.googleAddress.timezone)).join(', ');
  }

  doneAddingHour(hours: Hour[]) {
    this.menu.hours = this.menu.hours || [];
    hours.forEach(h => {
      // only add non-duplicated ones
      if (this.menu.hours.filter(hh => h.equals(hh)).length === 0) {
        this.menu.hours.push(h);
      }
    });
    // sort!
    this.menu.hours.sort((a, b) => a.fromTime.valueOf() - b.fromTime.valueOf());
    this.clickedAddHour = false;
  }

  selectSwitchValue(value) {
    this.menu.disabled = (value === 'Disabled');
  }

  deleteHour(hour) {
    this.menu.hours = this.menu.hours.filter(h => h !== hour);
  }

  ok() {

    if (this.menu && this.menu.name) {
      this.menu.name = this.menu.name.trim();
    }

    delete this.menu['targetCustomer'];
    if (this.selectedTarget && this.selectedTarget.value !== 'ONLINE_ONLY') {
      this.menu['targetCustomer'] = this.selectedTarget.value;
    }

    this.onDone.emit(this.menu);
    this.clickedDelete = false;
  }

  cancel() {
    this.onCancel.emit(this.menu);
    this.clickedDelete = false;
  }

  delete() {
    this.clickedDelete = true;
  }

  confirmDeletion() {
    this.clickedDelete = false;
    this.onDelete.emit(this.menu);
  }

  cancelDeletion() {
    this.clickedDelete = false;
  }

  deleteBackgroundImage() {
    this.menu.backgroundImageUrl = undefined;
  }

  async onUploadImageChange(event) {
    this.uploadImageError = undefined;
    let files = event.target.files;
    try {
      const data: any = await Helper.uploadImage(files, this._api, this._http);

      if (data && data.Location) {
        this.menu.backgroundImageUrl = data.Location;
      }
    }
    catch (err) {
      this.uploadImageError = err;
    }
  }
}
