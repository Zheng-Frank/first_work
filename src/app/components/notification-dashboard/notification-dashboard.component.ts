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
  testMessageTemplate;
  system;
  smsNumber;

  customerTemplateDetails = {
    "SUBMITTED": {
      description: "The notification sent to a customer when they place an order.",
      sentTo: "customer"
    },
    "CONFIRMED": {
      description: "The notification sent to a customer when the restaurant confirms their order.",
      sentTo: "customer"
    },
    "WIP": {
      description: "The notification sent to a customer when their order is being prepared.",
      sentTo: "customer"
    },
    "READY": {
      description: "The notification sent to a customer when their food has been prepared.",
      sentTo: "customer"
    },
    "DELIVERING": {
      description: "The notification sent to a customer when their delivery driver is on the way with their food.",
      sentTo: "customer"
    },
    "DELIVERED": {
      description: "The notification sent to a customer when the delivery driver arrives",
      sentTo: "customer"
    },
    "COMPLETED": {
      description: "The notification sent to a customer when the restaurant marks their order as complete.",
      sentTo: "customer"
    },
    "CANCELED": {
      description: "The notification sent to a customer when the restaurant cancels their order.",
      sentTo: "customer"
    }
  }

  restaurantTemplateDetails = {
    "SUBMITTED": {
      description: "The notification sent to a restaurant when a customer submits an order.",
      sentTo: "restaurant"
    },
    "DELIVERED": {
      description: "The notification sent to a restaurant when the courier marks delivery complete",
      sentTo: "restaurant"
    },
    "CANCELED": {
      description: "The notification sent to a restaurant when a customer cancels an order.",
      sentTo: "restaurant"
    }

  }


  @ViewChild('notificationModal') notificationModal: ModalComponent;
  @ViewChild('phoneNumberModal') phoneNumberModal: ModalComponent;
  @ViewChild('notificationEditor') notificationEditor: NotificationEditorComponent;

  constructor(private _api: ApiService, private _global: GlobalService, private _prunedPatch: PrunedPatchService) { }

  ngOnInit() {
    this.populate();
  }

  async populate() {
    const system = (await this._api.get(environment.qmenuApiUrl + 'generic', { resource: 'system' }).toPromise())[0];
    this.system = system;
  }

  editNotification(s, target) {
    this.notificationModal.show();
    this.notificationModal.title = 'Edit Notification';
    // temporarily add a description to the object when we open it in the editor. This description will be deleted before saving to the db again. 
    this.notificationInEditor = JSON.parse(JSON.stringify(s));
    this.notificationInEditor.description = this[target][s.name].description;
    this.notificationInEditor.sentTo = this[target][s.name].sentTo;
  }

  onCancel() {
    this.notificationModal.hide();
  }

  onDone(template) {
    delete template.description;
    const target = template.sentTo + 'Templates';
    delete template.sentTo;
    const newTemplates = (this.system[target] || []).slice(0);
    newTemplates.forEach((n, i) => {
      if (n.name === template.name) {
        newTemplates[i] = template;
      }
    });

    this.patchDiff(newTemplates, target);
    this.notificationModal.hide();
  }

  async patchDiff(newTemplates, target) {
    if (Helper.areObjectsEqual(this.system[target], newTemplates)) {
      this._global.publishAlert(
        AlertType.Info,
        "Not changed"
      );
    } else {
      const patchObj = {
        _id: this.system._id
      };
      patchObj[target] = newTemplates;
      await this._prunedPatch.patch(environment.qmenuApiUrl + "generic?resource=system", [{
        old: {
          _id: this.system._id,
        }, new: patchObj
      }])
        .subscribe(
          result => {
            this.system[target] = newTemplates;
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

  openPhoneNumberInput(template) {
    this.phoneNumberModal.title = 'Input Phone Number';
    this.phoneNumberModal.show();
    this.testMessageTemplate = template;
  }

  async sendMessage() {
    await this._api.post(environment.qmenuApiUrl + 'events/add-jobs', [{
      "name": "send-sms",
      "params": {
        "to": this.smsNumber.toString(),
        "from": "8447935942",
        "providerName": "plivo",
        "message": this.replaceMergeFields(this.testMessageTemplate.content)
      }
    }]).toPromise();

    this.closePhoneNumberInput();
  }

  closePhoneNumberInput() {
    this.testMessageTemplate = null;
    this.smsNumber = null;
    this.phoneNumberModal.hide();
  }

  replaceMergeFields(template) {
    const sampleOrderData = {
      "_id": "6077191f7538ea00082db85a",
      "sendNotificationOnReady": true,
      "type": "PICKUP",
      "runtime": {
        "standalone": false,
        "isApp": false,
        "os": "Mac",
        "browser": "Chrome",
        "fullVersion": "89.0.4389.114",
        "majorVersion": 89,
        "pwaPrompt": null,
        "appVersion": "2.15.22",
        "deviceId": null,
        "deviceToken": null
      },
      "customerObj": {
        "_id": "604fa1f24da01300083826af",
        "email": "lbouchan@example.com",
        "firstName": "Leon",
        "lastName": "Bouchan",
        "phone": "6787013768"
      },
      "restaurantObj": {
        "_id": "60353b24d3580b5554087e4f",
        "alias": "red-panda-cafe",
        "name": "Red Panda Cafe",
        "logo": "https://chopst.s3.amazonaws.com/menuImage/1476242819068.png"
      },
      "orderNumber": 1412,
      "statuses": [
        {
          "status": "SUBMITTED",
          "updatedBy": "BY_CUSTOMER",
          "createdAt": "2021-04-14T16:32:31.661Z"
        }
      ],
      "timeToDeliverEstimate": "2021-04-14T16:52:31.661Z",
      "timeToDeliver": null
    };
    let mergedMessage = template;
    mergedMessage = mergedMessage.replace(/_customerFirstName_/g, sampleOrderData.customerObj.firstName);
    mergedMessage = mergedMessage.replace(/_customerLastName_/g, sampleOrderData.customerObj.lastName);
    mergedMessage = mergedMessage.replace(/_orderNumber_/g, sampleOrderData.orderNumber);
    mergedMessage = mergedMessage.replace(/_restaurantName_/g, sampleOrderData.restaurantObj.name);
    mergedMessage = mergedMessage.replace(/_orderDetailsURL_/g, 'https://qa-customer.herokuapp.com/index.html#/order/' + sampleOrderData._id);
    mergedMessage = mergedMessage.replace(/_newLine_/g, '\n');

    const orderReadyEST = `Order ready est: ${new Date(sampleOrderData.timeToDeliverEstimate).toLocaleTimeString('en-US', {
      timeZone: "America/New_York", hour: '2-digit', minute: '2-digit'
    })}`;

    mergedMessage = mergedMessage.replace(/_orderTimeEstimate_/g, orderReadyEST);

    // if mergedMessage.length > 160 
    return mergedMessage;

  }
}
