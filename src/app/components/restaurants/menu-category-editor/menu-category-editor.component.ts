import { Component, ViewChild, OnInit, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { Mc, Item, Mi, MenuOption } from '@qmenu/ui';
import { OptionsEditorComponent } from '../options-editor/options-editor.component';
import { SelectorComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import { Router, NavigationStart } from '@angular/router';
import { Helper } from '../../../classes/helper';

declare var $: any;

@Component({
  selector: 'app-menu-category-editor',
  templateUrl: './menu-category-editor.component.html',
  styleUrls: ['./menu-category-editor.component.css']
})
export class MenuCategoryEditorComponent implements OnInit, OnChanges {
  @Input() mc: Mc;
  @Input() mcNames: string[] = []; // for suggestions
  @Input() menuOptions: MenuOption[] = [];

  @Output() onDelete = new EventEmitter();
  @Output() onDone = new EventEmitter();
  @Output() onCancel = new EventEmitter();

  uploadImageError: string;

  constructor(private _router: Router) {

  }

  ngOnInit() {
  }

  ngOnChanges(params) {
    // console.log(params);
  }

  setMc(mc: Mc, menuOptions: MenuOption[]) {
    this.mc = mc;
    this.menuOptions = menuOptions || [];
  }

  menuOptionIdsChange() {
    if (this.mc.menuOptionIds) {
      this.mc.menuOptionIds = undefined;
    } else {
      this.mc.menuOptionIds = [];
    }
  }

  gotoMenuOptions() {
    // clear popup, then go!
    const modals = $('.modal');
    const self = this;
    if (modals && modals.hasClass('in')) {
      modals.on('hidden.bs.modal', function () {
        modals.off('hidden.bs.modal');
        self._router.navigate(['/menu-options']);
      });
      modals.modal('hide');
    } else {
      self._router.navigate(['/menu-options']);
    }
  }


  isValid() {
    return this.mc.name;
  }

  deleteImage(img) {
    this.mc.images.splice(this.mc.images.indexOf(img), 1);
  }

  onUploadImageChange(event) {
    this.uploadImageError = undefined;
    let files = event.target.files;
    Helper.uploadImage(files, (err, data) => {
      this.mc.images = this.mc.images || [];
      if (err) {
        this.uploadImageError = err;
      } else if (data && data.Location) {
        this.mc.images.push(data.Location);
      }
    });
  }

  ok() {
    // should do validation first
    // let's remove empty menuOptionIds
    if (this.mc.menuOptionIds && this.mc.menuOptionIds.length === 0) {
      delete this.mc.menuOptionIds;
    }

    this.onDone.emit(this.mc);
  }

  cancel() {
    this.onCancel.emit(this.mc);
  }

  delete() {
    this.onDelete.emit(this.mc);
  }

  selectSwitchValue(value) {
    this.mc.disabled = (value === 'Disabled');
  }

  toggleMenuOption(mo: MenuOption) {
    this.mc.menuOptionIds = this.mc.menuOptionIds || [];
    if (this.mc.menuOptionIds.some(moId => moId === mo.id)) {
      this.mc.menuOptionIds = this.mc.menuOptionIds.filter(moId => moId !== mo.id);
    } else {
      this.mc.menuOptionIds.push(mo.id);
    }
  }

  isMenuOptionSelected(mo: MenuOption) {
    return this.mc.menuOptionIds && this.mc.menuOptionIds.some(moId => moId === mo.id);
  }
}
