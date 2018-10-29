import { Component, OnInit, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { Menu, Hour } from '@qmenu/ui';
import { SelectorComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import { Helper } from '../../../classes/helper';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";

@Component({
  selector: 'app-menu-editor',
  templateUrl: './menu-editor.component.html',
  styleUrls: ['./menu-editor.component.css']
})
export class MenuEditorComponent implements OnInit {

  menu: Menu;
  @Input() offsetToEST = 0;
  @Output() onDelete = new EventEmitter();
  @Output() onDone = new EventEmitter();
  @Output() onCancel = new EventEmitter();
  @Input() enableDelete = true;

  clickedAddHour = false;
  clickedDelete = false;

  uploadImageError: string;

  constructor(private _api: ApiService) { }

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
    const jan = new Date(new Date().getFullYear(), 0, 1);
    const browserHoursAhead = 5 - (this.offsetToEST || 0) - jan.getTimezoneOffset() / 60;
    hours.map(h => {
      h.fromTime.setHours(h.fromTime.getHours() + browserHoursAhead);
      h.toTime.setHours(h.toTime.getHours() + browserHoursAhead);
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

  onUploadImageChange(event) {
    this.uploadImageError = undefined;
    let files = event.target.files;
    this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "key",
      projection: {
        awsAccessKeyId: 1,
        awsSecretAccessKey: 1
      },
      limit: 1
    })
      .subscribe(keys => {
        console.log('keys', keys);
        Helper.uploadImage(files, (err, data) => {
          if (err) {
            this.uploadImageError = err;
          } else if (data && data.Location) {
            this.menu.backgroundImageUrl = data.Location;
          }
        });
      });


  }
}
