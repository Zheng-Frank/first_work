import { Component, OnInit } from "@angular/core";
import { ViewChild, ElementRef } from "@angular/core";
import { environment } from "src/environments/environment";
import { ApiService } from "src/app/services/api.service";

@Component({
  selector: "app-seamless-integration",
  templateUrl: "./seamless-integration.component.html",
  styleUrls: ["./seamless-integration.component.css"],
})
export class SeamlessIntegrationComponent implements OnInit {
  style = "English";
  entriesLength;
  designatePostcard: boolean = false;
  progressAndCompleted;
  agentAnalytics;
  people = [];
  currentRestaurants = [];
  allRestaurants: any;
  progressRestaurants;
  progressRestaurantIds: any;
  completedRestaurantsIds: string[];
  unopenedRestaurants: string[];
  unopenedRestaurantIds;
  currentPagination: number = 1;
  seamlessEvents = [];
  lobEvents = [];
  currentCriteria: string = "All";
  ownerNames: string[];
  sendPostCards = [];

  readonly VAPID_PUBLIC_KEY =
    "BIgJiFe6Y_nxJPFTM9bvEJGWduQbjtRrn7dXJa_vef9uZrowP4YyMTLZP15DrkLjsYLlLAFz519PUMpPFq-THwI";

  @ViewChild("fileInput") myInputVariable: ElementRef;

  constructor(private _api: ApiService) {}

  selectStyle(style) {
    this.style = style;
  }

  emptySendPostcards() {
    this.sendPostCards = [];
  }

  getPostCardsToFire(id) {
    return this.sendPostCards.some((postCard) => postCard.id === id);
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
      this.entriesLength = selfSignupRestaurants.length;
      this.allRestaurants = selfSignupRestaurants;
      this.allRestaurants.map((restaurant) => {
        restaurant.showAnalytics = false;
        restaurant.showSendHistory = false;
        return restaurant;
      });
      // console.log(selfSignupRestaurants);
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

  setPreviousPagination() {
    this.currentPagination += 1;
  }
  setNextPagination() {
    this.currentPagination -= 1;
  }
  setPagination(num: number) {
    this.currentPagination = num;
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
    this.lobEvents.forEach((event) => {
      if (event.restaurantId === id) {
        if (event.date_created) {
          let sendDate = new Date(event.date_created).toUTCString();
          let url = event.url;

          sendHistory.push({ sendDate, url });
        }
      }
    });
    let res;
    sendHistory && sendHistory.length > 0 ? (res = sendHistory) : (res = "");
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
