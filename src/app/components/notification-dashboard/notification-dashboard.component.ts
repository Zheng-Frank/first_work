import { Component, OnInit, ViewChild } from '@angular/core';
import { ModalComponent } from "@qmenu/ui/bundles/qmenu-ui.umd";
import { ApiService } from '../../services/api.service';
import { GlobalService } from "../../services/global.service";
import { AlertType } from "../../classes/alert-type";

import { PrunedPatchService } from "../../services/prunedPatch.service";
import { environment } from "../../../environments/environment";
import { NotificationEditorComponent } from '../notification-editor/notification-editor.component';
import { Helper } from '../../classes/helper';

@Component({
  selector: 'app-notification-dashboard',
  templateUrl: './notification-dashboard.component.html',
  styleUrls: ['./notification-dashboard.component.css']
})
export class NotificationDashboardComponent implements OnInit {
  notificationInEditor;
  provider;
  methods = ['SMS', 'Email', 'Fax'];
  notifications = [
    {
      id: '12345',
      sentTo: 'Customer',
      title: "Order Confirmed",
      messageText: "{{customer.firstName}}, your order {{order.orderNumber}} from {{restaurant.name}} has been confirmed and will be ready around {{order.timeEstimate}}.",
      description: "Message sent to customer when order confirmed by restaurant",
      type: "SMS"
    },
    // {
    //   title: "Order Canceled",
    //   text: "{{customer.firstName}}, your order {{order.orderNumber}} from {{restaurant.name}} has been canceled. If your card was already charged, you will be issued a refund in 3 to 5 days.",
    //   description: "Message sent to customer when order canceled by restaurant",
    //   method: "SMS"
    // }
  ];

  @ViewChild('notificationModal') notificationModal: ModalComponent;
  @ViewChild('notificationEditor') notificationEditor: NotificationEditorComponent;

  constructor(private _api: ApiService, private _global: GlobalService, private _prunedPatch: PrunedPatchService) { }

  ngOnInit() {
  }

  selectProvider() {
    console.log(this.provider);
  }

  listMergeFields() {
    return '{{customer.firstName}}, {{customer.lastName}}, {{order.orderNumber}}, {{order.timeEstimate}}, {{restaurant.name}}'
  }

  replaceMergeFields(string) {

  }

  editNotification(n) {
    this.notificationModal.show();
    this.notificationModal.title = 'Edit Notification';
   /*
   good reason to make Notifications a class - we could use the new keyword here to make a copy of our notification to open
   in the editor, instead of this parse/stringify workaround
   */
    this.notificationInEditor = JSON.parse(JSON.stringify(n)); 
  }

  onCancel() {
    this.notificationModal.hide();
  }

  onDone(notification) {
    console.log(notification);
    const newNotifications = (this.notifications || []).slice(0);
    if (notification.id) {
      newNotifications.forEach((n, i) => {
        if (n.id === notification.id) {
          newNotifications[i] = notification;
        }
      });
    } else {
      // handle new notification in here
    }
    this.patchDiff(newNotifications);
    this.notificationModal.hide();
  }

  // onDone(promotion) {
  //   // shadow clone
  //   const newPromotions = (this.restaurant.promotions || []).slice(0);
  //   if (promotion.id) {
  //     // find the replace the promotion
  //     for (let i = 0; i < newPromotions.length; i++) {
  //       if (newPromotions[i].id === promotion.id) {
  //         newPromotions[i] = promotion;
  //       }
  //     }
  //   } else {
  //     promotion.id = new Date().valueOf().toString();
  //     if (typeof promotion.expiry === 'string') {
  //       promotion.expiry = new Date(promotion.expiry);
  //       // this is UTC, we need to make it local browser (whoever operating this! Assuming same timezone as restaurant owner)
  //       promotion.expiry.setMinutes(promotion.expiry.getMinutes() + new Date().getTimezoneOffset());
  //     }
  //     newPromotions.push(promotion);
  //   }
  //   this.patchDiff(newPromotions);
  //   this.promotionModal.hide();
  // }

  patchDiff(newNotifications) {
    if (Helper.areObjectsEqual(this.notifications, newNotifications)) {
      this._global.publishAlert(
        AlertType.Info,
        "Not changed"
      );
    } else {
      // api update here...
      // this._prunedPatch
      //   .patch(environment.qmenuApiUrl + "generic?resource=system", [{
      //     // old: {
      //     //   _id: this.restaurant['_id'],
      //     //   promotions: this.restaurant.promotions
      //     // }, new: {
      //     //   _id: this.restaurant['_id'],
      //     //   promotions: newPromotions
      //     // }
      //   }])
      //   .subscribe(
      //     result => {
            // let's update original, assuming everything successful
            this.notifications = newNotifications;
            this._global.publishAlert(
              AlertType.Success,
              "Updated successfully"
            );
          // },
          // error => {
          //   this._global.publishAlert(AlertType.Danger, "Error updating to DB");
          // }
        // );
    }
    console.log(newNotifications);
  }

  sendMessage() {
    console.log('you are going to send a message');
  }
}
