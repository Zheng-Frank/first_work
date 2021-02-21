import { Component, OnInit, Input } from "@angular/core";
import { ApiService } from "src/app/services/api.service";
import { environment } from "src/environments/environment";

@Component({
  selector: "app-send-postcard",
  templateUrl: "./send-postcard.component.html",
  styleUrls: ["./send-postcard.component.css"],
})
export class SendPostcardComponent implements OnInit {
  @Input() postcards = [];
  @Input() style = ''
  showLobOutput = false
  successLobRestaurants = []
  failLobRestaurants = []


  constructor(private _api: ApiService) {}

  ngOnInit() {}

  async createLobAnalytic(params) {
    try {
      const analyticEvents = await this._api
        .post(environment.appApiUrl + "smart-restaurant/api", {
          method: "create",
          resource: "analytics-event",
          payload: {
            src: "lob-admin",
            name: "lob-event",
            ...params,
          },
        })
        .toPromise();
      console.log("Analytic events posted", analyticEvents);
    } catch (e) {
      // console.log("ERROR CREATING LOB ANALYTIC ", e);
    }
  }


  async firePostCards() {
    console.log("FIRING THESE POSTCARDS ", this.postcards);
    console.log("THIS.POSTCARDS ", this.postcards)
    //dynanmic
    // // console.log("POSTCARDS", this.postcards);
    // Insert restaurant properties into name address
    let successCount = 0;
    for (let i = 0; i < this.postcards.length; i++) {
      // console.log("CODE", this.postcards[i].code);

      // const backUrl =
      //   "http://b70f6f0ad523.ngrok.io/postcard.html?code=abcdef&style=Chinese&side=back";
      // const frontUrl =
      //   "http://b70f6f0ad523.ngrok.io/postcard.html?code=abcdef&style=Chinese&side=front";
      console.log("FIRE POSTCARDS");
      console.log(this.postcards[i]);
      try {
        let sendResult = await this._api
          .post(environment.appApiUrl + "utils/send-postcard", {
            name: this.postcards[i].name,
            address: this.postcards[i].address,
            frontUrl: `https://08znsr1azk.execute-api.us-east-1.amazonaws.com/dev/render-url?url=https%3A%2F%2Fsignup.qmenu.com%2Fpostcard.html%3Fcode%3D${encodeURIComponent(
              this.postcards[i].code
            )}%26side%3Dfront%26style%3d${this.style}&format=jpg`,
            backUrl: `https://08znsr1azk.execute-api.us-east-1.amazonaws.com/dev/render-url?url=https%3A%2F%2Fsignup.qmenu.com%2Fpostcard.html%3Fcode%3D${encodeURIComponent(
              this.postcards[i].code
            )}%26side%3Dback%26style%3d${this.style}&format=jpg`,
          })
          .toPromise();

        sendResult = {
          ...sendResult,
          restaurantId: this.postcards[i].restaurantId,
        };
        console.log("LOB POST CARD ", sendResult);
        this.successLobRestaurants.push(this.postcards[i].name);

        this.createLobAnalytic(sendResult);

        try {
          await this._api
            .patch(environment.qmenuApiUrl + "generic?resource=restaurant", [
              {
                old: {
                  _id: this.postcards[i].restaurantId,
                  selfSignup: {},
                },
                new: {
                  _id: this.postcards[i].restaurantId,
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
        this.failLobRestaurants.push(this.postcards[i].name);

        console.log("FAILED TO CREATE LOB OBJECT", e);
      }
      finally {
        this.postcards = []
        this.showLobOutput = true
        setTimeout(() => {
          this.showLobOutput = false
          this.successLobRestaurants = []
          this.failLobRestaurants = []
        }, 8000)
      }
  
    } 
    // console.log("LOB SUCCESS", this.successLobRestaurants);
    // console.log("LOB FAIL", this.failLobRestaurants);
    // this.successLobCount = successCount;
    // this.failLobCount = this.postcards.length - successCount;
    // this.postcards = [];

    // console.log("SUCCESS LOB COUNT ", this.successLobCount);
    // console.log("FAIL LOB COUNT ", this.failLobCount);
  //   if (
  //     this.successLobRestaurants.length > 0 &&
  //     this.failLobRestaurants.length > 0
  //   ) {
  //     this.postCardsSentSuccess = true;
  //     this.postCardsSentFail = true;

  //     setTimeout(() => {
  //       this.postCardsSentSuccess = false;
  //       this.postCardsSentFail = false;
  //       this.successLobRestaurants = [];
  //       this.failLobRestaurants = [];
  //       this.successLobCount = 0;
  //       this.failLobCount = 0;
  //     }, 7000);

  //   } else if (this.successLobRestaurants.length > 0) {
  //     this.postCardsSentSuccess = true;
  //     setTimeout(() => {
  //       this.postCardsSentSuccess = false;
  //       this.successLobRestaurants = [];
  //       this.successLobCount = 0;
  //       this.failLobCount = 0;
  //     }, 7000);
  //     this.reload();
  //   } else if (this.failLobRestaurants.length > 0) {
  //     this.postCardsSentFail = true;
  //     setTimeout(() => {
  //       this.postCardsSentFail = false;
  //       this.failLobRestaurants = [];
  //       this.successLobCount = 0;
  //       this.failLobCount = 0;
  //     }, 7000);
  //     this.reload();
  //   } else {
  //     this.reload();
  //   }
  // }
}
