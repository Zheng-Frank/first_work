import { Component, OnInit, ViewChild, Input, SimpleChanges, OnChanges } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Restaurant, Order } from '@qmenu/ui';
import { Invoice } from '../../../classes/invoice';
import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import { zip } from "rxjs";
import { mergeMap } from "rxjs/operators";
import { ApiService } from '../../../services/api.service';
import { GlobalService } from '../../../services/global.service';
import { environment } from "../../../../environments/environment";
import { AlertType } from '../../../classes/alert-type';

@Component({
  selector: 'app-restaurant-orders',
  templateUrl: './restaurant-orders.component.html',
  styleUrls: ['./restaurant-orders.component.css']
})

export class RestaurantOrdersComponent implements OnInit {
  @ViewChild('paymentModal') paymentModal: ModalComponent;
  @ViewChild('rejectModal') rejectModal: ModalComponent;
  @ViewChild('banModal') banModal: ModalComponent;
  @ViewChild('adjustModal') adjustModal: ModalComponent;

  @Input() restaurant: Restaurant;
  searchText;
  maxCount = 8;
  orders: any;
  showSummary = false;
  payment = {};
  orderForModal: Order = null;

  constructor(private _api: ApiService, private _global: GlobalService) {
   

  }

  async ngOnInit() {
    console.log(this.restaurant);
    this.orders=await this._api.get('http://localhost:1337/'  + 'order/getOrdersByRestaurantId/' + this.restaurant['_id'], {limit: 200}).toPromise();
    console.log(this.orders);

  }


}
