import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-schemas',
  templateUrl: './schemas.component.html',
  styleUrls: ['./schemas.component.css']
})
export class SchemasComponent implements OnInit {
  schemas =[{
    dbName: 'restaurant',
    lastestSchema: {},
    fullSchema: {
      "_id": "",
      "sendNotificationOnReady": "",
      "orderItems": [
        {
          "menuName": "",
          "mcInstance": {
            "sortOrder": "",
            "name": "",
            "id": "",
            "images": [],
            "description": "",
            "menuOptionIds": [
              ""
            ],
            "disabled": ""
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
                "sizeId": "",
                "selected": ""
              }
            ],
            "name": "",
            "description": "",
            "itemId": "",
            "id": "",
            "category": "",
            "inventory": "",
            "flavors": {
              "Spicy": ""
            },
            "menuOptionIds": [
              ""
            ]
          },
          "mcSelectedMenuOptions": [
            {
              "minCost": "",
              "maxCost": "",
              "name": "",
              "description": "",
              "items": [
                {
                  "name": "",
                  "price": "",
                  "selected": ""
                }
              ],
              "minSelection": "",
              "maxSelection": "",
              "id": ""
            }
          ],
          "miSelectedMenuOptions": [
            {
              "minCost": "",
              "maxCost": "",
              "name": "",
              "description": "",
              "items": [
                {
                  "name": "",
                  "price": "",
                  "selected": ""
                }
              ],
              "minSelection": "",
              "maxSelection": "",
              "id": ""
            }
          ],
          "quantity": "",
          "specialInstructions": "",
          "id": ""
        }
      ],
      "taxRate": "",
      "tip": "",
      "type": "",
      "deliveryCharge": "",
      "fees": [
        {
          "id": "",
          "name": "",
          "amount": "",
          "rate": "",
          "orderTypes": [],
          "orderPaymentMethods": [],
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
        "pwaPrompt": "",
        "appVersion": "",
        "deviceId": "",
        "deviceToken": ""
      },
      "paymentObj": {
        "paymentType": "",
        "method": ""
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
        "socialId": "",
        "bannedReasons": [
          ""
        ]
      },
      "restaurant": "",
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
          "order": "",
          "status": "",
          "createdAt": "",
          "updatedBy": ""
        }
      ],
      "taxOnDelivery": "",
      "taxBeforePromotion": "",
      "timeToDeliver": "",
      "customerNotice": ""
    }
  }
  ];
  constructor() { }

  ngOnInit() {

  }

}
