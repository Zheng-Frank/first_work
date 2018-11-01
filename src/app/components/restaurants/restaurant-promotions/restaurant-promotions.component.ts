import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { Restaurant, Promotion } from '@qmenu/ui';
import { ApiService } from "../../../services/api.service";
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

  constructor(private _api: ApiService, private _global: GlobalService) { }

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
  update() {
    let promotions = this.promotionsInEditing.filter(p => p.name && p.code);

    // let's make sure all data are clean
    promotions = promotions.map(p => {
      p.amount = Math.abs(p.amount || 0);
      p.orderMinimum = Math.abs(p.orderMinimum || 0);
      if (typeof p.expiry === 'string') {
        p.expiry = new Date(p.expiry);
        // this is UTC, we need to make it local browser (whoever operating this! Assuming same timezone as restaurant owner)
        p.expiry.setMinutes(p.expiry.getMinutes() + new Date().getTimezoneOffset());
      }
      return p;
    });
    this.editing = false;
    this.promotionsInEditing = [];
    this.patchDiff(promotions);
  }

  editNew() {
    this.promotionModal.show();
    this.promotionModal.title = 'New Promotion';
    this.promotionEditor.promotion = new Promotion();
  }

  edit(promotion) {
    this.promotionModal.show();
    this.promotionModal.title = 'Edit Promotion';
    this.promotionEditor.promotion = new Promotion(promotion);
  }

  onCancel(promotion) {
    this.promotionModal.hide();
  }

  onDelete(promotion) {
    const newPromotions = (this.restaurant.promotions || []).filter(p => p.id !== promotion.id);
    this.patchDiff(newPromotions);
    this.promotionModal.hide();
  }

  onDone(promotion) {
    // shadow clone
    const newPromotions = (this.restaurant.promotions || []).slice(0);
    if (promotion.id) {
      // find the replace the promotion
      for(let i = 0; i < newPromotions.length; i++) {
        if(newPromotions[i].id === promotion.id) {
          newPromotions[i] = promotion;
        }
      }
    } else {
      promotion.id = new Date().valueOf().toString();
      newPromotions.push(promotion);
    }
    this.patchDiff(newPromotions);
    this.promotionModal.hide();
  }

  patchDiff(newPromotions) {
    if (Helper.areObjectsEqual(this.restaurant.promotions, newPromotions)) {
      this._global.publishAlert(
        AlertType.Info,
        "Not changed"
      );
    } else {
      // api update here...
      this._api
        .patch(environment.qmenuApiUrl + "generic?resource=restaurant", [{
          old: {
            _id: this.restaurant['_id'],
            promotions: this.restaurant.promotions
          }, new: {
            _id: this.restaurant['_id'],
            promotions: newPromotions
          }
        }])
        .subscribe(
          result => {
            // let's update original, assuming everything successful
            this.restaurant.promotions = newPromotions.map(each=> {each.expiry= new Date(each.expiry)});
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

