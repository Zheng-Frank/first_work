import { AlertType } from 'src/app/classes/alert-type';
import { ApiService } from './../../../../services/api.service';
import { GlobalService } from 'src/app/services/global.service';
import { OrderPaymentMethod } from './../../../../classes/order-payment-method';
import { TimezoneHelper, OrderType } from '@qmenu/ui';
import { EventEmitter, ViewChild, AfterViewInit } from '@angular/core';
import { Component, OnInit, Input, Output } from '@angular/core';
import { Restaurant, ChargeBasis } from '@qmenu/ui';
import { RestaurantFeeSchedulesComponent } from '../../restaurant-fee-schedules/restaurant-fee-schedules.component';
import { environment } from 'src/environments/environment';

enum commissionStandardTypes {
  Zero_Nine_Nine = '$0.99',
  Four_Percentage = '4% order subtotal (recommended)'
}

enum whoPayTypes {
  Customer = 'Have the customer pay (recommended)',
  RT = 'I will pay'
}

enum PayerTypes {
  Customer = 'CUSTOMER',
  RT = "RESTAURANT",
}

enum PayeeTypes {
  Custoemr = 'CUSTOMER',
  RT = "RESTAURANT",
  Qmenu = 'QMENU',
  NONE = 'NONE'
}

enum feeScheduleNameTypes {
  Service_Fee = 'service fee',
  Credit_card_Fee = 'credit card fee',
  Monthly_Fee = 'monthly fee',
  Commission = 'commission'
}

@Component({
  selector: 'app-restaurant-setup-commissions',
  templateUrl: './restaurant-setup-commissions.component.html',
  styleUrls: ['./restaurant-setup-commissions.component.css']
})
export class RestaurantSetupCommissionsComponent implements OnInit, AfterViewInit {

  @ViewChild('feeSchedulesComponent') feeSchedulesComponent: RestaurantFeeSchedulesComponent;
  @Input()
  restaurant: Restaurant;
  snapRestaurant: Restaurant;// json object copy of origin restaurant
  @Output()
  done = new EventEmitter();
  commissionStandardOpts = [commissionStandardTypes.Zero_Nine_Nine, commissionStandardTypes.Four_Percentage];
  commissionStandardOpt = commissionStandardTypes.Four_Percentage;
  whoPayOpts = [whoPayTypes.Customer, whoPayTypes.RT];
  whoPayOpt = whoPayTypes.Customer;
  now = new Date();
  knownUsers = [];
  newfeeSchedules = [];
  originfeeSchedules = [];
  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
    this.init();
  }

  init() {
    this.snapRestaurant = JSON.parse(JSON.stringify(this.restaurant));
    this._global.getCachedUserList().then(users => this.knownUsers = users).catch(console.error);
    this.setSnapRTFeeSchedules();
  }
  // init data before rendering fee schedules component 
  ngAfterViewInit(){
    this.setSnapRTFeeSchedules();
  }

  chooseCommissionStandardsOpt(opt) {
    this.commissionStandardOpt = opt;
    this.setSnapRTFeeSchedules();
  }

  chooseWhoPayOpt(opt) {
    this.whoPayOpt = opt;
    this.setSnapRTFeeSchedules();
  }
  // turn 2020-09-01 to timezone form
  getTransformedDate(dateString, googleAddress) {
    // const [year, month, date] = dateString.split('-');
    return TimezoneHelper.parse(dateString, googleAddress.timezone || "America/New_York");
  }

  setSnapRTFeeSchedules() {
    if (this.feeSchedulesComponent) {
      
      this.originfeeSchedules = [];
      this.originfeeSchedules = this.restaurant.feeSchedules;
      if (this.canSave()) {
        // set the feeSchedules of rt only if two question has been selected
        let feeSchedule1, feeSchedule2, feeSchedule3, feeSchedule4;
        let { serviceSettings = [], courier, googleAddress = {} as any } = this.snapRestaurant;
        // predefined 4 type schedule (see trello card714)
        // case 1: No matter what, fee configuration "c" (or "e") will be pre-populated 
        feeSchedule1 = {
          id: "",
          payer: PayerTypes.Customer, // recommended
          payee: PayeeTypes.Qmenu,
          name: feeScheduleNameTypes.Service_Fee,
          chargeBasis: ChargeBasis.OrderSubtotal,
          fromTime: this.getTransformedDate(new Date().toISOString().split("T")[0], googleAddress),
          orderTypes: [OrderType.Pickup, OrderType.DineIn],
          orderPaymentMethods: [],
          rate: 0, // recommended
          amount: 0
        };
        if (this.commissionStandardOpt === commissionStandardTypes.Zero_Nine_Nine) {
          feeSchedule1.amount = 0.99;
          feeSchedule1.rate = 0;
        } else {
          feeSchedule1.amount = 0;
          feeSchedule1.rate = 0.04;
        }
        if (this.whoPayOpt === whoPayTypes.RT) {
          feeSchedule1.payer = PayerTypes.RT;
        } else {
          feeSchedule1.payer = PayerTypes.Customer;
        }
        // case 2: If the restaurant chose to have qMenu collect credit card payment for ANY order type, we'll have configuration "a"
        if (serviceSettings.some(serviceSetting => (serviceSetting.paymentMethods || []).includes(OrderPaymentMethod.Qmenu))) {
          feeSchedule2 = {
            id: "",
            payer: PayerTypes.Customer, // recommended
            payee: PayeeTypes.Qmenu,
            name: feeScheduleNameTypes.Credit_card_Fee,
            chargeBasis: ChargeBasis.OrderPreTotal,
            fromTime: this.getTransformedDate(new Date().toISOString().split("T")[0], googleAddress),
            orderTypes: [],
            orderPaymentMethods: [OrderPaymentMethod.Qmenu],
            rate: 0.029, // recommended
            amount: 0.3
          };
          if (this.whoPayOpt === whoPayTypes.RT) {
            feeSchedule2.payer = PayerTypes.RT;
          } else {
            feeSchedule2.payer = PayerTypes.Customer;
          }
        }
        // case 3: If the restaurant has delivery but handles it themselves, we'll have configuration "d" (or "f")
        if (!courier && serviceSettings.some(serviceSetting => serviceSetting && serviceSetting.name === 'Delivery' && serviceSetting.paymentMethods && serviceSetting.paymentMethods.length > 0)) {
          feeSchedule3 = {
            id: "",
            payer: PayerTypes.Customer, // recommended
            payee: PayeeTypes.Qmenu,
            name: feeScheduleNameTypes.Service_Fee,
            chargeBasis: ChargeBasis.OrderSubtotal,
            fromTime: this.getTransformedDate(new Date().toISOString().split("T")[0], googleAddress),
            orderTypes: [OrderType.Delivery],
            orderPaymentMethods: [],
            rate: 0, // recommended
            amount: 0
          };
          if (this.commissionStandardOpt === commissionStandardTypes.Zero_Nine_Nine) {
            feeSchedule3.amount = 0.99;
            feeSchedule3.rate = 0;
          } else {
            feeSchedule3.amount = 0;
            feeSchedule3.rate = 0.04;
          }
          if (this.whoPayOpt === whoPayTypes.RT) {
            feeSchedule3.payer = PayerTypes.RT;
          } else {
            feeSchedule3.payer = PayerTypes.Customer;
          }
        } else if (courier && courier.name === 'Postmates') {
          // case 4: If the restaurant has delivery and chose to have qMenu handle it for them, we will have configuration "b"
          feeSchedule4 = {
            id: "",
            payer: PayerTypes.Customer, // recommended
            payee: PayeeTypes.Qmenu,
            name: feeScheduleNameTypes.Service_Fee,
            chargeBasis: ChargeBasis.OrderSubtotal,
            fromTime: this.getTransformedDate(new Date().toISOString().split("T")[0], googleAddress),
            orderTypes: [OrderType.Delivery],
            orderPaymentMethods: [],
            rate: 0, // recommended
            amount: 1.98
          };
          if (this.whoPayOpt === whoPayTypes.RT) {
            feeSchedule4.payer = PayerTypes.RT;
          } else {
            feeSchedule4.payer = PayerTypes.Customer;
          }
        }
        this.newfeeSchedules = [feeSchedule1, feeSchedule2, feeSchedule3, feeSchedule4].filter(feeSchedule => !!feeSchedule);
        // make id of fee schedule unique
        this.newfeeSchedules.forEach(feeSchedule => {
          feeSchedule.id = (new Date().valueOf() + (Math.random() + 1) * 100000).toFixed(2).toString();
        });
      }
      this.snapRestaurant.feeSchedules = [...this.newfeeSchedules, ...this.originfeeSchedules];
      this.feeSchedulesComponent.ngOnChanges();
    }
  }

  handleUpdateSetupSchedules(newFeeSchedules) {
    // sub component has change so parent component should also be changed.
    // step1: update newfeeSchedules
    for (let i = 0; i < this.newfeeSchedules.length; i++) {
      let feeSchedule = this.newfeeSchedules[i];
      let fs = (newFeeSchedules || []).find(fs => fs.id === feeSchedule.id);
      this.newfeeSchedules[i] = fs ? fs : undefined;
    }
    this.newfeeSchedules = this.newfeeSchedules.filter(schedule => !!schedule);
    // step2: update originSchedules
    for (let i = 0; i < this.originfeeSchedules.length; i++) {
      let feeSchedule = this.originfeeSchedules[i];
      let fs = (newFeeSchedules || []).find(fs => fs.id === feeSchedule.id);
      this.originfeeSchedules[i] = fs? fs: undefined;
    }
    this.originfeeSchedules = this.originfeeSchedules.filter(schedule => !!schedule);
  }

  canSave() {
    return this.commissionStandardOpt && this.whoPayOpt;
  }

  async convertToFeeSchedules() {
    try {
      const results = await this._api.post(environment.appApiUrl + "lambdas/data", {
        name: "migrate-fee-schedules",
        payload: {
          restaurantIds: [this.restaurant._id],
        }
      }).toPromise();
      const [rtFeeSchedules] = results;
      console.log("converted", rtFeeSchedules);
      this.snapRestaurant.feeSchedules = this.restaurant.feeSchedules = rtFeeSchedules.feeSchedules;
    } catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, "Failed!");
    }
  }

  save() {
    let existingFeeSchedules = this.originfeeSchedules;
    let qmenuTOMarketerSchedules = existingFeeSchedules.filter(feeSchedule => feeSchedule.payer === 'CUSTOMER' && (this.knownUsers.some(user => user.username === feeSchedule.payee) || feeSchedule.payee === 'NONE'));
    let otherFeeSchedules = existingFeeSchedules.filter(feeSchedule => !(feeSchedule.payer === 'CUSTOMER' && (this.knownUsers.some(user => user.username === feeSchedule.payee) || feeSchedule.payee === 'NONE')));
    // set previous fee schedules configurations expiry
    otherFeeSchedules.forEach(feeSchedule => {
      let offset = 24 * 3600 * 1000;
      feeSchedule.toTime = new Date(this.now.valueOf() - offset);
    });
    let feeSchedules = [...qmenuTOMarketerSchedules, ...otherFeeSchedules, ...this.newfeeSchedules];
    console.log("saved:" + JSON.stringify(feeSchedules));
    // this.done.emit({feeSchedules: feeSchedules});
  }

}
