import { Component, OnInit, ViewChild } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { environment } from 'src/environments/environment';
import { GlobalService } from 'src/app/services/global.service';
import { AlertType } from 'src/app/classes/alert-type';
import { Courier } from 'src/app/classes/courier';
import { CourierPricing } from 'src/app/classes/courier-pricing';

@Component({
  selector: 'app-courier-dashboard',
  templateUrl: './courier-dashboard.component.html',
  styleUrls: ['./courier-dashboard.component.css']
})
export class CourierDashboardComponent implements OnInit {
  @ViewChild("pricingModal") pricingModal;
  couriers: Courier[] = [];
  courierRestaurants = {};
  now = new Date();
  editPricing(courier, pricing) {
    this.courierInEditing = courier;
    if (pricing) {
      this.pricingInEditing = new CourierPricing(pricing);
      this.pricingInEditingOriginal = pricing;

    } else {
      this.pricingInEditing = new CourierPricing({
        base: 3.99,
        perMile: 1,
        hours: []
      });
      this.pricingInEditingOriginal = undefined;
    }
    this.pricingModal.show();
  }
  pricingCancel() {
    this.pricingModal.hide();
  }

  courierInEditing: Courier;
  pricingInEditingOriginal: CourierPricing;

  pricingInEditing = new CourierPricing({
    base: 3.99,
    perMile: 1,
    hours: []
  });

  pricingFieldDescriptors = [
    {
      field: "base", //
      label: "Base",
      required: true,
      inputType: "number"
    },
    {
      field: "perMile", //
      label: "Rate (per mile)",
      required: true,
      inputType: "number"
    }
  ];

  async pricingSubmit(event) {
    const newPricings = (this.courierInEditing.pricings || []).slice(0); // make a shallow copy instead of manipulating old array directly
    if (this.pricingInEditingOriginal) {
      newPricings[newPricings.indexOf(this.pricingInEditingOriginal)] = new CourierPricing(this.pricingInEditing);
    } else {
      newPricings.push(new CourierPricing(this.pricingInEditing));
    }
    await this.tryUpdatingNewPricings(this.courierInEditing, newPricings, event.acknowledge);
  }

  async pricingDelete(event) {
    const remainingPricings = this.courierInEditing.pricings.filter(p => p !== this.pricingInEditingOriginal);
    await this.tryUpdatingNewPricings(this.courierInEditing, remainingPricings, event.acknowledge);
  };

  async tryUpdatingNewPricings(courier, newPricings, eventAcknowledge) {
    try {
      // making sure base and perMile are numbers
      newPricings.map(pricing => {
        pricing.base = +pricing.base || 0;
        pricing.perMile = +pricing.perMile || 0;
      });
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=courier', [
        {
          old: { _id: this.courierInEditing._id },
          new: { _id: this.courierInEditing._id, pricings: newPricings },
        }
      ]).toPromise();
      eventAcknowledge(null);
      this.courierInEditing.pricings = newPricings;
      this._global.publishAlert(AlertType.Success, `Succeeded`);
      this.pricingModal.hide();
    }
    catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, `Error happened`);
      eventAcknowledge(error);
    }
    this.pricingModal.hide();
  }


  addingHours = false;
  doneAddingHours(hours) {
    console.log(hours);
    this.addingHours = false;
    this.pricingInEditing.hours = hours.slice(0);
  }

  removeHour(hour) {
    this.pricingInEditing.hours = this.pricingInEditing.hours.filter(h => h !== hour);
  }

  constructor(private _api: ApiService, private _global: GlobalService) {
    this.populate().then(console.log);
  }

  ngOnInit() {
  }

  async populate() {
    const couriers = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "courier",
      sort: {
        name: 1
      },
      limit: 3000
    }).toPromise();
    this.couriers = couriers.map(c => new Courier(c));

    const restaurantsWithCouriers = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query: {
        courier: { $exists: true }
      },
      projection: {
        courier: 1,
        name: 1,
        alias: 1,
        logo: 1,
        "googleAddress.formatted_address": 1
      },
      limit: 3000000
    }).toPromise();

    const drivers = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "driver",
      query: {},
      projection: {
        firstName: 1,
        lastName: 1,
        phone: 1,
        online: 1,
        isManager: 1,
        courier: 1
      },
      limit: 3000000
    }).toPromise();

    drivers.map(d => this.couriers.map(c => {
      if (c._id === d.courier._id) {
        c.drivers = c.drivers || [];
        c.drivers.push(d);
      }
    }));

    restaurantsWithCouriers.sort((r1, r2) => r1.name > r2.name ? 1 : -1);
    restaurantsWithCouriers.map(rt => {
      this.courierRestaurants[rt.courier._id] = this.courierRestaurants[rt.courier._id] || [];
      this.courierRestaurants[rt.courier._id].push(rt);
    });

  }

  async toggleEnabled(courier, event) {
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=courier', [
      {
        old: { _id: courier._id },
        new: { _id: courier._id, enabled: courier.enabled }, // we bind courier.enabled to toggle, so we'd use that directly
      }
    ]).toPromise();
    this._global.publishAlert(AlertType.Success, "Status updated");
  }

  getCourierRestaurants(courier) {
    return this.courierRestaurants[courier._id] || [];
  }

}
