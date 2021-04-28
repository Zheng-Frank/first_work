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

  constructor() {}

  allowableMergeFields = {
    "New Order Placed": ["_newLine_", "_customerFirstName_", "_customerLastName_", "_restaurantName_", "_orderNumber_", "_orderTimeEstimate_", "_orderDetailsURL_"],
    "Confirmed": ["_newLine_", "_customerFirstName_", "_customerLastName_", "_restaurantName_", "_orderNumber_", "_orderTimeEstimate_", "_orderDetailsURL_"],
    "In Progress": ["_newLine_", "_customerFirstName_", "_customerLastName_", "_restaurantName_", "_orderNumber_", "_orderTimeEstimate_", "_orderDetailsURL_"],
    "Ready": ["_newLine_", "_customerFirstName_", "_customerLastName_", "_restaurantName_", "_orderNumber_", "_orderTimeEstimate_", "_orderDetailsURL_"],
    "Delivering": ["_newLine_", "_customerFirstName_", "_customerLastName_", "_restaurantName_", "_orderNumber_", "_orderTimeEstimate_", "_orderDetailsURL_"],
    "Delivered": ["_newLine_", "_customerFirstName_", "_customerLastName_", "_restaurantName_", "_orderNumber_", "_orderTimeEstimate_", "_orderDetailsURL_"],
    "Completed": ["_newLine_", "_customerFirstName_", "_customerLastName_", "_restaurantName_", "_orderNumber_", "_orderTimeEstimate_", "_orderDetailsURL_"],
    "Restaurant Canceled - refund": ["_newLine_", "_cancelComments_", "_customerFirstName_", "_customerLastName_", "_restaurantName_", "_orderNumber_", "_orderDetailsURL_", "_adjustmentAmount_"],
    "Restaurant Canceled - no charge": ["_newLine_", "_cancelComments_", "_customerFirstName_", "_customerLastName_", "_restaurantName_", "_orderNumber_", "_orderDetailsURL_"],
    "New Order Received": ["_newLine_"],
    "Delivery Complete": ["_newLine_"],
    "Customer Canceled": ["_newLine_", "_customerFirstName_", "_customerLastName_", "_restaurantName_", "_orderNumber_", "_orderDetailsURL_"],
    "Adjust Order - refund": ["_newLine_", "_adjustmentAmount_", "_refundTimeFrame_", "_customerFirstName_", "_customerLastName_", "_restaurantName_", "_orderNumber_", "_orderDetailsURL_"],
    "Adjust Order - charge": ["_newLine_", "_adjustmentAmount_", "_customerFirstName_", "_customerLastName_", "_restaurantName_", "_orderNumber_", "_orderDetailsURL_"],
    "Change to pickup - refund": ["_newLine_", "_refundTimeFrame_"],
    "Change to pickup - charge": ["_newLine_"],
    "Order delivery status": ["_newLine_"],
    "Sesame Success": ["_newLine_"],
    "Sesame Failure": ["_newLine_"],
    "qMenu Login Code": ["_newLine_", "_loginCode_"]
  }

  ngOnInit() {
  }

  saveNotification() {
    this.onDone.emit(this.notification);
  }

  cancelEditing() {
    this.onCancel.emit(this.notification);
  }

}
