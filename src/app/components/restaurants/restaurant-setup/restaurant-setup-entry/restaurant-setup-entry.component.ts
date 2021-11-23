import { ChangeDetectorRef, Component, Input, OnInit, ViewChild } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { environment } from '../../../../../environments/environment';
import { ApiService } from '../../../../services/api.service';
import { RestaurantSetupBasicComponent } from '../restaurant-setup-basic/restaurant-setup-basic.component';
import { RestaurantSetupContactComponent } from '../restaurant-setup-contact/restaurant-setup-contact.component';
import { RestaurantSetupDeliveryComponent } from '../restaurant-setup-delivery/restaurant-setup-delivery.component';
import { RestaurantSetupInvoicingComponent } from '../restaurant-setup-invoicing/restaurant-setup-invoicing.component';
import { RestaurantSetupPaymentComponent } from '../restaurant-setup-payment/restaurant-setup-payment.component';
import { GlobalService } from 'src/app/services/global.service';
import { AlertType } from 'src/app/classes/alert-type';

declare var $: any;

@Component({
  selector: 'app-restaurant-setup-entry',
  templateUrl: './restaurant-setup-entry.component.html',
  styleUrls: ['./restaurant-setup-entry.component.css']
})
export class RestaurantSetupEntryComponent implements OnInit {

  constructor(private cdr: ChangeDetectorRef, private _api: ApiService, private _global: GlobalService) {
  }

  @Input() restaurant: Restaurant;
  @ViewChild('basicPanel') basicPanel: RestaurantSetupBasicComponent;
  @ViewChild('contactPanel') contactPanel: RestaurantSetupContactComponent;
  @ViewChild('deliveryPanel') deliveryPanel: RestaurantSetupDeliveryComponent;
  @ViewChild('paymentPanel') paymentPanel: RestaurantSetupPaymentComponent;
  @ViewChild('invoicingPanel') invoicingPanel: RestaurantSetupInvoicingComponent;
  temp = null;
  notes: string;
  top = 5;
  showNotes = true;
  menuSaved = false;
  finished = {
    basic: false, menu: false, contact: false, delivery: false, payment: false, invoicing: false
  };
  accordion = {
    basic: 'down', menu: 'down', contact: 'down', delivery: 'down', payment: 'down', invoicing: 'down'
  };

  ngOnInit() {
    window.addEventListener('scroll', e => {
      this.top = window.scrollY;
    });
    $('#setup-accordion').on('show.bs.collapse', (e) => {
      let key = e.target.id.substr(9);
      this.accordion[key] = 'up';
      // manual trigger change;
      this.cdr.detectChanges();
    }).on('hide.bs.collapse', (e) => {
      let key = e.target.id.substr(9);
      this.accordion[key] = 'down';
      this.cdr.detectChanges();
    });
    this.checkProgress();
  }

  async stepDone(data) {
    console.log('setup step done...', data);
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
      old: { _id: this.restaurant['_id'] },
      new: { _id: this.restaurant['_id'], ...data }
    }]).toPromise();
    Object.assign(this.restaurant, data);
    this.checkProgress();
    this.basicPanel.init();
    this.contactPanel.init();
    this.deliveryPanel.init();
    this.paymentPanel.init();
    this.invoicingPanel.init();
    this._global.publishAlert(AlertType.Success, 'Saved !');
  }

  hoursIdentical(a, b) {
    if (!a || !b || a.length !== b.length) {
      return false;
    }
    return a.every(x => b.some(y => x.equals(y)));
  }

  checkProgress() {
    let {
      googleListing, people = [], web,
      taxRate, notes, logs, orderNotifications, deliveryFromTime, deliveryEndMinutesBeforeClosing,
      deliveryTimeEstimate, deliverySettings, courier, serviceSettings
    } = this.restaurant;
    this.notes = notes;
    let person = people[0] || {};
    let sms = (person.channels || []).find(x => x.type === 'SMS') || {};
    this.finished.basic = googleListing && googleListing.phone && web && web.bizManagedWebsite
      && person.title && person.name && (person.roles || []).length && sms && !!taxRate;
    this.finished.menu = (logs || []).some(x => x.type === 'menu-setup');
    this.finished.contact = orderNotifications && orderNotifications.some(x => x.channel.type === 'Phone');
    let deliveryWithPostmates = !!courier;
    let selfDeliveryFinished = !!(deliveryFromTime && deliveryEndMinutesBeforeClosing && deliveryTimeEstimate && deliverySettings && deliverySettings.length > 0);
    let nonDeliveryFinished = (serviceSettings || []).find(x => x.paymentMethods && x.paymentMethods.length > 0);
    this.finished.delivery = deliveryWithPostmates || selfDeliveryFinished || nonDeliveryFinished;

    ['basic', 'menu', 'contact', 'delivery'].forEach(mod => {
      if (!this.finished[mod]) {
        $(`#collapse-${mod}`).collapse('show');
      }
    });
  }

  async saveNote() {
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
      old: { _id: this.restaurant['_id'] },
      new: { _id: this.restaurant['_id'], notes: this.notes }
    }]).toPromise();
    this.restaurant.notes = this.notes;
  }
}
