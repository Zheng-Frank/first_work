import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-schemas',
  templateUrl: './schemas.component.html',
  styleUrls: ['./schemas.component.css']
})
export class SchemasComponent implements OnInit {
  currentSchema: any;
  currentDbName: string;
  isCopiedToClipboard = false;
  isShowLastModel = false;// show lastest json model schemas.
  changeCollectionView() {
    this.schemas.forEach(schema => {
      if (schema.dbName == this.currentDbName) {
        this.currentSchema = schema;
      }
    });
  }
  /**
   * this function is used to prepare to go to json online website to view its format structure
   */
  copyToClipcboard(currentSchema) {
    if (!currentSchema) {
      return alert('please select a json schema before!');
    } else {
      let text = '';
      if (this.isShowLastModel) {
        text = JSON.stringify(currentSchema.lastestSchema);
      } else {
        text = JSON.stringify(currentSchema.fullSchema);
      }
      const handleCopy = (e: ClipboardEvent) => {
        // clipboardData 可能是 null
        e.clipboardData && e.clipboardData.setData('text/plain', text);
        e.preventDefault();
        // removeEventListener 要传入第二个参数
        document.removeEventListener('copy', handleCopy);
      };
      document.addEventListener('copy', handleCopy);
      document.execCommand('copy');
      this.isCopiedToClipboard = true;

      setTimeout(() => {
        this.isCopiedToClipboard = false;
      }, 1000);
    }
  }

  schemas = [
    //customer document full object model
    {
      dbName: 'customer',
      lastestSchema: {},
      fullSchema: {
        "_id": "",
        "createdAt": "",
        "updatedAt": "",
        "phone": "",
        "source": "",
        "socialId": "",
        "socialProvider": "",
        "socialProfilePhoto": "",
        "firstName": "",
        "lastName": "",
        "email": null,
        "ips": [
          ""
        ],
        "devices": [
          {
            "token": "",
            "deviceId": ""
          }
        ],
        "logs": [
          {
            "time": "",
            "stripeObject": "",
            "last4": "",
            "error": {
              "type": "",
              "raw": {
                "charge": "",
                "code": "",
                "decline_code": "",
                "doc_url": "",
                "message": "",
                "type": "",
                "headers": {
                  "server": "",
                  "date": "",
                  "content-type": "",
                  "content-length": "",
                  "connection": "",
                  "access-control-allow-credentials": "",
                  "access-control-allow-methods": "",
                  "access-control-allow-origin": "",
                  "access-control-expose-headers": "",
                  "access-control-max-age": "",
                  "cache-control": "",
                  "request-id": "",
                  "stripe-version": "",
                  "strict-transport-security": "",
                  "x-stripe-c-cost": ""
                },
                "statusCode": "",
                "requestId": "",
                "param": ""
              },
              "rawType": "",
              "code": "",
              "doc_url": "",
              "param": "",
              "detail": "",
              "headers": {
                "server": "",
                "date": "",
                "content-type": "",
                "content-length": "",
                "connection": "",
                "access-control-allow-credentials": "",
                "access-control-allow-methods": "",
                "access-control-allow-origin": "",
                "access-control-expose-headers": "",
                "access-control-max-age": "",
                "cache-control": "",
                "request-id": "",
                "stripe-version": "",
                "strict-transport-security": "",
                "x-stripe-c-cost": ""
              },
              "requestId": "",
              "statusCode": "",
              "charge": "",
              "decline_code": "",
              "payment_intent": "",
              "payment_method": "",
              "setup_intent": "",
              "source": ""
            },
            "stripePublishableKey": "",
            "publicKey": ""
          }
        ],
        "ccOptInTime": ""
      }
    },
    //order document full object model
    {
      dbName: 'order',
      lastestSchema: {},
      fullSchema: {
        "_id": "",
        "sendNotificationOnReady": "",
        "orderItems": [
          {
            "menuName": "",
            "mcInstance": {
              "description": "",
              "name": "",
              "id": "",
              "sortOrder": "",
              "menuOptionIds": [
                ""
              ],
              "images": [
                ""
              ],
              "restaurant": "",
              "createdAt": "",
              "updatedAt": ""
            },
            "miInstance": {
              "imageObjs": [
                {
                  "originalUrl": "",
                  "thumbnailUrl": "",
                  "normalUrl": "",
                  "origin": ""
                }
              ],
              "cachedMinCost": "",
              "cachedMaxCost": "",
              "sizeOptions": [
                {
                  "name": "",
                  "price": "",
                  "selected": "",
                  "sizeId": "",
                  "id": "",
                  "groupedProductId": "",
                  "ungroupedProductId": "",
                  "__typename": "",
                  "selectionCategories": [
                    {
                      "id": "",
                      "name": "",
                      "type": "",
                      "limit": null,
                      "mandatory": false,
                      "selectionType": "",
                      "__typename": "",
                      "productTypeSelections": [
                        {
                          "id": "",
                          "selectionName": "",
                          "__typename": "",
                          "productTypeIds": [
                            ""
                          ],
                          "prices": [
                            {
                              "id": "",
                              "name": "",
                              "amount": "",
                              "position": "",
                              "__typename": ""
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ],
              "name": "",
              "description": "",
              "menuOptionIds": [
                ""
              ],
              "category": "",
              "id": "",
              "sortOrder": "",
              "price": "",
              "flavors": {
                "Spicy": "",
                "spicy": "",
                "Sweet": ""
              },
              "sizes": [
                ""
              ],
              "inventory": "",
              "itemId": "",
              "imageCandidates": [],
              "number": "",
              "images": [],
              "nonCustomizable": "",
              "promotional": "",
              "compositions": [],
              "image": "",
              "serveTimes": [
                ""
              ],
              "createdAt": "",
              "updatedAt": ""
            },
            "mcSelectedMenuOptions": [
              {
                "minCost": "",
                "maxCost": "",
                "items": [
                  {
                    "name": "",
                    "price": "",
                    "selected": "",
                    "forSize": "",
                    "placement": ""
                  }
                ],
                "maxSelection": "",
                "minSelection": "",
                "name": "",
                "description": "",
                "id": "",
                "sortOrder": "",
                "moIds": [
                  ""
                ],
                "havingSizeInfo": ""
              }
            ],
            "miSelectedMenuOptions": [
              {
                "minCost": "",
                "maxCost": "",
                "id": "",
                "name": "",
                "sortOrder": "",
                "minSelection": "",
                "maxSelection": "",
                "items": [
                  {
                    "name": "",
                    "price": "",
                    "selected": "",
                    "forSize": "",
                    "placement": ""
                  }
                ],
                "description": "",
                "moIds": [
                  ""
                ],
                "havingSizeInfo": ""
              }
            ],
            "quantity": "",
            "specialInstructions": "",
            "id": ""
          }
        ],
        "taxRate": "",
        "restaurant": "",
        "tip": "",
        "type": "",
        "deliveryCharge": "",
        "fees": [
          {
            "id": "",
            "name": "",
            "amount": "",
            "rate": "",
            "orderTypes": [
              ""
            ],
            "orderPaymentMethods": [
              ""
            ],
            "chargeBasis": "",
            "payee": ""
          }
        ],
        "runtime": {
          "standalone": "",
          "isApp": "",
          "os": "",
          "browser": "",
          "fullVersion": "",
          "majorVersion": "",
          "pwaPrompt": null,
          "appVersion": "",
          "deviceId": null,
          "deviceToken": null
        },
        "paymentObj": {
          "paymentType": "",
          "method": "",
          "payerName": "",
          "payerEmail": "",
          "stripePublishableKey": "",
          "card": {
            "last4": "",
            "cardNumber": "",
            "cvc": "",
            "firstName": "",
            "lastName": "",
            "zipCode": "",
            "expiryMonth": "",
            "expiryYear": "",
            "billingAddress": {
              "formatted_address": "",
              "place_id": "",
              "utc_offset": "",
              "vicinity": "",
              "lat": "",
              "lng": "",
              "street_number": "",
              "route": "",
              "locality": "",
              "administrative_area_level_2": "",
              "administrative_area_level_1": "",
              "country": "",
              "postal_code": "",
              "apt": "",
              "specialInstructions": "",
              "administrative_area_level_3": "",
              "postal_code_suffix": "",
              "neighborhood": "",
              "sublocality_level_1": "",
              "point_of_interest": "",
              "streetNumberUpdated": ""
            },
            "brand": "",
            "email": "",
            "address_line1": "",
            "_id": "",
            "phone": "",
            "zipcode": ""
          },
          "stripeObject": {
            "charges": [
              {
                "id": "",
                "object": "",
                "amount": "",
                "amount_captured": "",
                "amount_refunded": 0,
                "application": null,
                "application_fee": null,
                "application_fee_amount": null,
                "balance_transaction": "",
                "billing_details": {
                  "address": {
                    "city": "",
                    "country": "",
                    "line1": "",
                    "line2": "",
                    "postal_code": "",
                    "state": ""
                  },
                  "email": null,
                  "name": "",
                  "phone": null
                },
                "calculated_statement_descriptor": "",
                "captured": "",
                "created": "",
                "currency": "",
                "customer": "",
                "description": "",
                "destination": null,
                "dispute": null,
                "disputed": false,
                "failure_code": null,
                "failure_message": null,
                "fraud_details": {},
                "invoice": null,
                "livemode": "",
                "metadata": {},
                "on_behalf_of": null,
                "order": null,
                "outcome": {
                  "network_status": "",
                  "reason": null,
                  "risk_level": "",
                  "risk_score": "",
                  "seller_message": "",
                  "type": ""
                },
                "paid": "",
                "payment_intent": null,
                "payment_method": "",
                "payment_method_details": {
                  "card": {
                    "brand": "",
                    "checks": {
                      "address_line1_check": "",
                      "address_postal_code_check": "",
                      "cvc_check": ""
                    },
                    "country": "",
                    "exp_month": "",
                    "exp_year": "",
                    "fingerprint": "",
                    "funding": "",
                    "installments": null,
                    "last4": "",
                    "network": "",
                    "three_d_secure": null,
                    "wallet": {
                      "apple_pay": {},
                      "dynamic_last4": "",
                      "type": "",
                      "google_pay": {}
                    }
                  },
                  "type": ""
                },
                "receipt_email": null,
                "receipt_number": null,
                "receipt_url": "",
                "refunded": false,
                "refunds": {
                  "object": "",
                  "data": [],
                  "has_more": false,
                  "total_count": 0,
                  "url": ""
                },
                "review": null,
                "shipping": null,
                "source": {
                  "id": "",
                  "object": "",
                  "address_city": "",
                  "address_country": "",
                  "address_line1": "",
                  "address_line1_check": "",
                  "address_line2": "",
                  "address_state": "",
                  "address_zip": "",
                  "address_zip_check": "",
                  "brand": "",
                  "country": "",
                  "customer": "",
                  "cvc_check": "",
                  "dynamic_last4": "",
                  "exp_month": "",
                  "exp_year": "",
                  "fingerprint": "",
                  "funding": "",
                  "last4": "",
                  "metadata": {},
                  "name": "",
                  "tokenization_method": ""
                },
                "source_transfer": null,
                "statement_descriptor": "",
                "statement_descriptor_suffix": "",
                "status": "",
                "transfer_data": null,
                "transfer_group": null
              }
            ],
            "customer": {
              "id": "",
              "object": "",
              "account_balance": 0,
              "address": null,
              "balance": 0,
              "created": "",
              "currency": null,
              "default_source": "",
              "delinquent": false,
              "description": "",
              "discount": null,
              "email": null,
              "invoice_prefix": "",
              "invoice_settings": {
                "custom_fields": null,
                "default_payment_method": null,
                "footer": null
              },
              "livemode": "",
              "metadata": {},
              "name": null,
              "next_invoice_sequence": "",
              "phone": null,
              "preferred_locales": [],
              "shipping": null,
              "sources": {
                "object": "",
                "data": [
                  {
                    "id": "",
                    "object": "",
                    "address_city": "",
                    "address_country": "",
                    "address_line1": "",
                    "address_line1_check": "",
                    "address_line2": "",
                    "address_state": "",
                    "address_zip": "",
                    "address_zip_check": "",
                    "brand": "",
                    "country": "",
                    "customer": "",
                    "cvc_check": "",
                    "dynamic_last4": "",
                    "exp_month": "",
                    "exp_year": "",
                    "fingerprint": "",
                    "funding": "",
                    "last4": "",
                    "metadata": {},
                    "name": "",
                    "tokenization_method": ""
                  }
                ],
                "has_more": false,
                "total_count": "",
                "url": ""
              },
              "subscriptions": {
                "object": "",
                "data": [],
                "has_more": false,
                "total_count": 0,
                "url": ""
              },
              "tax_exempt": "",
              "tax_ids": {
                "object": "",
                "data": [],
                "has_more": false,
                "total_count": 0,
                "url": ""
              },
              "tax_info": null,
              "tax_info_verification": null
            },
            "refunds": [
              {
                "id": "",
                "object": "",
                "amount": "",
                "balance_transaction": "",
                "charge": "",
                "created": "",
                "currency": "",
                "metadata": {},
                "payment_intent": null,
                "reason": "",
                "receipt_number": null,
                "source_transfer_reversal": null,
                "status": "",
                "transfer_reversal": null
              }
            ],
            "stripePublishableKey": "",
            "token": {
              "id": "",
              "object": "",
              "card": {
                "id": "",
                "object": "",
                "address_city": "",
                "address_country": "",
                "address_line1": "",
                "address_line1_check": "",
                "address_line2": "",
                "address_state": "",
                "address_zip": "",
                "address_zip_check": "",
                "brand": "",
                "country": "",
                "cvc_check": "",
                "dynamic_last4": "",
                "exp_month": "",
                "exp_year": "",
                "funding": "",
                "last4": "",
                "name": "",
                "tokenization_method": "",
                "metadata": {}
              },
              "client_ip": "",
              "created": "",
              "email": "",
              "livemode": "",
              "type": "",
              "used": false
            },
            "failedRefunds": []
          },
          "publicKey": "",
          "reusePayment": {
            "method": "",
            "orderId": "",
            "last4": "",
            "brand": "",
            "publicKey": "",
            "stripePublishableKey": ""
          },
          "shippingOption": null,
          "shippingAddress": {
            "addressLine": [],
            "country": "",
            "postalCode": "",
            "recipient": "",
            "region": "",
            "city": "",
            "phone": "",
            "sortingCode": "",
            "dependentLocality": "",
            "organization": ""
          },
          "walletName": "",
          "methodName": "",
          "payerPhone": "",
          "token": {
            "id": "",
            "object": "",
            "card": {
              "id": "",
              "object": "",
              "address_city": "",
              "address_country": "",
              "address_line1": "",
              "address_line1_check": "",
              "address_line2": null,
              "address_state": "",
              "address_zip": "",
              "address_zip_check": "",
              "brand": "",
              "country": "",
              "cvc_check": "",
              "dynamic_last4": "",
              "exp_month": "",
              "exp_year": "",
              "funding": "",
              "last4": "",
              "metadata": {},
              "name": "",
              "tokenization_method": ""
            },
            "client_ip": "",
            "created": "",
            "livemode": "",
            "type": "",
            "used": false,
            "email": ""
          },
          "_id": "",
          "creditCard": "",
          "creditCardProcessingMethod": ""
        },
        "customer": "",
        "customerObj": {
          "_id": "",
          "email": "",
          "firstName": "",
          "lastName": "",
          "phone": "",
          "socialProfilePhoto": "",
          "socialProvider": "",
          "socialId": ""
        },
        "restaurantObj": {
          "_id": "",
          "alias": "",
          "name": "",
          "logo": ""
        },
        "deliveryDistance": null,
        "orderNumber": "",
        "createdAt": "",
        "statuses": [
          {
            "createdAt": "",
            "status": "",
            "updatedBy": "",
            "order": "",
            "comments": ""
          }
        ],
        "timeToDeliver": "",
        "surchargeAmount": "",
        "customerPreviousOrderStatus": {
          "order": "",
          "status": "",
          "createdAt": "",
          "updatedBy": "",
          "comments": ""
        },
        "taxOnDelivery": "",
        "surchargeName": "",
        "deliveryQuote": {
          "fromPlaceId": "",
          "toPlaceId": "",
          "response": {
            "distance": "",
            "charge": "",
            "orderMinimum": "",
            "hours": [
              {
                "occurence": "",
                "weekDays": [
                  ""
                ],
                "fromTime": "",
                "toTime": ""
              }
            ],
            "closedHours": [
              {
                "occurence": "",
                "weekDays": [
                  ""
                ],
                "fromTime": "",
                "toTime": "",
                "comment": ""
              }
            ],
            "time": "",
            "fee": "",
            "expiry": "",
            "pickupEta": "",
            "dropoffEta": "",
            "courier": {
              "_id": ""
            },
            "id": "",
            "payload": {
              "pickup_address": "",
              "dropoff_address": "",
              "pickup_ready_dt": ""
            },
            "type": "",
            "message": "",
            "headers": {
              "Access-Control-Allow-Origin": ""
            },
            "statusCode": "",
            "body": ""
          },
          "error": {
            "type": "",
            "message": "",
            "distance": "",
            "hours": [
              {
                "fromTime": "",
                "toTime": "",
                "occurence": ""
              }
            ],
            "closedHours": [
              {
                "occurence": "",
                "weekDays": [
                  ""
                ],
                "fromTime": "",
                "toTime": ""
              }
            ],
            "headers": {
              "Access-Control-Allow-Origin": ""
            },
            "statusCode": "",
            "body": ""
          },
          "timeToDeliver": ""
        },
        "address": {
          "place_id": "",
          "formatted_address": "",
          "utc_offset": "",
          "vicinity": "",
          "lat": "",
          "lng": "",
          "street_number": "",
          "route": "",
          "locality": "",
          "administrative_area_level_3": "",
          "administrative_area_level_2": "",
          "administrative_area_level_1": "",
          "country": "",
          "postal_code": "",
          "postal_code_suffix": "",
          "specialInstructions": "",
          "neighborhood": "",
          "apt": "",
          "sublocality_level_1": "",
          "point_of_interest": "",
          "streetNumberUpdated": "",
          "subpremise": "",
          "postal_code_prefix": "",
          "premise": ""
        },
        "ccProcessingFlatFee": null,
        "promotion": {
          "excludedMenuIds": [
            ""
          ],
          "excludedOrderTypes": [
            ""
          ],
          "excludedPlatforms": [],
          "now": "",
          "expiry": "",
          "public": "",
          "name": "",
          "orderMinimum": "",
          "amount": "",
          "percentage": "",
          "id": "",
          "code": "",
          "newCustomerOnly": ""
        },
        "courierId": "",
        "courierName": "",
        "restaurantNotice": "",
        "delivery": {
          "id": "",
          "quote_id": "",
          "status": "",
          "complete": false,
          "kind": "",
          "pickup": {
            "name": "",
            "phone_number": "",
            "address": "",
            "detailed_address": {
              "street_address_1": "",
              "street_address_2": "",
              "city": "",
              "state": "",
              "zip_code": "",
              "country": "",
              "sublocality_level_1": ""
            },
            "notes": "",
            "seller_notes": "",
            "location": {
              "lat": "",
              "lng": ""
            },
            "verification": null,
            "verification_requirements": {
              "signature": false,
              "pincodes": null,
              "barcodes": [],
              "package": null,
              "identification": null,
              "picture": false
            }
          },
          "dropoff": {
            "name": "",
            "phone_number": "",
            "address": "",
            "detailed_address": {
              "street_address_1": "",
              "street_address_2": "",
              "city": "",
              "state": "",
              "zip_code": "",
              "country": "",
              "sublocality_level_1": ""
            },
            "notes": "",
            "seller_notes": "",
            "location": {
              "lat": "",
              "lng": ""
            },
            "verification": null,
            "verification_requirements": {
              "signature": false,
              "pincodes": null,
              "barcodes": [],
              "package": null,
              "identification": null,
              "picture": false
            }
          },
          "manifest": {
            "reference": "",
            "description": "",
            "total_value": null
          },
          "manifest_items": [],
          "created": "",
          "updated": "",
          "pickup_ready": "",
          "pickup_deadline": "",
          "dropoff_ready": "",
          "dropoff_deadline": "",
          "pickup_eta": "",
          "dropoff_eta": "",
          "related_deliveries": [],
          "fee": "",
          "currency": "",
          "tip": null,
          "dropoff_identifier": "",
          "tracking_url": "",
          "undeliverable_action": null,
          "courier_imminent": false,
          "courier": {
            "name": "",
            "location": {
              "lat": "",
              "lng": ""
            },
            "img_href": "",
            "phone_number": "",
            "rating": "",
            "vehicle_type": ""
          },
          "live_mode": "",
          "undeliverable_reason": null,
          "uuid": "",
          "fences": [],
          "external_id": "",
          "updates": [
            {
              "created": "",
              "id": "",
              "kind": "",
              "status": ""
            }
          ],
          "canceledAt": "",
          "isCanceled": ""
        },
        "specialInstructions": "",
        "taxBeforePromotion": "",
        "surchargeRate": null,
        "logs": [
          {
            "time": "",
            "action": "",
            "target": "",
            "copies": "",
            "result": "",
            "username": ""
          }
        ],
        "updatedAt": "",
        "ccProcessingRate": null,
        "muteFirstNotifications": "",
        "courierIdOld": "",
        "customerNotice": "",
        "restaurantNotie": ""
      }
    },
    //restaurant document full object model
    {
      dbName: 'restaurant',
      lastestSchema: {},
      fullSchema: {
        "_id": "",
        "name": "",
        "googleAddress": {
          "place_id": "",
          "formatted_address": "",
          "lat": "",
          "lng": "",
          "street_number": "",
          "route": "",
          "locality": "",
          "administrative_area_level_2": "",
          "administrative_area_level_1": "",
          "country": "",
          "postal_code": "",
          "postal_code_suffix": "",
          "timezone": "",
          "political": "",
          "administrative_area_level_3": "",
          "neighborhood": "",
          "subpremise": "",
          "apt": "",
          "line1": "",
          "zipCode": "",
          "city": "",
          "state": "",
          "_id": "",
          "createdAt": "",
          "updatedAt": "",
          "sublocality_level_1": "",
          "premise": "",
          "establishment": "",
          "line2": "",
          "postal_town": ""
        },
        "googleListing": {
          "place_id": "",
          "rating": null,
          "totalReviews": "",
          "gmbVerified": false,
          "gmbOpen": "",
          "closed": "",
          "name": "",
          "crawledAt": "",
          "gmbWebsite": "",
          "orderPickupButton": "",
          "orderDeliveryButton": "",
          "gmbOwner": "",
          "noDineIn": "",
          "noDelivery": "",
          "cuisine": "",
          "address": "",
          "cid": "",
          "menuUrls": [
            ""
          ],
          "reservations": [
            ""
          ],
          "serviceProviders": [
            ""
          ],
          "phone": "",
          "zipMatched": "",
          "phoneMatched": "",
          "numberMatched": "",
          "suggestedWebsite": "",
          "noTakeout": ""
        },
        "channels": [
          {
            "notifications": [
              ""
            ],
            "value": "",
            "type": ""
          }
        ],
        "alias": "",
        "rateSchedules": [
          {
            "agent": "",
            "date": "",
            "rate": "",
            "fixed": "",
            "commission": "",
            "orderType": "",
            "id": ""
          }
        ],
        "web": {
          "bizManagedWebsite": "",
          "disableAutoTask": "",
          "qmenuWebsite": "",
          "injectedAt": "",
          "templateName": "",
          "agreeToCorporate": "",
          "ignoreGmbOwnershipRequest": "",
          "useBizWebsiteForAll": "",
          "useBizMenuUrl": "",
          "menuUrl": "",
          "useBizOrderAheadUrl": "",
          "orderAheadUrl": "",
          "useBizWebsite": "",
          "qmenuPop3Password": "",
          "qmenuExclusive": "",
          "old_qmenuWebsite": "",
          "template": {
            "name": "",
            "navbar": {
              "links": [
                {
                  "label": "",
                  "url": ""
                }
              ]
            },
            "headerSlider": [
              ""
            ],
            "specialties": [
              ""
            ],
            "promos": [
              ""
            ]
          },
          "reservationUrl": "",
          "useBizReservationUrl": ""
        },
        "createdAt": "",
        "updatedAt": "",
        "taxRate": "",
        "pickupTimeEstimate": "",
        "deliveryTimeEstimate": "",
        "images": [
          ""
        ],
        "preferredLanguage": "",
        "notes": "",
        "serviceSettings": [
          {
            "name": "",
            "paymentMethods": [
              ""
            ],
            "paymentMethodsBackup": [
              ""
            ],
            "tipSuggestion": {
              "rate": ""
            }
          }
        ],
        "people": [
          {
            "title": "",
            "name": "",
            "roles": [
              ""
            ],
            "channels": [
              {
                "type": "",
                "value": "",
                "index": "",
                "notifications": [
                  ""
                ]
              }
            ]
          }
        ],
        "paymentMeans": [
          {
            "details": {
              "memo": "",
              "routingNumber": "",
              "accountNumber": "",
              "name": "",
              "address": "",
              "cardNumber": "",
              "expiry": "",
              "cvc": ""
            },
            "direction": "",
            "type": ""
          }
        ],
        "logs": [
          {
            "problem": "",
            "response": "",
            "resolved": "",
            "time": "",
            "username": "",
            "relatedOrders": "",
            "callerName": "",
            "callerPhone": "",
            "adjustmentAmount": "",
            "adjustmentReason": "",
            "type": ""
          }
        ],
        "surchargeAmount": "",
        "surchargeName": "",
        "deliverySettings": [
          {
            "distance": "",
            "orderMinimum": "",
            "charge": ""
          }
        ],
        "muteFirstNotifications": "",
        "muteSecondNotifications": "",
        "gmbOwnerHistory": [
          {
            "time": "",
            "gmbOwner": "",
            "gmbWebsite": ""
          }
        ],
        "isDirectSignUp": "",
        "requireZipcode": "",
        "requireBillingAddress": "",
        "feeSchedules": [
          {
            "payer": "",
            "payee": "",
            "fromTime": "",
            "name": "",
            "chargeBasis": "",
            "id": "",
            "rate": "",
            "amount": "",
            "toTime": "",
            "orderPaymentMethods": [],
            "orderTypes": [
              ""
            ]
          }
        ],
        "courier": {
          "_id": "",
          "name": ""
        },
        "gmbSettings": {
          "syncCategories": {
            "HOURS": {
              "on": ""
            }
          }
        },
        "diagnostics": [
          {
            "time": "",
            "result": [
              {
                "name": "",
                "errors": [
                  ""
                ]
              }
            ]
          }
        ],
        "crm": "",
        "score": "",
        "scoreAt": "",
        "menus": [
          {
            "hours": [
              {
                "occurence": "",
                "weekDays": [
                  ""
                ],
                "fromTime": "",
                "toTime": "",
                "occurrence": ""
              }
            ],
            "mcs": [
              {
                "mis": [
                  {
                    "imageObjs": [
                      {
                        "originalUrl": "",
                        "thumbnailUrl": "",
                        "normalUrl": "",
                        "origin": ""
                      }
                    ],
                    "cachedMinCost": "",
                    "cachedMaxCost": "",
                    "sizeOptions": [
                      {
                        "name": "",
                        "price": "",
                        "selected": "",
                        "sizeId": "",
                        "id": ""
                      }
                    ],
                    "id": "",
                    "name": "",
                    "category": "",
                    "description": "",
                    "sortOrder": "",
                    "disabled": "",
                    "price": "",
                    "flavors": {
                      "Spicy": "",
                      "spicy": ""
                    },
                    "menuOptionIds": [
                      ""
                    ],
                    "itemId": "",
                    "inventory": null,
                    "imageCandidates": [],
                    "sizes": [
                      ""
                    ],
                    "image": "",
                    "number": "",
                    "nonCustomizable": "",
                    "compositions": []
                  }
                ],
                "id": "",
                "name": "",
                "sortOrder": "",
                "description": "",
                "images": [
                  ""
                ],
                "menuOptionIds": [
                  ""
                ],
                "disabled": ""
              }
            ],
            "name": "",
            "id": "",
            "backgroundImageUrl": "",
            "nontaxable": "",
            "popularMiIds": [
              ""
            ],
            "disabled": "",
            "description": ""
          }
        ],
        "menuOptions": [
          {
            "minCost": "",
            "maxCost": "",
            "name": "",
            "sortOrder": "",
            "minSelection": "",
            "maxSelection": "",
            "items": [
              {
                "name": "",
                "price": "",
                "forSize": ""
              }
            ],
            "moIds": [
              ""
            ],
            "id": "",
            "description": "",
            "havingSizeInfo": ""
          }
        ],
        "closedHours": [
          {
            "occurence": "",
            "weekDays": [
              ""
            ],
            "fromTime": "",
            "toTime": "",
            "comment": ""
          }
        ],
        "yelpListing": {
          "url": "",
          "urlAssignedAt": "",
          "crawledAt": "",
          "yid": "",
          "phoneMatched": "",
          "streetNumberMatched": "",
          "zipCodeMatched": "",
          "categories": [
            {
              "id": "",
              "name": ""
            }
          ],
          "review_count": "",
          "rating": "",
          "price_range": "",
          "name": "",
          "phone": "",
          "location": {
            "city": "",
            "zip_code": "",
            "country": "",
            "state": "",
            "street": ""
          },
          "website": "",
          "claimedStatus": "",
          "updatedAt": "",
          "alias": "",
          "gmb_email": ""
        },
        "cuisine": [
          ""
        ],
        "gmbOrigin": {
          "time": "",
          "status": "",
          "firstStatus": "",
          "origin": "",
          "cid": "",
          "place_id": "",
          "email": "",
          "_id": "",
          "taskId": "",
          "taskAssignee": ""
        },
        "previousRestaurantId": "",
        "taxOnDelivery": "",
        "domain": "",
        "ccProcessingRate": null,
        "ccProcessingFlatFee": null,
        "deliveryEndMinutesBeforeClosing": "",
        "salesBase": "",
        "health": [
          {
            "domain": "",
            "status": "",
            "isQmenu": "",
            "gmbWebsite": "",
            "isAwsDomain": "",
            "isGodaddyDomain": "",
            "qmenuWebsite": ""
          }
        ],
        "blockedCities": [
          ""
        ],
        "blockedZipCodes": [
          ""
        ],
        "address": {
          "place_id": "",
          "formatted_address": "",
          "lat": "",
          "lng": "",
          "street_number": "",
          "route": "",
          "locality": "",
          "administrative_area_level_3": "",
          "administrative_area_level_2": "",
          "administrative_area_level_1": "",
          "country": "",
          "postal_code": "",
          "line1": "",
          "zipCode": "",
          "city": "",
          "state": "",
          "neighborhood": "",
          "postal_code_suffix": "",
          "_id": "",
          "createdAt": "",
          "updatedAt": "",
          "apt": "",
          "line2": ""
        },
        "restaurantId": "",
        "closedDays": [
          {
            "id": "",
            "date": "",
            "occurence": "",
            "comment": ""
          }
        ],
        "invoices": [],
        "promotions": [
          {
            "excludedMenuIds": [
              ""
            ],
            "excludedOrderTypes": [
              ""
            ],
            "excludedPlatforms": [],
            "now": "",
            "expiry": "",
            "public": "",
            "name": "",
            "code": "",
            "amount": "",
            "orderMinimum": "",
            "percentage": "",
            "id": "",
            "newCustomerOnly": ""
          }
        ],
        "email": "",
        "logo": null,
        "phones": [
          {
            "phoneNumber": "",
            "callable": false,
            "faxable": "",
            "textable": "",
            "type": "",
            "restaurant": "",
            "createdAt": "",
            "updatedAt": "",
            "id": "",
            "_id": ""
          }
        ],
        "error": {
          "headers": {
            "normalizedNames": {},
            "lazyUpdate": null,
            "headers": {}
          },
          "status": 0,
          "statusText": "",
          "url": null,
          "ok": false,
          "name": "",
          "message": "",
          "error": {
            "isTrusted": ""
          }
        },
        "serviceTypes": [
          ""
        ],
        "deliveryClosedHours": [
          {
            "occurence": "",
            "fromTime": "",
            "toTime": "",
            "weekDays": [
              ""
            ]
          }
        ],
        "notification": "",
        "printSettings": {
          "useNewSettings": ""
        },
        "deliveryHours": [
          {
            "occurence": "",
            "weekDays": [
              ""
            ],
            "fromTime": "",
            "toTime": ""
          }
        ],
        "excludeAmex": "",
        "customizedRenderingStyles": "",
        "pickupMinimum": "",
        "ccMinimumCharge": "",
        "excludeDiscover": "",
        "menusInput": {
          "time": "",
          "result": "",
          "url": ""
        },
        "hideTipInput": "",
        "skipImageInjection": "",
        "deliveryFromTime": null,
        "paymentTypes": [
          ""
        ],
        "creditCardProcessingMethod": ""
      }
    }
  ];

  constructor() { }

  ngOnInit() {
    this.isCopiedToClipboard = false;
  }

}
