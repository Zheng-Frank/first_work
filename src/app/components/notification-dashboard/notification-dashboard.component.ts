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
  system;

  templateDescriptions = {
    "order-confirmed": "The notification sent to a customer when their order is confirmed by the restaurant",
    "order-canceled": "The notification sent to a customer when their order is canceled by the restaurant",
    "delivery-estimate": "The notification sent to a customer when their order has an estimated delivery time"
  }

  @ViewChild('notificationModal') notificationModal: ModalComponent;
  @ViewChild('notificationEditor') notificationEditor: NotificationEditorComponent;

  constructor(private _api: ApiService, private _global: GlobalService, private _prunedPatch: PrunedPatchService) { }

  async ngOnInit() {
    this.populate();
  }

  async populate() {
    const system = (await this._api.get(environment.qmenuApiUrl + 'generic', { resource: 'system' }).toPromise())[0];
    this.system = system;
  }

  listMergeFields() { // re-write!
    return '{{customer.firstName}}, {{customer.lastName}}, {{order.orderNumber}}, {{order.timeEstimate}}, {{restaurant.name}}'
  }

  editNotification(s) {
    this.notificationModal.show();
    this.notificationModal.title = 'Edit Notification';
    // temporarily add a description to the object when we open it in the editor. This description will be deleted before saving to the db again. 
    this.notificationInEditor = JSON.parse(JSON.stringify(s));
    this.notificationInEditor.description = this.templateDescriptions[s.name];
  }

  onCancel() {
    this.notificationModal.hide();
  }

  onDone(template) {
    if (template.description) {
      delete template.description;
    }
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
    console.log(this.system.templates);
    console.log(newTemplates);
    if (Helper.areObjectsEqual(this.system.templates, newTemplates)) {
      this._global.publishAlert(
        AlertType.Info,
        "Not changed"
      );
    } else {
      await this._api.patch(environment.qmenuApiUrl + "generic?resource=system", [{
        old: {
          _id: this.system._id,
          templates: this.system.templates
        }, new: {
          _id: this.system._id,
          templates: newTemplates
        }
      }])
        .subscribe(
          result => {
            // let's update original, assuming everything successful
            this.system.templates = newTemplates;
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
