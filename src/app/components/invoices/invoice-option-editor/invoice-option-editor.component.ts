import { Component, OnInit, Input, Output, ViewChild, EventEmitter } from '@angular/core';
import { RadioGroupComponent } from "@qmenu/ui/bundles/qmenu-ui.umd";
import { Restaurant,Order,Payment } from '@qmenu/ui';

@Component({
  selector: 'app-invoice-option-editor',
  templateUrl: './invoice-option-editor.component.html',
  styleUrls: ['./invoice-option-editor.component.css']
})
export class InvoiceOptionEditorComponent implements OnInit {

  @Output() onInvoiceOption = new EventEmitter();
  @Output() onCancel = new EventEmitter();
  @Output() onDelete = new EventEmitter();
  @Output() onDone = new EventEmitter();
  @Input() restaurant: Restaurant = new Restaurant();
  @Input() order: Order;
  @Input() payment: Payment;

  @ViewChild('radioGroup') radioGroup: RadioGroupComponent;

  affectedInfo = [];
  instruction: string;
  fax: string;
  email: string;
  sms: string;
  quickBook: string;
  needConfirm = false;
  clickedSubmit = false;
  
  availableInvoiceOptions = [{ name: 'Prepaid', value: 'Prepaid' }, { name: 'Non Prepaid', value: 'Non Prepaid' }];
  
  constructor() { }

  ngOnInit() {
  }

  setInvoiceOption() {
    this.radioGroup.selectedValue = (this.restaurant.creditCardProcessingMethod.indexOf('QMENU')>=0) ? 'Prepaid' : 'Non Prepaid';
  }

  setNonPrepaidCollapse() {
    if(this.radioGroup && this.radioGroup.selectedValue === 'Non Prepaid'){
      return true;
    }
    return undefined;
  }

  setPrepaidCollapse(){
    if(this.radioGroup && this.radioGroup.selectedValue === 'Prepaid'){
      return true;
    }
    return undefined;
  }

  setRestaurant(r) {
    this.restaurant = r;
  }

  getRateSchedules() {
    if (this.restaurant && this.restaurant.rateSchedules) {
      return this.restaurant.rateSchedules;
    }
    return [];
  }

  submit() {
    this.fax = this.fax;
    this.email = this.email;
    this.sms = this.sms;
    this.quickBook = this.quickBook;
    this.instruction = this.instruction;
    this.onDone.emit();
  }

  cancel() {
    this.onCancel.emit(this.onInvoiceOption);
  }

  delete() {
    // does this option being used?
    this.needConfirm = this.affectedInfo.length > 0;
    if (!this.needConfirm) {
      this.onDelete.emit(this.onInvoiceOption);
    }
  }

  confirmDelete() {
    this.onDelete.emit(this.onInvoiceOption);
  }

  cancelDelete() {
    this.needConfirm = false;
  }

}

