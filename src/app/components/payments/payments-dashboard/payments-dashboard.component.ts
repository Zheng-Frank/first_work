import { Component, OnInit, ViewChild } from "@angular/core";
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";
import { PaymentMeans } from "@qmenu/ui";


@Component({
  selector: 'app-payments-dashboard',
  templateUrl: './payments-dashboard.component.html',
  styleUrls: ['./payments-dashboard.component.scss']
})
export class PaymentsDashboardComponent implements OnInit {

  @ViewChild('paymentMeansEditingModal') paymentMeansEditingModal;

  searchFilter = '';

  selectedDirection = '';
  directionItems = [
    {text: 'direction...', value: ''},
    {text: 'Send', value: 'Send'},
    {text: 'Receive', value: 'Receive'}
  ];

  selectedType ='';
  typeItems = [
    {
      text: 'payment type...',
      value: ''
    },
    {
      text: 'Check',
      value: 'Check'
    },
    {
      text: 'Quickbooks Invoicing',
      value: 'Quickbooks Invoicing'
    },
    {
      text: 'Quickbooks Bank Withdraw',
      value: 'Quickbooks Bank Withdraw'
    },
    {
      text: 'Credit Card',
      value: 'Credit Card'
    },
    {
      text: 'Pay Online / Stripe',
      value: 'Stripe'
    },
    {
      text: 'Direct Deposit (receive)',
      value: 'Direct Deposit'
    },
    {
      text: 'Check Deposit (receive)',
      value: 'Check Deposit'
    }
  ];

  filteredRestaurantPaymentMeans = [];

  paymentMeansInEditing = new PaymentMeans();
  paymentMeansInEditingOriginal;

  restaurant = undefined;
  restaurantList = [];
  constructor(private _api: ApiService, private _global: GlobalService) {
    this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query: {
        disabled: {
          $ne: true
        }
      },
      projection: {
        name: 1,
        alias: 1,
        paymentMeans: 1,
        logo: 1,
        channels: 1,
        "googleAddress.formatted_address": 1
      },
      limit: 6000
    }).subscribe(
      restaurants => {
        this.restaurantList = restaurants;
        // convert paymentMeans to type of PaymentMeans
        this.restaurantList.map(r => {
          if (r.paymentMeans) {
            r.paymentMeans = r.paymentMeans.map(paymentMeans => new PaymentMeans(paymentMeans));
          }
        });
        this.computeFilteredPaymentMeans();
      },
      error => {
        this._global.publishAlert(
          AlertType.Danger,
          "Error pulling restaurants"
        )
      });

  }

  ngOnInit() {
  }

  onCancelCreation() {
    this.paymentMeansEditingModal.hide();
  }

  onSuccessCreation(data) {
    const oldRestaurant = this.restaurant;
    const updatedRestaurant = JSON.parse(JSON.stringify(oldRestaurant));
    updatedRestaurant.paymentMeans = updatedRestaurant.paymentMeans || [];


    // check if the original exists
    if (oldRestaurant.paymentMeans && oldRestaurant.paymentMeans.indexOf(this.paymentMeansInEditingOriginal) >= 0) {
      const index = oldRestaurant.paymentMeans.indexOf(this.paymentMeansInEditingOriginal);
      updatedRestaurant.paymentMeans[index] = new PaymentMeans(data.paymentMeans);
    } else {
      updatedRestaurant.paymentMeans.push(new PaymentMeans(data.paymentMeans));
    }

    this.patch(oldRestaurant, updatedRestaurant, data.formEvent.acknowledge);

  }

  computeFilteredPaymentMeans() {
    this.filteredRestaurantPaymentMeans = [];
    this.restaurantList.map(r => {
      (r.paymentMeans || []).map(pm => {
        // apply filter to reduce possible sorting
        const filter = (this.searchFilter || '').toLowerCase();
        const b1 = !this.selectedType || pm.type === this.selectedType;
        const b3 = !this.selectedDirection || pm.direction === this.selectedDirection;

        const b2 = b1 && b3 && (!filter || (r.name.toLowerCase().startsWith(filter)
          || (pm.callerPhone || '').startsWith(filter)
          || (r.channels && r.channels.some(c => c.value.startsWith(filter)))));
        if (b1 && b2 && b3) {
          this.filteredRestaurantPaymentMeans.push({
            restaurant: r,
            paymentMeans: pm
          });
        }
      });
    });

    // sort DESC by name!
    this.filteredRestaurantPaymentMeans.sort((rl1, rl2) => rl2.restaurant.name > rl1.restaurant.name ? 1 : (rl2.restaurant.name < rl1.restaurant.name ? -1 : 0));

  }

  changeFilter() {
    this.computeFilteredPaymentMeans();
  }

  debounce(event) {
    this.computeFilteredPaymentMeans();
  }

  getAddress(restaurant) {
    if (restaurant.googleAddress && restaurant.googleAddress.formatted_address) {
      return restaurant.googleAddress.formatted_address.replace(', USA', '');
    }
    return '';
  }
  

  select(restaurant) {
    this.restaurant = restaurant;
  }
  createNew() {

    this.paymentMeansInEditing = new PaymentMeans();
    this.paymentMeansInEditingOriginal = undefined;
    this.restaurant = null;
    this.paymentMeansEditingModal.title = "Add new PaymentMeans";
    this.paymentMeansEditingModal.show();
  }

  edit(restaurantPaymentMeans) {
    // let make a copy and preserve the original
    this.paymentMeansInEditing = new PaymentMeans(restaurantPaymentMeans.paymentMeans);
    this.paymentMeansInEditingOriginal = restaurantPaymentMeans.paymentMeans;

    this.restaurant = restaurantPaymentMeans.restaurant;
    this.paymentMeansEditingModal.title = "Edit Payment Means";
    this.paymentMeansEditingModal.show();
  }

  remove(event) {

    if (this.restaurant && this.restaurant.paymentMeans && this.restaurant.paymentMeans.indexOf(this.paymentMeansInEditingOriginal) >= 0) {
      const newPaymentMeans = this.restaurant.paymentMeans.filter(pm => pm !== this.paymentMeansInEditingOriginal);
      const updatedRestaurant = JSON.parse(JSON.stringify(this.restaurant));
      updatedRestaurant.paymentMeans = newPaymentMeans;
      this.patch(this.restaurant, updatedRestaurant, event.formEvent.acknowledge);

    } else {
      event.formEvent.acknowledge('Missing restaurant, or restaurant payment means');
    }
  }

  patch(oldRestaurant, updatedRestaurant, acknowledge) {
     this._api.patch(environment.qmenuApiUrl + "generic?resource=restaurant", [{ old: oldRestaurant, new: updatedRestaurant }]).subscribe(
      result => {
        // let's update original, assuming everything successful
        oldRestaurant.paymentMeans = updatedRestaurant.paymentMeans;

        this._global.publishAlert(
          AlertType.Success,
          'Successfully created new payment means.'
        );

        acknowledge(null);
        this.paymentMeansEditingModal.hide();
        this.computeFilteredPaymentMeans();
      },
      error => {
        this._global.publishAlert(AlertType.Danger, "Error adding a payment means");
        acknowledge("API Error");
      }
    );
  }

}
