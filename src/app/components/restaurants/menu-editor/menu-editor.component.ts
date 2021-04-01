import { Component, OnInit, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { Menu, Hour, Restaurant } from '@qmenu/ui';
import { Helper } from '../../../classes/helper';
import { ApiService } from '../../../services/api.service';
import { TimezoneService } from '../../../services/timezone.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-menu-editor',
  templateUrl: './menu-editor.component.html',
  styleUrls: ['./menu-editor.component.css']
})
export class MenuEditorComponent implements OnInit {

  menu: Menu;
  @Input() offsetToEST = 0;
  @Input() timezone = 'America/New_York';
  @Output() onDelete = new EventEmitter();
  @Output() onDone = new EventEmitter();
  @Output() onCancel = new EventEmitter();
  @Input() enableDelete = true;
  @Input() restaurant: Restaurant;

  clickedAddHour = false;
  clickedDelete = false;

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

  constructor(private _api: ApiService, private _http: HttpClient, private _timezone: TimezoneService) { }

  ngOnInit() {
  }

  isValid() {
    return this.menu && this.menu.name;
  }

  setMenu(menu: Menu) {
    this.menu = menu;
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

    // correct offsetToEST, hour-picker is only for your LOCAL browser. We need to translate it to restaurant's hour settings
    hours.map(h => {
      h.fromTime = this._timezone.transformToTargetTimeUsingCurrentOffset(h.fromTime, this.timezone);
      h.toTime = this._timezone.transformToTargetTimeUsingCurrentOffset(h.toTime, this.timezone);
    });

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
