import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { ApiService } from "../../../services/api.service";

declare var Stripe: any;
@Component({
  selector: 'app-stripe',
  templateUrl: './stripe.component.html',
  styleUrls: ['./stripe.component.css']
})
export class StripeComponent implements OnInit {

  @Input() amount = 1.0;
  @Input() hidePostalCode = false;
  @Input() invoiceId = 0;

  @Output() success = new EventEmitter();

  stripe;
  card;

  apiRequesting = false;

  constructor(private _api: ApiService) { }

  ngOnInit() {
    // Create a Stripe client.
    this.stripe = Stripe(environment.stripePublishableKey);

    // Create an instance of Elements.
    const elements = this.stripe.elements();

    // Custom styling can be passed to options when creating an Element.
    // (Note that this demo uses a wider set of styles than the guide below.)
    const style = {
      base: {
        color: '#32325d',
        lineHeight: '18px',
        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        fontSmoothing: 'antialiased',
        fontSize: '16px',
        '::placeholder': {
          color: '#aab7c4'
        }
      },
      invalid: {
        color: '#fa755a',
        iconColor: '#fa755a'
      }
    };

    // Create an instance of the card Element.
    this.card = elements.create('card', { hidePostalCode: this.hidePostalCode, style: style });


    // Add an instance of the card Element into the `card-element` <div>.
    this.card.mount('#card-element');

    // Handle real-time validation errors from the card Element.
    this.card.addEventListener('change', function (event) {
      const displayError = document.getElementById('card-errors');
      if (event.error) {
        console.log(event.error)
        displayError.textContent = event.error.message;
      } else {
        displayError.textContent = '';
      }
    });
  }

  submit() {
    this.apiRequesting = true;
    const self = this;
    this.stripe.createToken(this.card).then(function (result) {
      if (result.error) {
        self.apiRequesting = false;
        // Inform the user if there was an error.
        var errorElement = document.getElementById('card-errors');
        errorElement.textContent = result.error.message;
      } else {
        // Send the token to your server.
        this._api.post(environment.legacyApiUrl + 'invoice/pay', {
          id: self.invoiceId, stripeToken: result.token, amount: this.amount
        }).subscribe(
          result => {
            self.apiRequesting = false;
            self.success.emit();
          },
          error => {
            self.apiRequesting = false;
            console.log(error);
          }
          );
      }
    });
  }

}
