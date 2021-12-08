import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { Restaurant, Promotion } from '@qmenu/ui';
import { ApiService } from "../../../services/api.service";
import { PrunedPatchService } from "../../../services/prunedPatch.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";
import { ModalComponent } from "@qmenu/ui/bundles/qmenu-ui.umd";
import { PromotionEditorComponent } from '../promotion-editor/promotion-editor.component';
import { Helper } from '../../../classes/helper';

@Component({
  selector: 'app-restaurant-promotions',
  templateUrl: './restaurant-promotions.component.html',
  styleUrls: ['./restaurant-promotions.component.css']
})
export class RestaurantPromotionsComponent implements OnInit {

  @Input() restaurant: Restaurant;

  @ViewChild('promotionModal') promotionModal: ModalComponent;
  @ViewChild('promotionEditor') promotionEditor: PromotionEditorComponent;

  editing: boolean = false;

  promotionsInEditing = [];

  promotionInEditing;

  constructor(private _api: ApiService, private _global: GlobalService, private _prunedPatch: PrunedPatchService) { }

  ngOnInit() {
  }

  toggleEditing() {
    this.editing = !this.editing;
    this.promotionsInEditing = (this.restaurant.promotions || []).map(promo => new Promotion(promo));
    // put empty settings to make it 4 (hardcoded max)
    const tempDate = new Date();
    tempDate.setMonth(tempDate.getMonth() + 1);
    for (let i = this.promotionsInEditing.length; i < 5; i++) {
      this.promotionsInEditing.push({
        expiry: tempDate
      });
    }
  }

  editNew() {
    this.promotionModal.show();
    this.promotionModal.title = 'New Promotion';
    this.promotionInEditing = new Promotion();
  }

  edit(promotion) {
    this.promotionModal.show();
    this.promotionModal.title = 'Edit Promotion';
    this.promotionInEditing = new Promotion(promotion);
  }

  onCancel(promotion) {
    this.promotionModal.hide();
  }

  onDelete(promotion) {
    const newPromotions = (this.restaurant.promotions || []).filter(p => p.id !== promotion.id);
    this.patchDiff(this.restaurant.promotions, newPromotions);
    this.promotionModal.hide();
  }

  onDone(promotion) {
    // shadow clone
    const newPromotions = (this.restaurant.promotions || []).slice(0);
    if (promotion.id) {
      // find the replace the promotion
      for (let i = 0; i < newPromotions.length; i++) {
        if (newPromotions[i].id === promotion.id) {
          newPromotions[i] = promotion;
        }
      }
    } else {
      promotion.id = new Date().valueOf().toString();
      newPromotions.push(promotion);
    }
    this.patchDiff(this.restaurant.promotions, newPromotions);
    this.promotionModal.hide();
  }

  patchDiff(oldPromotions, newPromotions) {
    if (Helper.areObjectsEqual(this.restaurant.promotions, newPromotions)) {
      this._global.publishAlert(
        AlertType.Info,
        "Not changed"
      );
    } else {
      // api update here...
      this._prunedPatch
        .patch(environment.qmenuApiUrl + "generic?resource=restaurant", [{
          old: {
            _id: this.restaurant['_id'],
            promotions: oldPromotions
          }, new: {
            _id: this.restaurant['_id'],
            promotions: newPromotions
          }
        }])
        .subscribe(
          result => {
            // let's update original, assuming everything successful
            this.restaurant.promotions = newPromotions;
            this._global.publishAlert(
              AlertType.Success,
              "Updated successfully"
            );
          },
          error => {
            this._global.publishAlert(AlertType.Danger, "Error updating to DB");
          }
        );
    }
  }

}

