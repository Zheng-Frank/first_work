import { GlobalService } from 'src/app/services/global.service';
import {ApiService} from 'src/app/services/api.service';
import {environment} from 'src/environments/environment';
import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Restaurant, TimezoneHelper} from '@qmenu/ui';
import { deliverySectionCallScript } from '../restaurant-setup-entry/setup-call-script';

@Component({
  selector: 'app-restaurant-setup-delivery',
  templateUrl: './restaurant-setup-delivery.component.html',
  styleUrls: ['./restaurant-setup-delivery.component.css']
})
export class RestaurantSetupDeliveryComponent implements OnInit {

  @Input() restaurant: Restaurant;
  @Output() done = new EventEmitter();
  viabilityList = [];
  rtHasDelivery;
  deliveryTaxable;
  deliveryTimeEstimate;
  qMenuFacilitate;
  postmatesAvailable;
  deliveryFromTimes = [{value: 0, text: 'At business open'}];
  deliveryFromTime = '';
  deliveryEndTimes = [
    {value: 0, text: 'At closing'},
    {value: 15, text: '15 minutes before closing'},
    {value: 30, text: '30 minutes before closing'},
    {value: 45, text: '45 minutes before closing'},
    {value: 60, text: '60 minutes before closing'},
    {value: 90, text: '90 minutes before closing'},
    {value: 120, text: '120 minutes before closing'},
    {value: 180, text: '180 minutes before closing'},
    {value: 240, text: '240 minutes before closing'},
  ];
  deliveryEndTime = '';
  deliverySettings = [];
  blockedArea = '';
  postmatesCourier = null;
  serviceSettings = [];
  changeLanguageFlag = this._global.languageType;// this flag decides show English call script or Chinese
  showCallScript = false;// it will display call script when the switch is opened
  
  constructor(private _api: ApiService, private _global: GlobalService) {
  }

  async ngOnInit() {
    this.init();
    this.initDeliveryTimeOptions();
    let couriers = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'courier',
      projection: {name: 1},
      limit: 1000000,
      sort: {name: 1}
    }).toPromise();
    this.postmatesCourier = couriers.find(x => x.name === 'Postmates');
    await this.getViabilityList();
    this.checkPostmatesAvailability();
  }
  // make deliverySectionCallScript from exporting becomes inner field of class RestaurantSetupDeliveryComponent
  get deliverySectionCallScript(){
    return deliverySectionCallScript;
  }

  serviceAlreadySet(serviceType, setBackup = false) {
    let service = this.serviceSettings.find(x => x.name === serviceType);
    if (!service) {
      service = {name: serviceType};
      this.serviceSettings.push(service);
    }
    // if service has no paymentMethods or paymentMethodsBackup, that's first time to setup
    let {paymentMethods, paymentMethodsBackup} = service;
    if (!((paymentMethods && paymentMethods.length) || (paymentMethodsBackup && paymentMethodsBackup.length))) {
      // use backup field to record change
      if (setBackup) {
        service.paymentMethodsBackup = ['CASH'];
      }
      return false;
    }
    return true;
  }

  init() {
    // case 0: first time get here and everything is clean and new
    this.rtHasDelivery = this.qMenuFacilitate = undefined;
    let {
      courier, taxOnDelivery, deliveryFromTime, serviceSettings,
      deliveryEndMinutesBeforeClosing, deliveryTimeEstimate,
      blockedCities = [], blockedZipCodes = [], deliverySettings
    } = this.restaurant;
    this.serviceSettings = JSON.parse(JSON.stringify(serviceSettings || []));
    // case 1: reenter, has delivery and has set some field <- previously choose Yes and input something
    // case 2: reenter, has delivery but hasn't set any field <- previously choose Yes without any input
    // case 3: reenter, not has delivery but accept qmenu facilitate and postmates available <- previously choose no and yes and postmates available
    // case 4: reenter, not has delivery and not accept qmenu facilitate or postmates unavailable <- previously choose no and no (or postmates unavailable)

    // first we check if the pickup already set or not(this will be set in any case user saved)
    if (this.serviceAlreadySet('Pickup', true)) {
      // then we check if courier exists
      if (courier) {
        this.rtHasDelivery = false;
        this.qMenuFacilitate = true;
      } else {
        // if no courier set, then check the self-delivery related fields
        if ((taxOnDelivery !== undefined) || deliveryFromTime
          || blockedZipCodes.length > 0 || blockedCities.length > 0 || deliveryEndMinutesBeforeClosing
          || deliveryTimeEstimate || (deliverySettings && deliverySettings.length > 0)) {
          this.rtHasDelivery = true;
        } else {
          // if no self-delivery related fields set, then check delivery's serviceSetting
          if (this.serviceAlreadySet('Delivery')) {
            this.rtHasDelivery = true;
          } else {
            this.rtHasDelivery = false;
            this.qMenuFacilitate = false;
          }
        }
      }
    }

    this.deliveryTaxable = taxOnDelivery;
    this.deliveryFromTime = deliveryFromTime;
    this.deliveryEndTime = deliveryEndMinutesBeforeClosing;
    this.blockedArea = [...blockedCities, ...blockedZipCodes].join(', ');
    this.deliveryTimeEstimate = deliveryTimeEstimate;
    this.deliverySettings = JSON.parse(JSON.stringify(deliverySettings || []));
    while (this.deliverySettings.length < 5) {
      this.deliverySettings.push({});
    }
  }

  initDeliveryTimeOptions() {
    let {googleAddress: {timezone}} = this.restaurant;
    const t = TimezoneHelper.parse('2000-01-01', timezone);
    const interval = 30;
    for (let i = 0; i < 24 * 60 / interval; i++) {
      this.deliveryFromTimes.push({
        value: t.getTime(),
        text: t.toLocaleString('en-US', {hour: '2-digit', minute: '2-digit', timeZone: timezone})
      });
      t.setMinutes(t.getMinutes() + interval);
    }
  }

  addNewRow() {
    this.deliverySettings.push({});
  }

  delRow(index) {
    this.deliverySettings.splice(index, 1);
  }

  async getViabilityList() {
    this.viabilityList = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'viability-lookup',
      query: {},
      projection: {
        'Branch Name': 1,
        'Addresses': 1,
        Latitude: 1,
        Longitude: 1,
        Viability: 1
      },
      limit: 20000
    }).toPromise();
  }

  getDistance(lat1, lng1, lat2, lng2) {
    let radLat1 = lat1 * Math.PI / 180.0;
    let radLat2 = lat2 * Math.PI / 180.0;
    let a = radLat1 - radLat2;
    let b = lng1 * Math.PI / 180.0 - lng2 * Math.PI / 180.0;
    let s = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(a / 2), 2) +
      Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2), 2)));
    s = s * 6378.137; // EARTH_RADIUS;
    s = Math.round(s * 10000) / 10000;
    // The distance to call return is in miles.
    s = s * 0.62137; // 1 kilometre is 0.62137 mile.
    return s;
  }

  checkPostmatesAvailability() {
    let distanceArr = [];
    this.viabilityList.forEach(item => {
      if (item.Latitude && item.Longitude) {
        const distance = this.getDistance(this.restaurant.googleAddress.lat, this.restaurant.googleAddress.lng, item.Latitude, item.Longitude);
        distanceArr.push(distance);
      } else {
        distanceArr.push(Number.MAX_VALUE);
      }
    });
    let minDistance = Math.min(...distanceArr);
    let index = distanceArr.indexOf(minDistance);
    this.postmatesAvailable = minDistance < 0.5 && ['V1', 'V2', 'V3', 'V4'].includes(this.viabilityList[index].Viability);
  }

  canSave() {
    if (!this.rtHasDelivery) {
      if (this.rtHasDelivery === undefined) {
        return false;
      }
      return this.qMenuFacilitate !== undefined;
    }
    return true;
  }

  async save() {
    // if RT offer delivery, add self delivery setting
    if (this.rtHasDelivery) {
      let areas = this.blockedArea.split(',').map(x => x.trim()).filter(x => !!x);
      let obj: any = {
        courier: null,
        taxOnDelivery: this.deliveryTaxable,
        deliveryEndMinutesBeforeClosing: this.deliveryEndTime,
        blockedCities: areas.filter(x => /\D/.test(x)),
        blockedZipCodes: areas.filter(x => /^\d+$/.test(x)),
        deliverySettings: this.deliverySettings.filter(x => !!x.distance),
        deliveryTimeEstimate: this.deliveryTimeEstimate,
        serviceSettings: this.serviceSettings
      };
      let delivery = this.serviceSettings.find(x => x.name === 'Delivery');
      if (!delivery) {
        delivery = {name: 'Delivery'};
        this.serviceSettings.push(delivery);
      }
      let {paymentMethods, paymentMethodsBackup} = delivery;
      if (!((paymentMethods && paymentMethods.length) || (paymentMethodsBackup && paymentMethodsBackup.length))) {
        // use backup field to record change
        delivery.paymentMethodsBackup = ['CASH'];
      }
      if (this.deliveryFromTime) {
        obj.deliveryFromTime = this.deliveryFromTime;
      }
      this.done.emit(obj);
    } else if (this.rtHasDelivery === false) {
      // if RT accept postmates and postmates available, set courier to postmates
      if (this.qMenuFacilitate && this.postmatesAvailable) {
        // set delivery service setting to qmenu collect
        let delivery = this.serviceSettings.find(x => x.name === 'Delivery');
        if (!delivery) {
          delivery = {name: 'Delivery'};
          this.serviceSettings.push(delivery);
        }
        delivery.paymentMethods = ['QMENU'];
        let obj = {
          courier: this.postmatesCourier,
          muteFirstNotifications: false,
          muteSecondNotifications: false,
          taxOnDelivery: this.deliveryTaxable,
          serviceSettings: this.serviceSettings
        };
        this.done.emit(obj);
      } else {
        this.done.emit({serviceSettings: this.serviceSettings});
      }
    }
  }
}
