import { Component, OnInit, Input } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { PrunedPatchService } from "../../../services/prunedPatch.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";
import { Restaurant } from '@qmenu/ui';

@Component({
  selector: 'app-restaurant-service-settings',
  templateUrl: './restaurant-service-settings.component.html',
  styleUrls: ['./restaurant-service-settings.component.css']
})
export class RestaurantServiceSettingsComponent implements OnInit {
  @Input() restaurant: Restaurant;
  editing = false;

  serviceTypes = ['Pickup', 'Delivery', 'Dine-in'];

  paymentDescriptionMap = {
    'CASH': 'Cash',
    'IN_PERSON': 'Credit card: swipe in-person',
    'QMENU': 'Credit card: let qMenu collect on behalf of restaurant',
    'KEY_IN': 'Credit card: send numbers to restaurant for key-in',
    'STRIPE': 'Credit card: deposit to restaurant\'s Stripe account directly',
    'SPREEDLY': 'Spreedly (configure settings below)'
  };

  serviceSettingsInEditing = [];
  excludeAmex = false;
  excludeDiscover = false;
  requireZipcode = false;
  requireBillingAddress = false;
  taxBeforePromotion = false;
  ccProcessor;

  stripePublishableKey;
  stripeSecretKey;

  supportedGateways = [];
  gateway: any = {};
  gatewayType;

  constructor(private _api: ApiService, private _global: GlobalService, private _prunedPacth: PrunedPatchService) {
  }

  getExcludedPaymentString() {
    return [this.restaurant.requireZipcode ? 'Zip code is required' : '', this.restaurant.requireBillingAddress ? 'Billing address is required' : '', this.restaurant.excludeAmex ? 'No American Express' : '', this.restaurant.excludeDiscover ? 'No Discover' : ''].filter(s => s).join(', ');
  }

  getServies() {
    return this.serviceTypes.map(key => (this.restaurant.serviceSettings || {})[key] || {});
  }

  getCurrentServices() {
    return this.serviceTypes.filter(service => this.restaurant.serviceSettings && this.restaurant.serviceSettings[service]);
  }

  getPaymentMethods() {
    return Object.keys(this.paymentDescriptionMap);
  }

  ngOnInit() {
    this.populate();
  }

  ngOnChanges() {
    this.gateway = this.restaurant && this.restaurant['ccHandler'] || {};
    this.gatewayType = (this.restaurant && this.restaurant['ccHandler'] || {}).gateway_type;
  }

  async populate() {
    this.supportedGateways = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'payment-gateway',
      query: { /*gateway_type: { $nin: ['stripe', 'stripe_payment_intents'] }*/ },
      projection: {
        name: 1,
        gateway_type: 1,
        auth_modes: 1
      },
    }, 100);
  }

  isServiceEnabled(service) {
    return service && service.paymentMethods && service.paymentMethods.length > 0;
  }

  toggleService(service) {
    if (this.isServiceEnabled(service)) {
      // toggle off: save current to backup, reset paymentMethods
      service.paymentMethodsBackup = service.paymentMethods;
      service.paymentMethods = [];
    } else {
      // turn on: retrieve
      service.paymentMethods = service.paymentMethodsBackup || [];
      service.paymentMethodsBackup = undefined;
    }
  }

  toggleEditing() {
    this.editing = !this.editing;
    this.excludeAmex = this.restaurant.excludeAmex;
    this.excludeDiscover = this.restaurant.excludeDiscover;
    this.taxBeforePromotion = this.restaurant.taxBeforePromotion;
    this.ccProcessor = this.restaurant['ccProcessor'];
    this.requireZipcode = this.restaurant.requireZipcode;
    this.requireBillingAddress = this.restaurant.requireBillingAddress;
    this.stripePublishableKey = this.restaurant.stripePublishableKey;
    this.stripeSecretKey = this.restaurant.stripeSecretKey;

    this.serviceSettingsInEditing = JSON.parse(JSON.stringify(this.restaurant.serviceSettings || []));
    // make sure it has all service types
    this.serviceTypes.map(st => {
      if (!this.serviceSettingsInEditing.some(serviceSetting => (serviceSetting.name ? serviceSetting.name : '') === st)) {
        this.serviceSettingsInEditing.push({ name: st, paymentMethods: [] });
      }
    });
  }

  isPaymentMethodSelected(service, paymentMethod) {
    return (service.paymentMethods || []).some(pt => pt === paymentMethod);
  }

  servicePaymentMethodChange(service, paymentMethod) {
    service.paymentMethods = service.paymentMethods || [];
    if (this.isPaymentMethodSelected(service, paymentMethod)) {
      service.paymentMethods.splice(service.paymentMethods.indexOf(paymentMethod), 1);
    } else {
      service.paymentMethods.push(paymentMethod);
      // also remove mutually exclusive payment types!
      const mutexTypes = ['QMENU', 'KEY_IN', 'STRIPE', 'IN_PERSON', 'SPREEDLY'];
      if (mutexTypes.indexOf(paymentMethod) >= 0) {
        mutexTypes.filter(mt => mt !== paymentMethod).map(type => {
          if (service.paymentMethods.indexOf(type) >= 0) {
            service.paymentMethods.splice(service.paymentMethods.indexOf(type), 1);
          }
        });
      }
    }
  }

  update() {

    const oldR = JSON.parse(JSON.stringify(this.restaurant));
    const newR = JSON.parse(JSON.stringify(this.restaurant));

    newR.serviceSettings = this.serviceSettingsInEditing;
    newR.excludeAmex = this.excludeAmex;
    newR.excludeDiscover = this.excludeDiscover;
    newR.taxBeforePromotion = this.taxBeforePromotion;
    newR.ccProcessor = this.ccProcessor ? this.ccProcessor : undefined;
    newR.requireZipcode = this.requireZipcode;
    newR.requireBillingAddress = this.requireBillingAddress;
    newR.stripePublishableKey = (this.stripePublishableKey || '').trim();
    newR.stripeSecretKey = (this.stripeSecretKey || '').trim();

    this._prunedPacth
      .patch(environment.qmenuApiUrl + "generic?resource=restaurant", [
        {
          old: oldR,
          new: newR
        }])
      .subscribe(
        result => {
          // let's update original, assuming everything successful
          this._global.publishAlert(
            AlertType.Success,
            "Updated successfully"
          );

          this.restaurant.serviceSettings = this.serviceSettingsInEditing;
          this.restaurant.excludeAmex = this.excludeAmex;
          this.restaurant.excludeDiscover = this.excludeDiscover;
          this.restaurant.taxBeforePromotion = this.taxBeforePromotion;
          this.restaurant['ccProcessor'] = this.ccProcessor;
          this.restaurant.requireZipcode = this.requireZipcode;
          this.restaurant.requireBillingAddress = this.requireBillingAddress;
          this.restaurant.stripePublishableKey = this.stripePublishableKey;
          this.restaurant.stripeSecretKey = this.stripeSecretKey;

          this.editing = false;
          this.serviceSettingsInEditing = [];
        },
        error => {
          this._global.publishAlert(AlertType.Danger, "Error updating to DB");
        }
      );

  }

  toggleDiscover() {
    this.excludeDiscover = !this.excludeDiscover;
  }

  toggleAmex() {
    this.excludeAmex = !this.excludeAmex;
  }

  toggleZipcode() {
    this.requireZipcode = !this.requireZipcode;
  }

  toggleBillingAddress() {
    this.requireBillingAddress = !this.requireBillingAddress;
  }

  toggleTaxBeforePromotion() {
    this.taxBeforePromotion = !this.taxBeforePromotion;
  }

  shouldShowStripeInput() {
    return this.serviceSettingsInEditing.some(service => (service.paymentMethods || []).some(pt => pt === 'STRIPE'));
  }

  shouldShowSpreedlyInput() {
    return this.serviceSettingsInEditing.some(service => (service.paymentMethods || []).some(pt => pt === 'SPREEDLY'));
  }

  changeGateway(gatewayType) {
    this.gateway = {};
    this.gateway.gateway_type = gatewayType;
    this.gateway.credentials = this.getCredentialFields(gatewayType);
  }

  getCredentialFields(gatewayType) {
    const gateway = this.supportedGateways.find(g => g.gateway_type === gatewayType);

    if (gateway) {
      const [authMode] = (gateway && gateway.auth_modes || {});
      if (authMode) {
        if (authMode.credentials && authMode.credentials.length > 0) {
          return authMode.credentials;
        } else {
          this._global.publishAlert(AlertType.Success, "No Spreedly credentials found!");
          return;
        }

      } else {
        this._global.publishAlert(AlertType.Success, "No Spreedly authomde found!");
        return;
      }
    } else {
      this._global.publishAlert(AlertType.Success, "Spreedly gateway type not found!");
      return;
    }
  }

  isValidGateway(gateway) {
    if (!gateway) {
      return false;
    }

    const hasGatewayType = !!gateway.gateway_type;
    const hasCredentials = !!gateway.credentials;
    const hasValidCredentials = gateway.credentials.every(credential => !!gateway[credential.name]);
    const isValidGateway = hasGatewayType && hasCredentials && hasValidCredentials;

    return isValidGateway;
  }

  async createGateway() {

    const ccHandler = this.restaurant['ccHandler'] || {};

    try {

      if (this.isValidGateway(this.gateway)) {
        if (ccHandler && ccHandler.gateway_token) {
          // --- overwrite
          if (confirm('There is a gateway asigned for this restaurant already. Do you want to overwrite it?')) {
            const gatewayResponse = await this._api.post(environment.appApiUrl + 'lambdas/spreedly', {
              name: "create-gateway",
              payload: {
                gatewayDetails: {
                  ...this.gateway
                },
                sandbox: true // TODO: remove in production
              }
            }).toPromise();

            const { status, data: { gateway: { token } } } = gatewayResponse;

            if (status === 201) {
              const oldCcHandler = JSON.parse(JSON.stringify(ccHandler));
              let newCcHandler = JSON.parse(JSON.stringify(ccHandler));

              newCcHandler = {
                type: 'SPREEDLY',
                ...this.gateway,
                gateway_token: token
              };

              oldCcHandler.gateway_type = ccHandler.gateway_type;

              try {
                await this._api.patch(environment.qmenuApiUrl + "generic?resource=restaurant", [
                  {
                    old: {
                      _id: { $oid: this.restaurant._id },
                      ccHandler: oldCcHandler
                    },
                    new: {
                      _id: { $oid: this.restaurant._id },
                      ccHandler: newCcHandler
                    },
                  }
                ]).toPromise();

                this._global.publishAlert(AlertType.Success, "Gateway overwriten successfuly");
              } catch (error) {
                console.error(error);
                this._global.publishAlert(AlertType.Danger, "Error while setting up spreedly gateway");
              }
            } else {
              this._global.publishAlert(AlertType.Danger, "Error while requesting creation of spreedly gateway");
              console.error(gatewayResponse);
            }
          } else {
            // --- cancel
            return;
          }
        } else {
          // --- create new
          try {
            const gatewayResponse = await this._api.post(environment.appApiUrl + 'lambdas/spreedly', {
              name: "create-gateway",
              payload: {
                gatewayDetails: {
                  ...this.gateway
                },
                sandbox: true // TODO: remove in production
              }
            }).toPromise();

            const { status, data: { gateway: { token } } } = gatewayResponse;
            if (status === 201) {
              const oldCcHandler = JSON.parse(JSON.stringify(ccHandler));
              let newCcHandler = JSON.parse(JSON.stringify(ccHandler));

              newCcHandler = {
                type: 'SPREEDLY',
                ...this.gateway,
                gateway_token: token
              };

              oldCcHandler.gateway_type = ccHandler.gateway_type;

              await this._api.patch(environment.qmenuApiUrl + "generic?resource=restaurant", [
                {
                  old: {
                    _id: { $oid: this.restaurant._id },
                    ccHandler: {}
                  },
                  new: {
                    _id: { $oid: this.restaurant._id },
                    ccHandler: newCcHandler
                  },
                }
              ]).toPromise();

              this._global.publishAlert(AlertType.Success, "Gateway created successfuly");
            } else {
              this._global.publishAlert(AlertType.Danger, "Error while requesting creation of spreedly gateway");
              console.error(gatewayResponse);
            }
          } catch(error) {
            console.error(error);
            this._global.publishAlert(AlertType.Danger, "Error while setting up spreedly gateway");
          }
        }
      } else {
        this._global.publishAlert(AlertType.Danger, "Error gateway info is malformed");
        console.error(this.gateway);
      }
    } catch (error) {
      this._global.publishAlert(AlertType.Danger, "Error creating gateway");
      console.error(error);
    }
  }
}

