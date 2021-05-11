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
  customer = [];
  restaurant = [];
  misc = [];


  templateDetails = {
    "New Order Placed": {
      description: "Notification sent to customer their order has been placed.",
      category: "customer"
    },
    "Confirmed": {
      description: "Notification sent to customer when the RT has confirmed their order.",
      category: "customer"
    },
    "In Progress": {
      description: "Notification sent to customer when their order is being prepared.",
      category: "customer"
    },
    "Ready": {
      description: "Notification sent to customer when their pickup order is ready.",
      category: "customer"
    },
    "Delivering": {
      description: "Notification sent to customer when their delivery is on the way.",
      category: "customer"
    },
    "Delivered": {
      description: "Notification sent to customer when their delivery has been marked complete.",
      category: "customer"
    },
    "Completed": {
      description: "Notification sent to customer when their order has been marked complete.",
      category: "customer"
    },
    "Canceled - refund": {
      description: "Notification sent to customer when their order was canceled and they are due a refund.",
      category: "customer"
    },
    "Canceled - no charge": {
      description: "Notification sent to customer when their order was canceled and their card was not charged",
      category: "customer"
    },
    "New Order Received": {
      description: "Notification sent to RT owner when a new order is received.",
      category: "restaurant"
    },
    "Delivery Complete": {
      description: "Notification sent to RT owner when 3rd-party courier completes their delivery.",
      category: "restaurant"
    },
    "Customer Canceled": {
      description: "Notification sent to RT owner when customer cancels an order.",
      category: "restaurant"
    },
    "Adjust Order - refund": {
      description: "Notification sent to customer when an adjustment to their order results in money being refunded.",
      category: "misc"
    },
    "Adjust Order - charge": {
      description: "Notification sent to customer when an adjustment to their order results in additional charges to the customer.",
      category: "misc"
    },
    "Change to pickup - charge": {
      description: "Notification sent to customer when changing to a pickup order results in additional charges to the customer.",
      category: "misc"
    },
    "Change to pickup - refund": {
      description: "Notification sent to customer when changing to a pickup order results in money being refunded.",
      category: "misc"
    },
    "Order delivery status": {
      description: "An update telling a customer the current status of their delivery order.",
      category: "misc"
    },
    "Sesame Success": {
      description: "Message sent when RT owner succesfully verifies using Sesame.",
      category: "misc"
    },
    "Sesame Failure": {
      description: "Message sent when RT owner enters invalid Sesame code.",
      category: "misc"
    },
    "qMenu Login Code": {
      description: "The message containing a 3-digit code sent to users so they can login to qMenu.",
      category: "misc"
    }, 
    "CC Auth Failure": {
      description: "The warning message sent to a customer when their credit card fails to authorize on checkout",
      category: "misc"
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
    this.categorizeTemplates();
  }

  categorizeTemplates() {
    this.restaurant = [];
    this.customer = [];
    this.misc = [];
    this.system.templates.forEach(t => {
      const target = this.templateDetails[t.name].category;
      this[target].push(t);
    });
  }

  editNotification(s) {
    this.notificationModal.show();
    this.notificationModal.title = 'Edit Notification';
    // temporarily add a description to the object when we open it in the editor. This description will be deleted before saving to the db again. 
    this.notificationInEditor = JSON.parse(JSON.stringify(s));
    this.notificationInEditor.description = this.templateDetails[s.name].description;
    this.notificationInEditor.category = this.templateDetails[s.name].category;
  }

  onCancel() {
    this.notificationModal.hide();
  }

  onDone(template) {
    delete template.description;
    delete template.category;
    const newTemplates = (this.system.templates || []).slice(0);
    newTemplates.forEach((n, i) => {
      if (n.name === template.name) {
        newTemplates[i] = template;
      }
    });

    this.patchDiff(newTemplates);
    this.notificationModal.hide();
  }

  async patchDiff(newTemplates) {
    if (Helper.areObjectsEqual(this.system.templates, newTemplates)) {
      this._global.publishAlert(
        AlertType.Info,
        "Not changed"
      );
    } else {
      await this._prunedPatch.patch(environment.qmenuApiUrl + "generic?resource=system", [{
        old: {
          _id: this.system._id,
        },
        new: {
          _id: this.system._id,
          templates: newTemplates
        }
      }])
        .subscribe(
          result => {
            this.system.templates = newTemplates;
            this.categorizeTemplates();
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
    mergedMessage = mergedMessage.replace(/_orderDetailsURL_/g, "https://qmenu.biz/sc6l8");

    const orderReadyEST = `${new Date(sampleOrderData.timeToDeliverEstimate).toLocaleTimeString('en-US', {
      timeZone: "America/New_York", hour: '2-digit', minute: '2-digit'
    })}`;

    const paymentObj = {
      method: 'STRIPE',

    };
    const loginCode = 123;
    const cancelComments = 'Sample cancel comment.';
    const adjustmentAmount = 19.44;

    mergedMessage = mergedMessage.replace(/_orderTimeEstimate_/g, orderReadyEST);
    mergedMessage = mergedMessage.replace(/_adjustmentAmount_/g, adjustmentAmount);

    if (paymentObj.method === 'QMENU' || paymentObj.method === 'STRIPE') {
      if (paymentObj.method === 'QMENU') {
        mergedMessage = mergedMessage.replace(/_refundTimeFrame_/g, "3 - 10 business days");
      } else {
        mergedMessage = mergedMessage.replace(/_refundTimeFrame_/g, "5-10 business days according to Stripe Inc\'s refund policy. We use Stripe Inc. for secure and PCI compliant credit card processing. See more details at https://stripe.com/docs/refunds");
      }
    }
    if (paymentObj.method === 'KEY_IN' || paymentObj.method === 'CASH') {
      mergedMessage.replace(/_refundTimeFrame_/g, "5 - 10 business days")
    }
    mergedMessage = mergedMessage.replace(/_loginCode_/g, loginCode);
    mergedMessage = mergedMessage.replace(/_cancelComments_/g, cancelComments);

    return mergedMessage;
  }
}


