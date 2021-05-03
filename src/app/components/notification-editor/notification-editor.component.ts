import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-notification-editor',
  templateUrl: './notification-editor.component.html',
  styleUrls: ['./notification-editor.component.css']
})
export class NotificationEditorComponent implements OnInit {

  @Input() notification;

  @Output() onDone = new EventEmitter();
  @Output() onCancel = new EventEmitter();

  constructor() { }

  allMergeFields = [
    "_customerFirstName_",
    "_customerLastName_",
    "_restaurantName_",
    "_orderNumber_",
    "_orderTimeEstimate_",
    "_orderDetailsURL_",
    "_cancelComments_",
    "_adjustmentAmount_",
    "_refundTimeFrame_",
    "_loginCode_"
  ];

  allowableMergeFields = {
    "New Order Placed": ["_customerFirstName_", "_customerLastName_", "_restaurantName_", "_orderNumber_", "_orderTimeEstimate_", "_orderDetailsURL_"],
    "Confirmed": ["_customerFirstName_", "_customerLastName_", "_restaurantName_", "_orderNumber_", "_orderTimeEstimate_", "_orderDetailsURL_"],
    "In Progress": ["_customerFirstName_", "_customerLastName_", "_restaurantName_", "_orderNumber_", "_orderTimeEstimate_", "_orderDetailsURL_"],
    "Ready": ["_customerFirstName_", "_customerLastName_", "_restaurantName_", "_orderNumber_", "_orderTimeEstimate_", "_orderDetailsURL_"],
    "Delivering": ["_customerFirstName_", "_customerLastName_", "_restaurantName_", "_orderNumber_", "_orderTimeEstimate_", "_orderDetailsURL_"],
    "Delivered": ["_customerFirstName_", "_customerLastName_", "_restaurantName_", "_orderNumber_", "_orderTimeEstimate_", "_orderDetailsURL_"],
    "Completed": ["_customerFirstName_", "_customerLastName_", "_restaurantName_", "_orderNumber_", "_orderTimeEstimate_", "_orderDetailsURL_"],
    "Canceled - refund": ["_cancelComments_", "_customerFirstName_", "_customerLastName_", "_restaurantName_", "_orderNumber_", "_orderDetailsURL_", "_adjustmentAmount_", "_refundTimeFrame_"],
    "Canceled - no charge": ["_cancelComments_", "_customerFirstName_", "_customerLastName_", "_restaurantName_", "_orderNumber_", "_orderDetailsURL_", "_refundTimeFrame_"],
    "New Order Received": ["_customerFirstName_", "_customerLastName_", "_restaurantName_", "_orderNumber_"],
    "Delivery Complete": ["_customerFirstName_", "_customerLastName_", "_restaurantName_", "_orderNumber_"],
    "Customer Canceled": ["_customerFirstName_", "_customerLastName_", "_restaurantName_", "_orderNumber_", "_orderDetailsURL_"],
    "Adjust Order - refund": ["_adjustmentAmount_", "_refundTimeFrame_", "_customerFirstName_", "_customerLastName_", "_restaurantName_", "_orderNumber_", "_orderDetailsURL_"],
    "Adjust Order - charge": ["_adjustmentAmount_", "_customerFirstName_", "_customerLastName_", "_restaurantName_", "_orderNumber_", "_orderDetailsURL_"],
    "Change to pickup - refund": ["_adjustmentAmount_", "_refundTimeFrame_", "_customerFirstName_", "_customerLastName_", "_restaurantName_", "_orderNumber_", "_orderDetailsURL_"],
    "Change to pickup - charge": ["_adjustmentAmount_", "_customerFirstName_", "_customerLastName_", "_restaurantName_", "_orderNumber_", "_orderDetailsURL_"],
    "Order delivery status": ["_orderNumber_", "_customerFirstName_", "_customerLastName_", "_restaurantName_", "_orderDetailsURL_"],
    "Sesame Success": [],
    "Sesame Failure": [],
    "qMenu Login Code": ["_loginCode_"]
  }

  ngOnInit() {
  }

  verifyMergeFields() {
    // verifyMergeFields is somewhat naive, in that it doesn't work properly if the input string has an odd number of underscore characters
    const delineaterIndices = [];
    const mergeVariablesInThisTemplate = [];
    const illegalFields = [];

    for (let i = 0; i < this.notification.content.length; i += 1) {
      if (this.notification.content[i] === '_') {
        delineaterIndices.push(i);
      }
    }

    for (let j = 0; j < delineaterIndices.length; j += 2) {
      mergeVariablesInThisTemplate.push(this.notification.content.slice(delineaterIndices[j], delineaterIndices[j + 1] + 1))
    }

    mergeVariablesInThisTemplate.forEach(mv => {
      if (!this.allowableMergeFields[this.notification.name].includes(mv)) {
        illegalFields.push(mv);
      }
    });
    if (illegalFields.length) {
      return illegalFields.join(', ');
    }
    return "";
  }

  saveNotification() {
    this.onDone.emit(this.notification);
  }

  cancelEditing() {
    this.onCancel.emit(this.notification);
  }

}
