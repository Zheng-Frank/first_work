import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-notification-dashboard',
  templateUrl: './notification-dashboard.component.html',
  styleUrls: ['./notification-dashboard.component.css']
})
export class NotificationDashboardComponent implements OnInit {

  provider;
  notifications = [
    {
      title: "Order Confirmed",
      text: "{{customer.firstName}}, your order {{order.orderNumber}} has been confirmed and will be ready around {{order.timeEstimate}}.",
      description: "Message sent to customer when order confirmed by restaurant",
      method: "SMS"
    },
    {
      title: "Order Canceled",
      text: "{{customer.firstName}}, your order {{order.orderNumber}} has been canceled. If your card has already been charged, you will be issued a refund in 3 to 5 days.",
      description: "Message sent to customer when order canceled by restaurant",
      method: "SMS"
    }
  ];

  constructor(private _api: ApiService) { }

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

  editCard() {
    console.log('you are going to edit a card');
  }

  sendMessage() {
    console.log('you are going to send a message');
  }
}
