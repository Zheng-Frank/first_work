import { Component, OnInit } from "@angular/core";
import * as csvtojsonV2 from "csvtojson";
import { ViewChild, ElementRef } from "@angular/core";
import { environment } from "src/environments/environment";
import { ApiService } from "src/app/services/api.service";

import { v4 as uuidv4 } from "uuid";

@Component({
  selector: "app-seamless-integration",
  templateUrl: "./seamless-integration.component.html",
  styleUrls: ["./seamless-integration.component.css"],
})
export class SeamlessIntegrationComponent implements OnInit {
  style = "English";
  fileList;
  sendSingleRTSuccess;
  sendSingleRTFail;
  sendSingleLobSuccess;
  sendSingleLobFail;
  successEveryLobCount = 0;
  failEveryLobCount = 0;
  csvContent: string[];
  postCardsSentSuccess = false;
  sendSinglePostcard = false;
  failLobRestaurants = [];
  successLobRestaurants = [];
  postCardsSentFail = false;
  designatePostcard: boolean = false;
  progressAndCompleted;
  beforeCsvLength: number;
  afterCsvLength: number;
  agentAnalytics;
  invalidFormat: boolean = false;
  currentlyUploading: boolean = false;
  entriesLength: number;
  rowsProcessed: number;
  singleRestaurantId;
  people;
  currentRestaurants = [];
  allRestaurants: any;
  progressRestaurants;
  progressRestaurantIds: any;
  completedRestaurantsIds: string[];
  unopenedRestaurants: string[];
  unopenedRestaurantIds;
  processedLength: number;
  currentPagination: number = 1;
  markAsPostCardSent: boolean = false;
  seamlessEvents;
  lobEvents;
  currentCriteria: string = "All";
  ownerNames: string[];
  sendPostCards = [];
  lobHistory = [];
  failLobCount;
  successLobCount;

  readonly VAPID_PUBLIC_KEY =
    "BIgJiFe6Y_nxJPFTM9bvEJGWduQbjtRrn7dXJa_vef9uZrowP4YyMTLZP15DrkLjsYLlLAFz519PUMpPFq-THwI";

  @ViewChild("fileInput") myInputVariable: ElementRef;

  constructor(private _api: ApiService) {}

  // subscribeToNotifications() {
  //   this.swPush
  //     .requestSubscription({
  //       serverPublicKey: this.VAPID_PUBLIC_KEY,
  //     })
  //     .then((sub) => this.newsletterService.addPushSubscriber(sub).subscribe())
  //     .catch((err) =>
  //       console.error("Could not subscribe to notifications", err)
  //     );
  // }
  reset() {
    this.resetCsvInformation();
    this.successEveryLobCount = 0;
    this.failEveryLobCount = 0;
    this.invalidFormat = false;
    this.myInputVariable.nativeElement.value = "";
  }
  log(val) {
    // // console.log(val);
  }

  selectStyle(style) {
    this.style = style;
  }

  getPostCardsToFire(id) {
    return this.sendPostCards.some((postCard) => postCard.id === id);
    // Api call
  }
  getSinglePostcard() {
    return this.sendSinglePostcard;
  }

  toggleSendSinglePostcard() {
    this.sendSinglePostcard = !this.sendSinglePostcard;
  }
  async firePostCards() {
    console.log("FIRE POSTCARDS");

    //dynanmic
    // // console.log("POSTCARDS", this.sendPostCards);
    // Insert restaurant properties into name address
    let successCount = 0;
    for (let i = 0; i < this.sendPostCards.length; i++) {
      // console.log("CODE", this.sendPostCards[i].code);

      // const backUrl =
      //   "http://b70f6f0ad523.ngrok.io/postcard.html?code=abcdef&style=Chinese&side=back";
      // const frontUrl =
      //   "http://b70f6f0ad523.ngrok.io/postcard.html?code=abcdef&style=Chinese&side=front";
      console.log("FIRE POSTCARDS");
      console.log(this.sendPostCards[i]);
      try {
        let sendResult = await this._api
          .post(environment.appApiUrl + "utils/send-postcard", {
            name: this.sendPostCards[i].name,
            address: this.sendPostCards[i].address,
            frontUrl: `https://08znsr1azk.execute-api.us-east-1.amazonaws.com/dev/render-url?url=https%3A%2F%2Fsignup.qmenu.com%2Fpostcard.html%3Fcode%3D${encodeURIComponent(
              this.sendPostCards[i].code
            )}%26side%3Dfront%26style%3d${this.style}&format=jpg`,
            backUrl: `https://08znsr1azk.execute-api.us-east-1.amazonaws.com/dev/render-url?url=https%3A%2F%2Fsignup.qmenu.com%2Fpostcard.html%3Fcode%3D${encodeURIComponent(
              this.sendPostCards[i].code
            )}%26side%3Dback%26style%3d${this.style}&format=jpg`,
          })
          .toPromise();

        sendResult = {
          ...sendResult,
          restaurantId: this.sendPostCards[i].restaurantId,
        };
        console.log("LOB POST CARD ", sendResult);
        this.successLobRestaurants.push(this.sendPostCards[i].name);

        this.createLobAnalytic(sendResult);

        try {
          await this._api
            .patch(environment.qmenuApiUrl + "generic?resource=restaurant", [
              {
                old: {
                  _id: this.sendPostCards[i].restaurantId,
                  selfSignup: {},
                },
                new: {
                  _id: this.sendPostCards[i].restaurantId,
                  selfSignup: { postcardSent: true },
                },
              },
            ])
            .toPromise();
        } catch (e) {
          // console.log("FAILED TO PATCH RESTAURANT");
        }
        successCount += 1;
      } catch (e) {
        this.failLobRestaurants.push(this.sendPostCards[i].name);

        console.log("FAILED TO CREATE LOB OBJECT", e);
      }
    }
    // console.log("LOB SUCCESS", this.successLobRestaurants);
    // console.log("LOB FAIL", this.failLobRestaurants);
    this.successLobCount = successCount;
    this.failLobCount = this.sendPostCards.length - successCount;
    this.sendPostCards = [];

    // console.log("SUCCESS LOB COUNT ", this.successLobCount);
    // console.log("FAIL LOB COUNT ", this.failLobCount);
    if (
      this.successLobRestaurants.length > 0 &&
      this.failLobRestaurants.length > 0
    ) {
      this.postCardsSentSuccess = true;
      this.postCardsSentFail = true;

      setTimeout(() => {
        this.postCardsSentSuccess = false;
        this.postCardsSentFail = false;
        this.successLobRestaurants = [];
        this.failLobRestaurants = [];
        this.successLobCount = 0;
        this.failLobCount = 0;
      }, 7000);

      this.reload();
    } else if (this.successLobRestaurants.length > 0) {
      this.postCardsSentSuccess = true;
      setTimeout(() => {
        this.postCardsSentSuccess = false;
        this.successLobRestaurants = [];
        this.successLobCount = 0;
        this.failLobCount = 0;
      }, 7000);
      this.reload();
    } else if (this.failLobRestaurants.length > 0) {
      this.postCardsSentFail = true;
      setTimeout(() => {
        this.postCardsSentFail = false;
        this.failLobRestaurants = [];
        this.successLobCount = 0;
        this.failLobCount = 0;
      }, 7000);
      this.reload();
    } else {
      this.reload();
    }
  }

  async patchPostCard(val, restaurantId) {
    this.currentRestaurants.forEach((restaurant) => {
      // console.log("CODE IS ", restaurant.selfSignup.code);
      let code = restaurant.selfSignup.code;
      if (restaurant._id === restaurantId) {
        // if the postcard already exists, remove it from the array, else add it

        if (
          this.sendPostCards.some(
            (postcard) => postcard.restaurantId === restaurantId
          )
        ) {
          // console.log("TRUE!");
          this.sendPostCards = this.sendPostCards.filter(
            (postcard) => postcard.restaurantId !== restaurantId
          );
        } else {
          this.sendPostCards.push({
            restaurantId,
            name: restaurant.name,
            address: restaurant.googleAddress.formatted_address,
            code,
          });
        }
      }
    });
    console.log("POSTCARDS", this.sendPostCards);
  }

  markAsPostCardSentFlag() {
    this.markAsPostCardSent = !this.markAsPostCardSent;
    // // console.log(this.markAsPostCardSent);
  }

  designatePostcardFlag() {
    this.designatePostcard = !this.designatePostcard;
    // // console.log(this.designatePostcard);
  }

  toggleAnalytic(id) {
    for (let i = 0; i < this.currentRestaurants.length; i++) {
      if (this.currentRestaurants[i]._id === id) {
        this.currentRestaurants[i].showAnalytics = !this.currentRestaurants[i]
          .showAnalytics;
      }
    }
  }

  getAnalyticBoolean(id) {
    for (let i = 0; i < this.currentRestaurants.length; i++) {
      if (this.currentRestaurants[i]._id === id) {
        return this.currentRestaurants[i].showAnalytics;
      }
    }
  }

  async ngOnInit() {
    try {
      const selfSignupRestaurants = await this._api
        .get(environment.qmenuApiUrl + "generic", {
          resource: "restaurant",
          query: { selfSignup: { $exists: true } },
          limit: 100000,
        })
        .toPromise();
      this.allRestaurants = selfSignupRestaurants;
      this.allRestaurants.map((restaurant) => {
        restaurant.showAnalytics = false;
        restaurant.showSendHistory = false;
        return restaurant;
      });
      // console.log(selfSignupRestaurants);
      this.entriesLength = selfSignupRestaurants.length;
      this.beforeCsvLength = selfSignupRestaurants.length;
      this.currentRestaurants = selfSignupRestaurants;
      this.currentRestaurants.map((restaurant) => {
        restaurant.showAnalytics = false;
        return restaurant;
      });
      // // console.log("CURRENT RESTAURANTS", this.currentRestaurants);
    } catch (e) {
      // console.log("FAILURE RETRIEVING RESTAURANTS", e);
    }

    try {
      const events = await this._api
        .get(environment.qmenuApiUrl + "generic", {
          resource: "analytics-event",
          query: { src: "self-signup" },
          limit: 100000,
        })
        .toPromise();
      this.seamlessEvents = events;
      // // console.log("SEAMLESSEVENTS ", this.seamlessEvents);

      this.filterRestaurantsCriteria();

      // // console.log("THESE ARE EVENTS", events);
    } catch (e) {
      // console.log("EVENT FAIL", e);
    }

    try {
      const events = await this._api
        .get(environment.qmenuApiUrl + "generic", {
          resource: "analytics-event",
          query: { src: "lob-admin" },
          limit: 100000,
        })
        .toPromise();
      this.lobEvents = events;
      // console.log("EVENTS ", this.seamlessEvents);
    } catch (e) {
      // console.log("FAILED LOB EVENTS GETTER");
    }

    try {
      let peopleArr = await this._api
        .get(environment.qmenuApiUrl + "generic", {
          resource: "restaurant",
          query: { selfSignup: { $exists: true } },
          projection: {
            people: 1,
          },
          limit: 1000,
        })
        .toPromise();

      this.people = peopleArr
        .map((obj) => {
          if ("people" in obj) {
            let owner = false;
            let ownerName = "";
            obj.people.forEach((person) => {
              if (person.roles.includes("Owner")) {
                owner = true;
                ownerName = person.name;
              }
            });
            return {
              id: obj._id,
              ownerName,
            };
          }
        })
        .filter((el) => el != undefined);
    } catch (e) {
      // console.log("ERROR GETTING OWNER NAMES", e);
    }
  }

  markAsPostCardFalse() {
    this.markAsPostCardSent = false;
  }
  handleClick() {
    document.getElementById("upload-file").click();
  }

  getAnalytic(id) {
    // console.log("AGENT CONSOLE");

    // // console.log("ANALYTICS IN FORM FILTER", this.seamlessEvents);
    const eventOutput = {
      id: "N/A",
      source: "N/A",
      formStarted: false,
      previewMenuOpened: false,
      ownerName: "N/A",
      ownerPhone: "N/A",
      alternateNumber: "N/A",
      placedTestOrder: false,
      formComplete: false,
      wentToBizPortal: false,
    };
    if (this.seamlessEvents) {
      // console.log("EVENTS LENGTH", this.seamlessEvents.length);
    } else {
      // console.log("NO EVENTS IN getAnalytic");
    }
    this.seamlessEvents.forEach((event) => {
      if (event.restaurantId === id) {
        eventOutput.id = "id";
        eventOutput.formStarted = true;
        if (event.signUpType === "nonPromo") {
          event.source = "Non Promo";
        }
        if (event.signUpType === "Promo") {
          event.source = "Promo";
        }
        if (event.menuOpened) {
          eventOutput.previewMenuOpened = true;
        }

        if (event.ownerPhone) {
          eventOutput.ownerPhone = event.ownerPhone;
        }
        if (event.ownerName) {
          eventOutput.ownerName = event.ownerName;
        }
        if (event.alternateNumber) {
          // console.log("EVENT ALTERNATE NUMBER", event.alternateNumber);
          eventOutput.alternateNumber = event.alternateNumber;
        }
        if (event.placedTestOrder) {
          eventOutput.placedTestOrder = true;
        }
        if (event.formComplete) {
          eventOutput.formComplete = true;
        }
        if (event.wentToBizPortal) {
          eventOutput.wentToBizPortal = true;
        }
      }
    });

    return eventOutput;
  }

  getPreview(code) {
    return `https://08znsr1azk.execute-api.us-east-1.amazonaws.com/dev/render-url?url=https%3A%2F%2Fsignup.qmenu.com%2Fpostcard.html%3Fcode%3D${code}%26side%3Dback%26style%3d${this.style}&format=jpg`;
  }

  getOwner(id) {
    for (let i = 0; i < this.people.length; i++) {
      if (this.people[i].id === id) {
        return this.people[i].ownerName;
      }
    }
  }

  addFileList(files: FileList) {
    this.fileList = files;
  }

  addAttachment() {
    let files = this.fileList;
    if (files && files.length > 0) {
      let file: File = files.item(0);

      let reader: FileReader = new FileReader();
      reader.readAsText(file);
      reader.onload = async (e) => {
        let csv: string = reader.result as string;
        let csvRows = await csvtojsonV2({
          noheader: true,
          output: "csv",
        }).fromString(csv);

        if (csvRows[0].length != 2) {
          this.invalidFormat = true;
          return;
        }
        csvRows = csvRows.slice(1);
        if (csvRows.length === 0) {
          this.invalidFormat = true;
          return;
        }
        // csvRows.length = 1;
        const importData = async () => {
          this.currentlyUploading = true;
          this.processedLength = csvRows.length;
          for (let row of csvRows) {
            this.invalidFormat = false;
            let q = `${row[0]}, ${row[1]}`;
            try {
              const crawledResult = await this._api
                .post(
                  environment.appApiUrl +
                    "utils/find-or-create-restaurant-by-gmb",
                  { q }
                )
                .toPromise();
              // console.log(crawledResult);
              let restaurantId = crawledResult[0]._id;

              if (this.designatePostcard) {
                // send LOB response'
                // const backUrl =
                //   "http://bf1651968fee.ngrok.io/postcard.html?code=abcdef&style=Chinese&side=back";
                // const frontUrl =
                //   "http://bf1651968fee.ngrok.io/postcard.html?code=abcdef&style=Chinese&side=front";
                //   frontUrl: `https://08znsr1azk.execute-api.us-east-1.amazonaws.com/dev/render-url?url=${encodeURIComponent(
                // frontUrl
                // )}&format=jpg`,

                try {
                  let lobObj = await this._api
                    .post(environment.appApiUrl + "utils/send-postcard", {
                      name: crawledResult[0].name,
                      address: crawledResult[0].googleAddress.formatted_address,
                      frontUrl: `https://08znsr1azk.execute-api.us-east-1.amazonaws.com/dev/render-url?url=https%3A%2F%2Fsignup.qmenu.com%2Fpostcard.html%3Fcode%3D${encodeURIComponent(
                        crawledResult[0].selfSignup.code
                      )}%26side%3Dfront%26style%3d${this.style}&format=jpg`,
                      backUrl: `https://08znsr1azk.execute-api.us-east-1.amazonaws.com/dev/render-url?url=https%3A%2F%2Fsignup.qmenu.com%2Fpostcard.html%3Fcode%3D${encodeURIComponent(
                        crawledResult[0].selfSignup.code
                      )}%26side%3Dback%26style%3d${this.style}&format=jpg`,
                    })
                    .toPromise();
                  lobObj = { ...lobObj, restaurantId };
                  this.createLobAnalytic(lobObj);
                  this.successEveryLobCount += 1;
                } catch (e) {
                  this.failEveryLobCount += 1;
                  // console.log("ONE EVERY LOB FAILED ", e);
                }
              }
              await this._api
                .patch(
                  environment.qmenuApiUrl + "generic?resource=restaurant",
                  [
                    {
                      old: { _id: restaurantId, selfSignup: {} },
                      new: {
                        _id: restaurantId,
                        selfSignup: { postcardSent: true },
                      },
                    },
                  ]
                )
                .toPromise();
            } catch (error) {
              // console.log("IMPORTING FAILED ", error);
            }
          }
        };

        try {
          await importData();
          // // console.log(
          //   `WE SUCCESSFULLY SENT POSTCARDS TO ${this.successEveryLobCount}`);
          this.currentlyUploading = false;
          const selfSignupRestaurantsAfter = await this._api
            .get(environment.qmenuApiUrl + "generic", {
              resource: "restaurant",
              query: { selfSignup: { $exists: true } },
              limit: 100000,
            })
            .toPromise();
          this.afterCsvLength = selfSignupRestaurantsAfter.length;
          this.rowsProcessed = this.afterCsvLength - this.beforeCsvLength;
          this.currentRestaurants = selfSignupRestaurantsAfter;
          // // console.log(`We imported ${this.rowsProcessed} restaurants`);
        } catch (e) {
          // console.log("import failed");
        }
      };
    }
  }
  setPreviousPagination() {
    this.currentPagination += 1;
  }
  setNextPagination() {
    this.currentPagination -= 1;
  }
  setPagination(num: number) {
    this.currentPagination = num;
  }

  async resetCsvInformation() {
    // console.log("I am here");
    this.rowsProcessed = null;
    const selfSignupRestaurants = await this._api
      .get(environment.qmenuApiUrl + "generic", {
        resource: "restaurant",
        query: { selfSignup: { $exists: true } },
        limit: 100000,
      })
      .toPromise();
    this.beforeCsvLength = selfSignupRestaurants.length;
  }

  toggleSendHistory(id) {
    // console.log("ID ", id);
    // console.log(this.currentRestaurants);
    for (let i = 0; i < this.currentRestaurants.length; i++) {
      if (this.currentRestaurants[i]._id === id) {
        this.currentRestaurants[i].showSendHistory = !this.currentRestaurants[i]
          .showSendHistory;
      }
    }
  }

  getSendHistoryBoolean(id) {
    for (let i = 0; i < this.currentRestaurants.length; i++) {
      if (this.currentRestaurants[i]._id === id) {
        // // console.log(this.currentRestaurants[i].showSendHistory);
        return this.currentRestaurants[i].showSendHistory;
      }
    }
  }

  getSendHistory(id) {
    let sendHistory = [];
    // console.log(sendHistory);
    this.lobEvents.forEach((event) => {
      if (event.restaurantId === id) {
        // console.log(event);
        // // console.log("MATCHED ", event);
        if (event.date_created) {
          let sendDate = new Date(event.date_created).toUTCString();
          let url = event.url;
          // console.log("MATCHED ", event.restaurantId);
          // sendHistory.push(sendDate);
          sendHistory.push({ sendDate, url });
        }
      }
    });
    let res;
    sendHistory.length > 0 ? (res = sendHistory) : (res = "");
    return res;
  }

  async reload() {
    this.ngOnInit();
    this.currentCriteria = "All";
    this.currentPagination = 1;
  }

  async showAll() {
    this.currentCriteria = "All";
    this.currentRestaurants = await this._api
      .get(environment.qmenuApiUrl + "generic", {
        resource: "restaurant",
        query: { selfSignup: { $exists: true } },
        limit: 100000,
      })
      .toPromise();
    this.currentPagination = 1;
    this.filterRestaurantsCriteria();
  }

  async showProgress() {
    this.currentCriteria = "Progress";
    this.currentPagination = 1;
    // // console.log("Progress RESTAURANT IDS", this.progressRestaurantIds);
    this.currentRestaurants = this.allRestaurants.filter((restaurant) => {
      return this.progressRestaurantIds.includes(restaurant._id);
    });
  }
  showCompleted() {
    this.currentCriteria = "Completed";
    this.currentPagination = 1;
    // // console.log("COMPLETED RESTAURANT IDS", this.completedRestaurantsIds);
    // console.log("HERE ");
    this.currentRestaurants = this.allRestaurants.filter((restaurant) => {
      return this.completedRestaurantsIds.includes(restaurant._id);
    });
    // console.log("CURRENT COMPLETED RESTAURANTS", this.currentRestaurants);
  }
  showUnopened() {
    this.currentCriteria = "Unopened";
    this.currentRestaurants = this.unopenedRestaurants;
    this.currentPagination = 1;
    // analytics query of all analytics with restaurantId and
  }

  filterRestaurantsCriteria() {
    // // console.log("ANALYTICS IN FORM FILTER", this.seamlessEvents);
    let completedRestaurants = this.seamlessEvents.filter((analytic) => {
      return "formComplete" in analytic;
    });
    // // console.log("COMPLETED RESTAURANTS", completedRestaurants);
    this.completedRestaurantsIds = completedRestaurants.map(
      (restaurant) => restaurant.restaurantId
    );

    let progressRestaurants = this.seamlessEvents.filter((analytic) => {
      return (
        "restaurantId" in analytic &&
        !this.completedRestaurantsIds.includes(analytic.restaurantId)
      );
    });

    // // console.log("PROGRESS RESTAURANTS", progressRestaurants);

    this.progressRestaurantIds = progressRestaurants.map((restaurant) => {
      return restaurant.restaurantId;
    });

    this.progressRestaurantIds = [...new Set(this.progressRestaurantIds)];

    let progressAndCompleted = this.progressRestaurantIds.concat(
      this.completedRestaurantsIds
    );

    this.unopenedRestaurants = this.currentRestaurants.filter((restaurant) => {
      return !progressAndCompleted.includes(restaurant._id);
    });

    // console.log("PROGRESS RESTAURANT IDS", this.progressRestaurantIds);

    // console.log("FILTERED RESTAURANTS", this.completedRestaurantsIds);

    // Postcard sent restaurants
  }

  async showPostcardNotSent() {
    this.currentCriteria = "Postcard Not Sent";
    const postcardNotSentRestaurants = await this._api
      .get(environment.qmenuApiUrl + "generic", {
        resource: "restaurant",
        query: { "selfSignup.postcardSent": { $exists: false } },
        limit: 100000,
      })
      .toPromise();
    // console.log(postcardNotSentRestaurants);

    this.currentRestaurants = postcardNotSentRestaurants;
  }

  async submitSingleRestaurant(id) {
    // console.log("ID", id);

    // if not disabled, do not enter to self signup. They are already working with us, if disabled, intention is clear & want to create selfsignup campaign

    try {
      console.log("HERE 5");
      console.log(uuidv4);
      let code = uuidv4().slice(0, 6);
      console.log("HERE 6");
      // If ID exists, then don't run the operation

      const [foundRes] = await this._api
        .get(environment.qmenuApiUrl + "generic", {
          resource: "restaurant",
          projection: { selfSignup: 1, disabled: 1 },
          query: { _id: { $oid: id } },
          limit: 100000,
        })
        .toPromise();

      //  DO NOT CHANGE THE UUID IF ALREADY EXISTS
      if (foundRes && !foundRes.disabled) {
        alert("RESTAURANT ALREADY EXISTS");
        console.log("RESTAURANT ALREADY EXISTS ", foundRes);
        return;
      }
      const resource = await this._api
        .patch(environment.qmenuApiUrl + "generic?resource=restaurant", [
          {
            old: { _id: id },
            new: {
              _id: id,
              selfSignup: { code },
            },
          },
        ])
        .toPromise();
      // // console.log("RESOURCE", resource);
      if (resource[0]) {
        // // console.log("IN RESOURCE");
        this.sendSingleRTSuccess = true;
      } else {
        this.sendSingleRTFail = true;
      }

      if (this.sendSinglePostcard) {
        // LOB api call
        // // console.log("ENTERED SINGLE POSTCARD");
        const foundRes = await this._api
          .get(environment.qmenuApiUrl + "generic", {
            resource: "restaurant",
            query: { _id: { $oid: resource[0] } },
            limit: 100000,
          })
          .toPromise();

        // console.log("FOUND SINGLE RES ", foundRes);
        try {
          let lobObj = await this._api
            .post(environment.appApiUrl + "utils/send-postcard", {
              name: foundRes.name,
              address: foundRes.googleAddress.formatted_address,
              frontUrl: `https://08znsr1azk.execute-api.us-east-1.amazonaws.com/dev/render-url?url=https%3A%2F%2Fsignup.qmenu.com%2Fpostcard.html%3Fcode%3D${encodeURIComponent(
                code
              )}%26side%3Dfront&format=jpg`,
              backUrl: `https://08znsr1azk.execute-api.us-east-1.amazonaws.com/dev/render-url?url=https%3A%2F%2Fsignup.qmenu.com%2Fpostcard.html%3Fcode%3D${encodeURIComponent(
                code
              )}%26side%3Dback&format=jpg`,
            })
            .toPromise();
          lobObj = { ...lobObj, restaurantId: resource[0] };
          console.log("LOB ANALYTIC ", lobObj);
          this.createLobAnalytic(lobObj);
          // // console.log("LOB SINGLE SUCCESS");
          this.sendSingleLobSuccess = true;
          setTimeout(() => {
            this.sendSingleLobSuccess = false;
          }, 7000);
        } catch (e) {
          // // console.log("LOB SINGLE FAILED ", e);
          this.sendSingleLobFail = true;
          setTimeout(() => {
            this.sendSingleLobFail = false;
          }, 7000);
        }
      }
    } catch (e) {
      console.log("ERROR ", e);
      this.sendSingleRTFail = true;
      if (this.sendSinglePostcard) {
        this.sendSingleLobFail = true;
      }
      // // console.log("COULDN'T ADD SINGLE RT", e);
    } finally {
      setTimeout(() => {
        this.sendSingleLobFail = false;
        this.sendSingleLobSuccess = false;
        this.sendSingleRTSuccess = false;
        this.sendSingleRTFail = false;
      }, 10000);
    }
  }

  updateId(val) {
    this.singleRestaurantId = val;
    // // console.log(this.singleRestaurantId);
  }

  getAnalytics(id: string) {
    let formCompleteTime: string;
    let formStartedTime: string;
    let startedForm = this.seamlessEvents.some((analytic) => {
      if (analytic.restaurantId == id) {
        formStartedTime = analytic.createdAt;
        return true;
      }
    });

    let completedForm = this.seamlessEvents.some((analytic) => {
      if (analytic.restaurantId == id && "formComplete" in analytic) {
        formCompleteTime = analytic.createdAt;
        return true;
      }
    });

    if (!startedForm) {
      return "Unopened";
    }
    if (startedForm && !completedForm) {
      formStartedTime = new Date(formStartedTime).toUTCString();
      return `Progress at ${formStartedTime}`;
    }

    if (completedForm) {
      formCompleteTime = new Date(formCompleteTime).toUTCString();
      return `Completed at ${formCompleteTime}`;
    }
  }

  displayAnalytic(id) {
    for (let i = 0; i < this.agentAnalytics.length; i++) {
      if (this.agentAnalytics[i].id === id) {
        return this.agentAnalytics[i];
      }
    }
  }
}
