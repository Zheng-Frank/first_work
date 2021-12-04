import { filter } from 'rxjs/operators';
import { Input, Output, EventEmitter } from '@angular/core';
import { GlobalService } from 'src/app/services/global.service';
import { Component, OnInit } from '@angular/core';

enum paymentDeliveryPartyTypes {
  Qmenu = 'qMenu to collect payment',
  Restaurant = 'Restaurant to collect payment',
}

enum deliveryPaymentMethodTypes {
  Swipe = 'Swipe: Customer pays cash or swipes at register in person (delivery driver will need a POS device to collect payment)',
  Key_In = 'Key-In：Qmenu will send CC info to you for key-in',
  Stripe = 'Stripe: Deposit payment into my restaurant’s Stripe account',
}

enum deliveryCashOptTypes {
  Yes = 'Yes',
  No = 'No'
}

enum paymentPickupPartyTypes {
  Qmenu = 'qMenu to collect payment',
  Restaurant = 'Restaurant to collect payment',
  Wonnot = "I won't accept credit card payment"
}

enum pickupPaymentMethodTypes {
  Swipe = 'Swipe: Customer pays cash or swipes at register in person',
  Key_In = 'Key-In：Qmenu will send CC info to you for key-in',
  Stripe = 'Stripe: Deposit payment into my restaurant’s Stripe account',
}

enum pickupCashOptTypes {
  Yes = 'Yes',
  No = 'No'
}

@Component({
  selector: 'app-restaurant-setup-payment',
  templateUrl: './restaurant-setup-payment.component.html',
  styleUrls: ['./restaurant-setup-payment.component.css']
})
export class RestaurantSetupPaymentComponent implements OnInit {


  @Input()
  restaurant;
  @Output()
  done = new EventEmitter();
  // payment for pickup orders
  paymentPickupPartys = [paymentPickupPartyTypes.Qmenu, paymentPickupPartyTypes.Restaurant, paymentPickupPartyTypes.Wonnot];
  paymentPickupParty = '';
  // paymentDescriptionMap = {
  //   'CASH': 'Cash',
  //   'IN_PERSON': 'Credit card: swipe in-person',
  //   'QMENU': 'Credit card: let qMenu collect on behalf of restaurant',
  //   'KEY_IN': 'Credit card: send numbers to restaurant for key-in',
  //   'STRIPE': 'Credit card: deposit to restaurant\'s account directly (configure below)'
  // };
  pickupPaymentMethods = [{
    value: 'IN_PERSON',
    text: pickupPaymentMethodTypes.Swipe
  }, {
    value: 'KEY_IN',
    text: pickupPaymentMethodTypes.Key_In
  }, {
    value: 'STRIPE',
    text: pickupPaymentMethodTypes.Stripe
  }];
  pickupPaymentMethod = '';
  pickupCashOpts = [pickupCashOptTypes.Yes, pickupCashOptTypes.No];
  pickupCashOpt = '';
  // payment for delivery orders
  paymentDeliveryPartys = [paymentDeliveryPartyTypes.Qmenu, paymentDeliveryPartyTypes.Restaurant];
  paymentDeliveryParty = '';
  deliveryPaymentMethods = [{
    value: 'IN_PERSON',
    text: deliveryPaymentMethodTypes.Swipe
  }, {
    value: 'KEY_IN',
    text: deliveryPaymentMethodTypes.Key_In
  }, {
    value: 'STRIPE',
    text: deliveryPaymentMethodTypes.Stripe
  }];
  deliveryPaymentMethod = '';
  deliveryCashOpts = [deliveryCashOptTypes.Yes, deliveryCashOptTypes.No];
  deliveryCashOpt = '';
  // save needed
  deliverySaveText = 'Delivery';
  pickupSaveText = 'Pickup';
  qmenuSaveText = 'QMENU';
  stripeSaveText = 'STRIPE';
  cashSaveText = 'CASH';
  constructor(private _global: GlobalService) { }

  ngOnInit() {
    this.init();
  }

  init() {
    if(this.restaurant.serviceSettings && this.restaurant.serviceSettings.length > 0){
      this.restaurant.serviceSettings.forEach(service => {
        // pickup 
        if (service.name === this.pickupSaveText && this.isServiceEnabled(service)) {
          if(service.paymentMethods.some(method => method === this.cashSaveText)){
            this.pickupCashOpt = pickupCashOptTypes.Yes;
          }else{
            this.pickupCashOpt = pickupCashOptTypes.No;
          }
          let otherMethods = service.paymentMethods.filter(method=>method !== this.cashSaveText);
          otherMethods.forEach(method => {
            if (method === this.qmenuSaveText) {
              this.paymentPickupParty = paymentPickupPartyTypes.Qmenu;
            } else if (this.pickupPaymentMethods.some(pickupPaymentMethod => pickupPaymentMethod.value === method)) {
              this.paymentPickupParty = paymentPickupPartyTypes.Restaurant;
              this.pickupPaymentMethod = this.pickupPaymentMethods.find(pickupPaymentMethod => pickupPaymentMethod.value === method).value;
            } else {
              this.paymentPickupParty = paymentPickupPartyTypes.Wonnot;
            }
          });
        }
        
        // delivery
        if (service.name === this.deliverySaveText && this.isServiceEnabled(service)) {
          if(service.paymentMethods.some(method => method === this.cashSaveText)){
            this.deliveryCashOpt = deliveryCashOptTypes.Yes;
          }else{
            this.deliveryCashOpt = deliveryCashOptTypes.No;
          }
          let otherMethods = service.paymentMethods.filter(method=>method !== this.cashSaveText);
          otherMethods.forEach(method => {
            if (method === this.qmenuSaveText) {
              this.paymentDeliveryParty = paymentDeliveryPartyTypes.Qmenu;
            } else if (this.deliveryPaymentMethods.some(deliveryPaymentMethod => deliveryPaymentMethod.value === method)) {
              this.paymentDeliveryParty = paymentDeliveryPartyTypes.Restaurant;
              this.deliveryPaymentMethod = this.deliveryPaymentMethods.find(deliveryPaymentMethod => deliveryPaymentMethod.value === method).value;
            }
          });
        }
      });
    }
    if (this.restaurant.courier && this.restaurant.courier.name === 'Postmates') {
      //  hardcode party is QMENU
      this.paymentDeliveryParty = paymentDeliveryPartyTypes.Qmenu;
    }
  }

  isServiceEnabled(service) {
    return service && service.paymentMethods && service.paymentMethods.length > 0;
  }

  chooseDeliveryCashOpt(opt) {
    this.deliveryCashOpt = opt;
  }

  choosePickupCashOpt(opt) {
    this.pickupCashOpt = opt;
  }

  choosePaymentPickupParty(party) {
    this.paymentPickupParty = party;
    // set party and check party if patty isn't restaurant
    if (this.paymentPickupParty !== paymentPickupPartyTypes.Restaurant) {
      this.pickupPaymentMethod = '';
    }
  }

  choosePaymentDeliveryParty(party) {
    this.paymentDeliveryParty = party;
    // set party and check party if patty isn't restaurant
    if (this.paymentDeliveryParty !== paymentDeliveryPartyTypes.Restaurant) {
      this.deliveryPaymentMethod = '';
    }
  }

  choosePaymentPickupMethod(method) {
    this.pickupPaymentMethod = method.value;
  }

  choosePaymentDeliveryMethod(method) {
    this.deliveryPaymentMethod = method.value;
  }

  // show collect credit card payments question only if the party collect payment is restaurant
  showPaymentPickupMethodOpt() {
    return this.paymentPickupParty && this.paymentPickupParty === paymentPickupPartyTypes.Restaurant;
  }

  showPaymentDeliveryMethodOpt() {
    return this.paymentDeliveryParty && this.paymentDeliveryParty === paymentDeliveryPartyTypes.Restaurant;
  }
  // pickup is necessary
  canSave() {
    return this.pickupCashOpt || this.paymentPickupParty || this.pickupPaymentMethod;
  }

  savePayment() {
    let newLogs = [];
    let activeRT = JSON.parse(JSON.stringify(this.restaurant));
    // set logs of payment for pick up orders or delivery orders 
    if (this.pickupPaymentMethod === this.stripeSaveText || this.deliveryPaymentMethod === this.stripeSaveText) {
      if (this.pickupPaymentMethod === this.stripeSaveText) {
        newLogs.push({
          time: new Date(),
          username: this._global.user.username,
          problem: 'Stripe account integration pending',
          response: `Need to collect restaurant's Stripe account information and set Stripe as a payment collection method for pickup`,
          resolved: false,
          type: 'payment-pickup-setup'
        });
      }
      if (this.deliveryPaymentMethod === this.stripeSaveText) {
        newLogs.push({
          time: new Date(new Date().valueOf() + Math.round((Math.random() + 1) * 100)),// add a time offset to make it different from previous
          username: this._global.user.username,
          problem: 'Stripe account integration pending',
          response: `Need to collect restaurant's Stripe account information and set Stripe as a payment collection method for delivery`,
          resolved: false,
          type: 'payment-delivery-setup'
        });
      }
      let { logs = [] } = activeRT;
      newLogs = [...logs, ...newLogs];
    }
    if (newLogs.length > 0) {
      activeRT.logs = newLogs;
    }
    // set service settings of restaurant
    let pickupPaymentMethods = [];
    let deliveryPaymentMethods = [];
    // payment method has cash, swipe, stripe, key-in, qMenu
    if (this.paymentPickupParty === paymentPickupPartyTypes.Qmenu) {
      pickupPaymentMethods.push(this.qmenuSaveText);
    }

    if (this.paymentDeliveryParty === paymentDeliveryPartyTypes.Qmenu) {
      deliveryPaymentMethods.push(this.qmenuSaveText);
    }
    // pickup orders with cash payment
    if (this.pickupCashOpt === pickupCashOptTypes.Yes) {
      pickupPaymentMethods.push(this.cashSaveText);
    }
    // delivey orders with cash payment
    if (this.deliveryCashOpt === deliveryCashOptTypes.Yes) {
      deliveryPaymentMethods.push(this.cashSaveText);
    }
    // other three method only select one of them(collect by rt self)
    if (this.pickupPaymentMethod) {
      pickupPaymentMethods.push(this.pickupPaymentMethod);
    }

    if (this.deliveryPaymentMethod) {
      deliveryPaymentMethods.push(this.deliveryPaymentMethod);
    }
    // if has pickup or delivery service settings, just update it
    if (activeRT.serviceSettings.some(seriveSetting => seriveSetting.name === this.pickupSaveText)) {
      activeRT.serviceSettings.forEach(seriveSetting => {
        if (seriveSetting.name === this.pickupSaveText) {
          seriveSetting.paymentMethods = pickupPaymentMethods;
        }
      });
    } else {
      let serviceSetting = {
        name: this.pickupSaveText,
        paymentMethods: pickupPaymentMethods
      }
      activeRT.serviceSettings.push(serviceSetting);
    }

    if (activeRT.serviceSettings.some(seriveSetting => seriveSetting.name === this.deliverySaveText)) {
      activeRT.serviceSettings.forEach(seriveSetting => {
        if (seriveSetting.name === this.deliverySaveText) {
          seriveSetting.paymentMethods = deliveryPaymentMethods;
        }
      });
    } else {
      let serviceSetting = {
        name: this.deliverySaveText,
        paymentMethods: deliveryPaymentMethods
      }
      activeRT.serviceSettings.push(serviceSetting);
    }
    
    this.done.emit({
      logs: activeRT.logs,
      serviceSettings: activeRT.serviceSettings
    });
  }

}
