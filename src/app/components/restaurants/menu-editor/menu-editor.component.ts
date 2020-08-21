import { Component, OnInit, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { Menu, Hour } from '@qmenu/ui';
import { SelectorComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import { Helper } from '../../../classes/helper';
import { ApiService } from '../../../services/api.service';
import { TimezoneService } from '../../../services/timezone.service';
import { environment } from "../../../../environments/environment";
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

  clickedAddHour = false;
  clickedDelete = false;

  uploadImageError: string;

  constructor(private _api: ApiService, private _http: HttpClient, private _timezone: TimezoneService) { }

  ngOnInit() {
  }

  isValid() {
    return this.menu && this.menu.name;
  }

  setMenu(menu: Menu) {
    this.menu = menu;
  }

  getHours() {
    return this.menu.hours || [];
  }

  getStringOfDays(hours: Hour[]) {
    return hours.map(d => d.toDayString(this.offsetToEST || 0)).join(', ');
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
      h.fromTime = this._timezone.transformToTargetTime(h.fromTime, this.timezone);
      h.toTime = this._timezone.transformToTargetTime(h.toTime, this.timezone);
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
