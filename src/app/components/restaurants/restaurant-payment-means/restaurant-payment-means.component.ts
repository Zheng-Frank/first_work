import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { Restaurant, PaymentMeans } from '@qmenu/ui';
import { ApiService } from "../../../services/api.service";
import { PrunedPatchService } from "../../../services/prunedPatch.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";
import { ModalComponent } from "@qmenu/ui/bundles/qmenu-ui.umd";
import { Helper } from '../../../classes/helper';

@Component({
  selector: 'app-restaurant-payment-means',
  templateUrl: './restaurant-payment-means.component.html',
  styleUrls: ['./restaurant-payment-means.component.css']
})
export class RestaurantPaymentMeansComponent implements OnInit {

  @Input() restaurant: Restaurant;
  @ViewChild('paymentMeansModal') paymentMeansModal: ModalComponent;
  paymentMeansInEditing = new PaymentMeans();
  originalPaymentMeansInEditing;


  constructor(private _api: ApiService, private _global: GlobalService, private _prunedPatch: PrunedPatchService) { }

  ngOnInit() {
  }

  editNew() {
    this.paymentMeansModal.show();
    this.paymentMeansModal.title = 'New Payment Means';
    this.paymentMeansInEditing = new PaymentMeans();
    this.originalPaymentMeansInEditing = undefined;
  }

  onCancel() {
    this.paymentMeansModal.hide();
  }

  edit(paymentMeans) {
    this.paymentMeansModal.show();
    this.paymentMeansModal.title = 'Edit Payment Means';
    this.originalPaymentMeansInEditing = paymentMeans;
    this.paymentMeansInEditing = JSON.parse(JSON.stringify(paymentMeans));
  }

  
  onDelete(event) {
    const newPaymentMeans = (this.restaurant.paymentMeans || []).filter(pm => pm !== this.originalPaymentMeansInEditing);
    this.patch(newPaymentMeans, event.formEvent.acknowledge);
  }
  
  
  onSubmit(event) {
    // let's get a shadow copy
    const newPaymentMeans = (this.restaurant.paymentMeans || []).slice(0);
    let index = (this.restaurant.paymentMeans || []).indexOf(this.originalPaymentMeansInEditing || {});
    if(index >= 0) {
      newPaymentMeans[index] = this.paymentMeansInEditing;
    } else {
      newPaymentMeans.push(this.paymentMeansInEditing);
    }
    this.patch(newPaymentMeans, event.formEvent.acknowledge);
  }

  patch(newPaymentMeans, acknowledge) {
    if (Helper.areObjectsEqual(this.restaurant.paymentMeans, newPaymentMeans)) {
      this._global.publishAlert(
        AlertType.Info,
        "Not changed"
      );
      acknowledge(null);
      this.paymentMeansModal.hide();
    } else {
      // api update here...
      this._prunedPatch
        .patch(environment.qmenuApiUrl + "generic?resource=restaurant", [{
          old: {
            _id: this.restaurant['_id'],
            paymentMeans: this.restaurant.paymentMeans
          }, new: {
            _id: this.restaurant['_id'],
            paymentMeans: newPaymentMeans
          }
        }])
        .subscribe(
          result => {
            // let's update original, assuming everything successful
            this.restaurant.paymentMeans = newPaymentMeans;
            this._global.publishAlert(
              AlertType.Success,
              "Updated successfully"
            );
            acknowledge(null);
            this.paymentMeansModal.hide();
          },
          error => {
            this._global.publishAlert(AlertType.Danger, "Error updating to DB");
            acknowledge('Error updating to DB');
          }
        );
    }
  }

}

