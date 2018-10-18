import { Component, OnInit, Input, Output, EventEmitter, OnChanges, ViewChild, ElementRef } from '@angular/core';
import { Phone } from '@qmenu/ui';
import { SelectorComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';

@Component({
  selector: 'app-restaurant-phone-editor',
  templateUrl: './restaurant-phone-editor.component.html',
  styleUrls: ['./restaurant-phone-editor.component.css']
})
export class RestaurantPhoneEditorComponent implements OnInit, OnChanges {
  @Input() phone: Phone = new Phone();
  @Output() onDone = new EventEmitter();
  @Output() onCancel = new EventEmitter();
  @Output() onDelete = new EventEmitter();
  @ViewChild('notificationSelector') notificationSelector: SelectorComponent;
  @ViewChild('typeSelector') typeSelector: SelectorComponent;
  @ViewChild('validationBox') validationBox;

  oldNumber;
  codeSent = false;
  textReceived = null;

  ngOnInit() {
  }

  ngOnChanges(params) {
    if (this.phone) {
      this.oldNumber = this.phone.phoneNumber;
      this.typeSelector.selectedValues.length = 0;
      if (this.phone && this.phone.type) {
        this.typeSelector.selectedValues.push(this.phone.type);
      }

      let values = this.notificationSelector.selectedValues;
      values.length = 0;

      if (this.phone.callable) {
        values.push('Call');
      }
      if (this.phone.faxable) {
        values.push('Fax');
      }
      if (this.phone.textable) {
        values.push('Text');
      }
    }
  }

  getNotificationType(selectedValues) {
    let map = { Mobile: 'text', Business: 'call', 'Fax': 'fax' };
    if (selectedValues && selectedValues.length > 0) {
      return map[selectedValues[0]];
    }
    return 'notification';
  }

  isPhoneValid() {
    return this.phone && this.phone.phoneNumber && this.phone.phoneNumber.match(/^[2-9]\d{2}[2-9]\d{2}\d{4}$/);
  }

  ok() {
    if (this.phone && this.phone.phoneNumber && this.phone.phoneNumber === this.oldNumber) {
      this.done();
    } else {
      this.codeSent = true;
      // this._security.sendText(this.phone.phoneNumber).subscribe(
      //   d => { this.textReceived = d; this.validationBox && this.validationBox.focus(); }
      // );
    }
  }

  cancel() {
    this.onCancel.emit(this.phone);
  }

  remove() {
    this.onDelete.emit(this.phone);
  }

  done() {
    this.phone.callable = this.notificationSelector.selectedValues.indexOf('Call') >= 0;
    this.phone.textable = this.notificationSelector.selectedValues.indexOf('Text') >= 0;
    this.phone.faxable = this.notificationSelector.selectedValues.indexOf('Fax') >= 0;
    this.phone.type = this.typeSelector.selectedValues.length > 0 ? this.typeSelector.selectedValues[0] : '';
    this.onDone.emit(this.phone);
    this.codeSent = false;
  }
}
