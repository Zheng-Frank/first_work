import { FormBuilderComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import { Output, Input, ViewChild, OnChanges } from '@angular/core';
import { FormEvent } from './../../../classes/form-event';
import { Component, OnInit, EventEmitter } from '@angular/core';
import { PaymentMeans } from '@qmenu/ui';

@Component({
  selector: 'app-payment-means-editor',
  templateUrl: './payment-means-editor.component.html',
  styleUrls: ['./payment-means-editor.component.css']
})
export class PaymentMeansEditorComponent implements OnInit{

  @ViewChild('paymentMeansFormBuilder') paymentMeansForm: FormBuilderComponent;
  @Output() cancel = new EventEmitter();
  @Output() remove = new EventEmitter<any>();
  @Output() submit = new EventEmitter<any>();

  @Input() paymentMeans = {} as PaymentMeans;
  @Input() showDelete = false;

  directionFieldItems = [
    {object: 'Send', text: 'Restaurant → qMenu', selected: false},
    {object: 'Receive', text: 'qMenu → Restaurant', selected: false}
  ]

  directionFieldDescriptors = {
    field: 'direction',
    label: 'Purpose direction of $ money flow',
    required: true,
    inputType: 'single-select',
    items: this.directionFieldItems
  }

  typeFieldItems = [
    // { object: "Check", text: "Check to qMenu", selected: false }, obsolete: use Stripe instead
    {object: 'Stripe', text: 'Pay Online', selected: false},
    {object: 'Check', text: 'Send Check to qMenu', selected: false },
    {object: 'Quickbooks Bank Withdraw', text: 'Quickbooks Bank Withdraw', selected: false},
    {object: 'Credit Card', text: 'Credit Card', selected: false},
    {object: 'Direct Deposit', text: 'Direct Deposit (receive)', selected: false},
    {object: 'Check Deposit', text: 'Check Deposit (receive)', selected: false}
  ]

  typeFieldDescriptors = {
    field: 'type',
    label: 'Type',
    required: true,
    inputType: 'single-select',
    items: this.typeFieldItems
  }

  paymentMeansFieldDescriptors = [];


  ngOnInit() {
  }

  formChanged(){
    this.paymentMeansFieldDescriptors.length = 0;
    this.paymentMeansFieldDescriptors.push(this.directionFieldDescriptors);
    console.log(JSON.stringify(this.paymentMeans));
    // control type according to what direction of money is flowing
    switch(this.paymentMeans.direction){
      case 'Send':
        this.typeFieldDescriptors.items = this.typeFieldItems.filter(item => item.object !== 'Direct Deposit' && item.object !== 'Check Deposit');
        this.paymentMeansFieldDescriptors.push(this.typeFieldDescriptors);
        break;
      case 'Receive':
        this.typeFieldDescriptors.items = this.typeFieldItems.filter(item => item.object === 'Direct Deposit' || item.object === 'Check Deposit');
        this.paymentMeansFieldDescriptors.push(this.typeFieldDescriptors);
        break;
      default:
        break;
    }

    // trigger changes to rebind things
    this.paymentMeansForm.ngOnChanges();
  }

  clickCancel() {
    this.cancel.emit();
  }

  clickRemove(event: FormEvent) {
    this.remove.emit({
      formEvent: event,
      paymentMeans: this.paymentMeans
    });
  }

  clickSubmit(event: FormEvent) {
    this.submit.emit({
      formEvent: event,
      paymentMeans: this.paymentMeans
    });

  }

}
