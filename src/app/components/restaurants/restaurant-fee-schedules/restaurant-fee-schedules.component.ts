import { Component, OnInit, Input, ViewChild, SimpleChanges, OnChanges } from '@angular/core';
import { Restaurant, FeeSchedule, ChargeBasis } from '@qmenu/ui';
import { ApiService } from "../../../services/api.service";
import { GlobalService } from "../../../services/global.service";
import { PrunedPatchService } from "../../../services/prunedPatch.service";
import { OrderType } from 'src/app/classes/order-type';
import { ModalComponent, FormBuilderComponent } from "@qmenu/ui/bundles/qmenu-ui.umd";
import { FormSubmit } from '@qmenu/ui/classes';
import { TimezoneHelper } from 'src/app/classes/timezone-helper';
import { OrderPaymentMethod } from 'src/app/classes/order-payment-method';
import { CurrencyPipe } from '@angular/common';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-restaurant-fee-schedules',
  templateUrl: './restaurant-fee-schedules.component.html',
  styleUrls: ['./restaurant-fee-schedules.component.css'],
  providers: [CurrencyPipe]
})
export class RestaurantFeeSchedulesComponent implements OnInit, OnChanges {
  @ViewChild('modalFeeSchedule') modalFeeSchedule: ModalComponent;
  @ViewChild('editingForm') editingForm: FormBuilderComponent;
  @Input() restaurant: Restaurant;
  @Input() users = [];

  now = new Date(); // to tell if a fee schedule is expired
  feeSchedules: FeeSchedule[] = [];

  feeScheduleInEditing: any = {};
  fieldDescriptors = [];

  showExpired = false;

  // for displaying
  chargeBasisMap = {
    [ChargeBasis.Monthly]: 'monthly',
    [ChargeBasis.OrderSubtotal]: 'order subtotal',
    [ChargeBasis.OrderPreTotal]: 'order pre-total',
    [ChargeBasis.OrderTotal]: 'order total',
    [ChargeBasis.Commission]: 'commission',
  };


  nameDescriptor = {
    field: "name", //
    label: "Name",
    required: true,
    inputType: "text",
    items: [
      { object: "Email", text: "Email", selected: false },
      { object: "Phone", text: "Phone", selected: false },
      { object: "SMS", text: "SMS", selected: false },
      { object: "Fax", text: "Fax", selected: false }
    ]
  };

  payerDescriptor = {
    field: "payer", //
    label: "Payer (出钱方)",
    required: true,
    inputType: "single-select",
    items: [
      { object: "CUSTOMER", text: "customer", selected: false },
      { object: "RESTAURANT", text: "restaurant", selected: false },
      { object: "QMENU", text: "qmenu", selected: false },
    ]
  };

  payeeCustomer = { object: "CUSTOMER", text: "customer", selected: false };
  payeeRestaurant = { object: "RESTAURANT", text: "restaurant", selected: false };
  payeeQmenu = { object: "QMENU", text: "qmenu", selected: false };
  payeeSales = { object: 'NONE', text: 'NONE', seleted: false };


  payeeDescriptor = {
    field: "payee", //
    label: "Payee (收钱方)",
    required: true,
    inputType: "single-select",
    items: [this.payeeCustomer, this.payeeRestaurant, this.payeeQmenu, this.payeeSales]
  };

  fromTimeDescriptor = {
    field: "fromTime", //
    label: "Start Date (起始日期)",
    required: true,
    inputType: "date"
  };

  toTimeDescriptor = {
    field: "toTime", //
    label: "End Date (截止日期，optional)",
    required: false,
    inputType: "date"
  };

  chargeBasisSubtotal = { object: ChargeBasis.OrderSubtotal, text: "order subtotal", selected: false };
  chargeBasisPreTotal = { object: ChargeBasis.OrderPreTotal, text: "order total before CC", selected: false };
  chargeBasisTotal = { object: ChargeBasis.OrderTotal, text: "order total", selected: false };
  chargeBasisMonthly = { object: ChargeBasis.Monthly, text: "monthly fee", selected: false };
  chargeBasisCommission = { object: ChargeBasis.Commission, text: "commission", selected: false };

  chargeBasisDescriptor = {
    field: "chargeBasis", //
    label: "Charge Basis (收费基准)",
    required: true,
    inputType: "single-select",
    items: []
  };

  rateDescriptor = {
    field: "rate", //
    label: "Rate (率)",
    required: false,
    inputType: "number"
  };

  amountDescriptor = {
    field: "amount", //
    label: "Fixed Amount (固定费用)",
    required: false,
    inputType: "number"
  };

  orderTypesDescriptor = {
    field: "orderTypes", //
    label: "Limitation of Order Types (限定订单种类)",
    required: false,
    inputType: "multi-select",
    items: [
      { object: OrderType.Pickup, text: "pickup", selected: false },
      { object: OrderType.Delivery, text: "delivery", selected: false },
      { object: OrderType.DineIn, text: "dine-in", selected: false },
    ]
  };

  orderPaymentMethodsDescriptor = {
    field: "orderPaymentMethods", //
    label: "Limitation of Payment Methods (限定付款方式, CC = 信用卡)",
    required: false,
    inputType: "multi-select",
    items: [
      { object: OrderPaymentMethod.Cash, text: "Cash", selected: false },
      { object: OrderPaymentMethod.InPerson, text: "CC: swipe in-person", selected: false },
      { object: OrderPaymentMethod.KeyIn, text: "CC: key-in", selected: false },
      { object: OrderPaymentMethod.Qmenu, text: "CC: qMenu collect", selected: false },
      { object: OrderPaymentMethod.Stripe, text: "CC: restaurant using stripe", selected: false },
    ]
  };


  constructor(private _currencyPipe: CurrencyPipe, private _api: ApiService, private _global: GlobalService, private _prunedPatch: PrunedPatchService) {
  }

  async ngOnChanges(changes: SimpleChanges) {
    this.feeSchedules = [];
    if (this.restaurant) {
      this.feeSchedules = (this.restaurant['feeSchedules'] || []).map(fs => new FeeSchedule(fs));
    }
  }

  ngOnInit() { }

  updateFormBuilder() {

    this.fieldDescriptors.length = 0; // clear existing first

    // rule #1: always show name and payer
    this.fieldDescriptors.push(
      this.nameDescriptor,
      this.payerDescriptor,
    );

    if (!this.feeScheduleInEditing.payer) {
      return;
    }

    // rule #2: if there is a payer, always show payee, from time, to time, and charge basis 
    this.fieldDescriptors.push(
      this.payeeDescriptor,
      this.fromTimeDescriptor,
      this.toTimeDescriptor,
      this.chargeBasisDescriptor,
    );

    switch (this.feeScheduleInEditing.payer) {
      case 'CUSTOMER':
        // this.feeScheduleInEditing.chargeBasis = ChargeBasis.OrderSubtotal;
        // only possible payees:
        this.payeeDescriptor.items = [this.payeeRestaurant, this.payeeQmenu];
        // only possible charge basis:
        this.chargeBasisDescriptor.items = [this.chargeBasisSubtotal, this.chargeBasisPreTotal];
        break;
      case 'RESTAURANT':
        this.feeScheduleInEditing.payee = this.payeeQmenu.object;
        this.payeeDescriptor.items = [this.payeeQmenu];
        this.chargeBasisDescriptor.items = [this.chargeBasisSubtotal, this.chargeBasisTotal, this.chargeBasisMonthly];
        break;
      case 'QMENU':
        this.feeScheduleInEditing.payee = this.payeeSales.object;
        this.feeScheduleInEditing.chargeBasis = ChargeBasis.Commission;
        this.payeeDescriptor.items = [this.payeeSales];
        this.chargeBasisDescriptor.items = [this.chargeBasisCommission];
        break;
      default:
        break;
    }

    // make amount and percent labels displays better
    this.rateDescriptor.label = `Rate (${(100 * (this.feeScheduleInEditing.rate || 0)).toFixed(1)}%)`;
    this.amountDescriptor.label = `Fixed Amount (${this._currencyPipe.transform(this.feeScheduleInEditing.amount || 0, 'USD')})`;

    // conditionally add more descriptors
    switch (this.feeScheduleInEditing.chargeBasis) {
      case ChargeBasis.OrderSubtotal:
      case ChargeBasis.OrderPreTotal:
      case ChargeBasis.OrderTotal:
        this.fieldDescriptors.push(
          this.rateDescriptor,
          this.amountDescriptor,
          this.orderTypesDescriptor,
          this.orderPaymentMethodsDescriptor
        );
        break;
      case ChargeBasis.Monthly:
        this.fieldDescriptors.push(
          this.amountDescriptor,
        );
        break;
      case ChargeBasis.Commission:
        this.fieldDescriptors.push(
          this.rateDescriptor,
          this.orderTypesDescriptor,
        );
        break;
      default:
        break;
    }
    // trigger changes to rebind things
    this.editingForm.ngOnChanges();
  }

  formChanged(event) {
    // things changed, let's update the form builder
    this.updateFormBuilder();
  }

  edit(feeSchedule?: FeeSchedule) {
    // first, let's make sure payeeSales is there!
    const [salesAgent] = ((this.restaurant || {} as any).rateSchedules || []).map(rs => rs.agent);
    this.payeeSales.object = salesAgent || 'NONE';
    this.payeeSales.text = salesAgent || 'NONE';

    this.feeScheduleInEditing = new FeeSchedule(feeSchedule);

    // the following will condition the editor
    // when in editing, we need "2020-08-19" type of format, usibng fr-CA to do so
    if (this.feeScheduleInEditing.fromTime) {
      this.feeScheduleInEditing.fromTime = this.feeScheduleInEditing.fromTime.toLocaleString('fr-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: this.restaurant.googleAddress.timezone || 'America/New_York' });
    }
    if (this.feeScheduleInEditing.toTime) {
      this.feeScheduleInEditing.toTime = this.feeScheduleInEditing.toTime.toLocaleString('fr-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: this.restaurant.googleAddress.timezone || 'America/New_York' });
    }

    this.updateFormBuilder();

    // end condition
    this.modalFeeSchedule.show();

  }

  async submit(event) {
    this.modalFeeSchedule.hide();

    const myFs = new FeeSchedule(this.feeScheduleInEditing);
    // making sure data type are correct! sometimes after binding values become strings
    myFs.amount = +myFs.amount || 0;
    myFs.rate = +myFs.rate || 0;

    // turn 2020-09-01 to timezone form
    const getTransformedDate = (dateString) => {
      const [year, month, date] = dateString.split('-');
      return TimezoneHelper.transformToTimezoneDate(new Date(`${month}/${date}/${year}`), this.restaurant.googleAddress.timezone);
    }
    if (this.feeScheduleInEditing.fromTime) {
      myFs.fromTime = getTransformedDate(this.feeScheduleInEditing.fromTime);
    }
    if (this.feeScheduleInEditing.toTime) {
      myFs.toTime = getTransformedDate(this.feeScheduleInEditing.toTime);
    }

    // collect payment methods or payment types
    myFs.orderPaymentMethods = this.orderPaymentMethodsDescriptor.items.filter(op => op.selected).map(op => op.object);
    myFs.orderTypes = this.orderTypesDescriptor.items.filter(ot => ot.selected).map(ot => ot.object);
    switch (myFs.chargeBasis) {
      case ChargeBasis.OrderSubtotal:
        break;
      case ChargeBasis.Monthly:
        delete myFs.orderPaymentMethods;
        delete myFs.orderTypes;
        delete myFs.rate;
        break;
      case ChargeBasis.Commission:
        delete myFs.amount;
        delete myFs.orderPaymentMethods;
        break;
      default:
        break;
    }

    const index = this.feeSchedules.findIndex(fs => fs.id === myFs.id);
    let newFeeSchedules;
    if (index >= 0) {
      newFeeSchedules = [...this.feeSchedules.slice(0, index), myFs, ...this.feeSchedules.slice(index + 1)];
    }
    else {
      myFs.id = new Date().valueOf().toString(); // we use timestamp as id
      newFeeSchedules = [... this.feeSchedules, myFs];
    }
    await this.saveNewFeeSchedulesToDbAndAcknowledge(newFeeSchedules, event.acknowledge);
  }

  cancel(event) {
    this.modalFeeSchedule.hide();
  }

  async remove(event: FormSubmit) {
    const newFeeSchedules = this.feeSchedules.filter(fs => fs.id !== this.feeScheduleInEditing.id);
    await this.saveNewFeeSchedulesToDbAndAcknowledge(newFeeSchedules, event.acknowledge);
  }

  async saveNewFeeSchedulesToDbAndAcknowledge(newFeeSchedules, acknowledge) {
    try {
      await this._prunedPatch.patch(environment.qmenuApiUrl + "generic?resource=restaurant", [
        {
          old: { _id: this.restaurant._id, feeSchedules: [...this.feeSchedules] },
          new: { _id: this.restaurant._id, feeSchedules: newFeeSchedules },
        }]);
      this.feeSchedules = newFeeSchedules;
      this.restaurant['feeSchedules'] = newFeeSchedules;
      acknowledge(null);
      this.modalFeeSchedule.hide();
    }
    catch (error) {
      acknowledge(JSON.stringify(error));
    }
  }

  feeSchedulePaymentMethodsLimitationString(feeSchedule: FeeSchedule) {
    return feeSchedule.orderPaymentMethods.every(pm => ['IN_PERSON', 'KEY_IN', 'STRIPE', 'QMENU',].indexOf(pm) >= 0) ? 'credit card orders' : feeSchedule.orderPaymentMethods.join(', ');
  }

  isFeeScheduleExpired(feeSchedule) {
    return feeSchedule.toTime && this.now > feeSchedule.toTime;
  }

  getExpiredFeeSchedules() {
    return this.feeSchedules.filter(fs => this.isFeeScheduleExpired(fs));
  }
}
