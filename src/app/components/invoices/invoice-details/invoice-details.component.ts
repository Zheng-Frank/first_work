import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Invoice } from '../../../classes/invoice';
import { ModalComponent } from "@qmenu/ui/bundles/qmenu-ui.umd";

import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";

declare var $: any;
declare var window: any;


@Component({
  selector: 'app-invoice-details',
  templateUrl: './invoice-details.component.html',
  styleUrls: ['./invoice-details.component.css']
})
export class InvoiceDetailsComponent implements OnInit, OnDestroy {
  invoice: Invoice;
  displayLogs = false;

  adjustmentDescription;
  adjustmentIsCredit = true;
  adjustmentAmount;

  @ViewChild('adjustmentModal') adjustmentModal: ModalComponent;

  constructor(private _route: ActivatedRoute, private _api: ApiService, private _global: GlobalService) {
    const self = this;
    this._route.params.subscribe(
      params => {
        this._api
          .get(environment.qmenuApiUrl + "generic", {
            resource: "invoice",
            query: {
              _id: {$oid: params['id']}
            },
            limit: 1
          }).subscribe(
            invoices => { this.invoice = new Invoice(invoices[0]); },
            e => this._global.publishAlert(
              AlertType.Danger,
              "Error pulling invoice from API"
            )
          );
      });
  }

  ngOnInit() {
    // UGLY solution to hide header and footer
    $('nav').hide();
    $('#footer').hide();
  }

  ngOnDestroy() {
    // UGLY solution to restore hider and footer
    $('nav').show();
    $('#footer').show();
  }

  toggleLogs() {
    this.displayLogs = !this.displayLogs;
  }

  downloadPdf() {
    window.print();
  }

  toggleInvoiceStatus(field) {
    if (field !== 'isCanceled' || confirm('Are you sure to cancel the invoice?')) {

      const oldInvoice = JSON.parse(JSON.stringify(this.invoice));
      const updatedInvoice = JSON.parse(JSON.stringify(this.invoice));
      updatedInvoice[field] = !updatedInvoice[field];

      updatedInvoice.logs = updatedInvoice.logs || [];
      updatedInvoice.logs.push({
        time: {$date: new Date()},
        action: field,
        user: this._global.user.username,
        value: !this.invoice[field]
      });

      this._api.patch(environment.qmenuApiUrl + "generic?resource=invoice", [{ old: oldInvoice, new: updatedInvoice }]).subscribe(
        result => {
          // let's update original, assuming everything successful
          this.invoice[field] = updatedInvoice[field];
          this.invoice.logs = updatedInvoice.logs;
          this._global.publishAlert(
            AlertType.Success,
            field + " was updated"
          );
        },
        error => {
          this._global.publishAlert(AlertType.Danger, "Error updating to DB");
        }
      );

    }
  }

  addAdjustment() {
    this.adjustmentModal.show();
  }

  okAdjustment() {

    const adjustment = {
      name: this.adjustmentDescription,
      amount: Math.abs(+this.adjustmentAmount) * (this.adjustmentIsCredit ? 1 : -1)
    };

    const oldInvoice = JSON.parse(JSON.stringify(this.invoice));
    let updatedInvoice = JSON.parse(JSON.stringify(this.invoice));
    updatedInvoice.adjustments = updatedInvoice.adjustments || [];
    updatedInvoice.adjustments.push(adjustment);

    // we need recalculate the values!
    let i = new Invoice(updatedInvoice);
    i.computeDerivedValues();
    // back to use POJS
    updatedInvoice = JSON.parse(JSON.stringify(i));

    updatedInvoice.logs = updatedInvoice.logs || [];
    updatedInvoice.logs.push({
      time: {$date: new Date()},
      action: "update",
      user: this._global.user.username,
      value: adjustment
    });

    this._api.patch(environment.qmenuApiUrl + "generic?resource=invoice", [{ old: oldInvoice, new: updatedInvoice }]).subscribe(
      result => {
        // let's update original, assuming everything successful
        Object.assign(this.invoice, i);
        this._global.publishAlert(
          AlertType.Success,
          adjustment.name + " was added"
        );
      },
      error => {
        this._global.publishAlert(AlertType.Danger, "Error updating to DB");
      }
    );

    this.adjustmentModal.hide();
  }

}
