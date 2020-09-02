import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { PrunedPatchService } from "../../../services/prunedPatch.service";
import { AlertType } from "../../../classes/alert-type";
import { FeeSchedule } from 'src/app/classes/fee-schedule';
import { OrderType } from 'src/app/classes/order-type';
import { ChargeBasis } from 'src/app/classes/charge-basis';
import { ModalComponent } from "@qmenu/ui/bundles/qmenu-ui.umd";
import { FormSubmit } from '@qmenu/ui/classes';

@Component({
  selector: 'app-restaurant-fee-schedules',
  templateUrl: './restaurant-fee-schedules.component.html',
  styleUrls: ['./restaurant-fee-schedules.component.css']
})
export class RestaurantFeeSchedulesComponent implements OnInit {
  @ViewChild('modalFeeSchedule') modalFeeSchedule: ModalComponent;

  @Input() restaurant: Restaurant;
  @Input() users = [];

  feeSchedules: FeeSchedule[] = [];

  now = new Date();

  chargeBasisMap = {
    [ChargeBasis.Monthly]: 'monthly',
    [ChargeBasis.OrderSubtotal]: 'order subtotal',
    [ChargeBasis.CollectedInvoiceCommission]: 'commission',
  };

  constructor(private _api: ApiService, private _global: GlobalService, private _prunedPatch: PrunedPatchService) { }

  ngOnInit() {

    const ccFee = new FeeSchedule({
      chargeBasis: ChargeBasis.OrderSubtotal,
      payer: 'CUSTOMER',
      payee: 'RESTAURANT',
      fromTime: '2020-01-01',
      name: 'CC fee',
      amount: 0.99,
      rate: 0.03,
      orderPaymentMethods: ['KEY_IN', 'QMENU', 'IN_PERSON', 'STRIPE'],
      createdAt: 1,
    });

    const bookingFee = new FeeSchedule({
      chargeBasis: ChargeBasis.OrderSubtotal,
      payer: 'CUSTOMER',
      payee: 'QMENU',
      fromTime: '2020-01-01',
      toTime: '2020-08-01',
      name: 'booking fee',
      amount: 0.99,
      createdAt: 2,
    });

    const normalRate = new FeeSchedule({
      chargeBasis: ChargeBasis.OrderSubtotal,
      payer: 'RESTAURANT',
      payee: 'QMENU',
      fromTime: '2020-01-01',
      toTime: '2022-01-01',
      amount: 0.99,
      createdAt: 3,
    });

    const deliveryRate = new FeeSchedule({
      chargeBasis: ChargeBasis.OrderSubtotal,
      payer: 'RESTAURANT',
      payee: 'QMENU',
      fromTime: '2020-08-01',
      amount: 1.00,
      orderTypes: [OrderType.Delivery],
      createdAt: 4,
    });

    const monthlyFee = new FeeSchedule({
      chargeBasis: ChargeBasis.Monthly,
      payer: 'RESTAURANT',
      payee: 'QMENU',
      fromTime: '2020-08-01',
      monthlyAmount: 199.00,
      createdAt: 5,
    });

    const salesCommission = new FeeSchedule({
      chargeBasis: ChargeBasis.CollectedInvoiceCommission,
      payer: 'QMENU',
      payee: 'sam',
      fromTime: '2020-01-01',
      rate: 0.15,
      orderTypes: [OrderType.Pickup, OrderType.DineIn],
      createdAt: 6,
    });

    this.feeSchedules.push(ccFee, bookingFee, normalRate, deliveryRate, monthlyFee, salesCommission);
  }

  feeScheduleInEditing: any = {};

  fieldDescriptors = [
    {
      field: "name", //
      label: "Name (optional)",
      required: false,
      inputType: "text",
      items: [
        { object: "Email", text: "Email", selected: false },
        { object: "Phone", text: "Phone", selected: false },
        { object: "SMS", text: "SMS", selected: false },
        { object: "Fax", text: "Fax", selected: false }
      ]
    },
    {
      field: "payer", //
      label: "Payer (付款方)",
      required: true,
      inputType: "single-select",
      items: [
        { object: "CUSTOMER", text: "customer", selected: false },
        { object: "RESTAURANT", text: "restaurant", selected: false },
        { object: "QMENU", text: "qmenu", selected: false },
      ]
    },
    {
      field: "payee", //
      label: "Payee (收款方)",
      required: true,
      inputType: "single-select",
      items: [
        { object: "CUSTOMER", text: "customer", selected: false },
        { object: "RESTAURANT", text: "restaurant", selected: false },
        { object: "QMENU", text: "qmenu", selected: false },
      ]
    },
    {
      field: "fromTime", //
      label: "Start Date",
      required: true,
      inputType: "date"
    },
    {
      field: "toTime", //
      label: "End Date (optional)",
      required: false,
      inputType: "date"
    },
    {
      field: "chargeBasis", //
      label: "Charge Basis",
      required: true,
      inputType: "single-select",
      items: [
        { object: ChargeBasis.OrderSubtotal, text: "order subtotal", selected: false },
        { object: ChargeBasis.Monthly, text: "monthly fee", selected: false },
        { object: ChargeBasis.CollectedInvoiceCommission, text: "commission", selected: false },
      ]
    },
  ];

  edit(feeSchedule?) {
    this.feeScheduleInEditing = new FeeSchedule(feeSchedule);
    // when in editing, we need "2020-08-19" type of format, usibng fr-CA to do so
    if (this.feeScheduleInEditing.fromTime) {
      this.feeScheduleInEditing.fromTime = this.feeScheduleInEditing.fromTime.toLocaleString('fr-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: this.restaurant.googleAddress.timezone || 'America/New_York' });
    }
    if (this.feeScheduleInEditing.toTime) {
      this.feeScheduleInEditing.toTime = this.feeScheduleInEditing.toTime.toLocaleString('fr-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: this.restaurant.googleAddress.timezone || 'America/New_York' });
    }
    this.modalFeeSchedule.show();
  }

  submit(event) {
    event.acknowledge(null);
    console.log(event)
  }

  cancel(event) {
    this.modalFeeSchedule.hide();
  }

  remove(event: FormSubmit) {
    console.log(event)
    event.acknowledge(null);
  }

}
