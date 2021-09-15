import { Component, OnInit, Input, Output, EventEmitter } from "@angular/core";
import { ApiService } from "src/app/services/api.service";
import { environment } from "src/environments/environment";

@Component({
  selector: "app-send-postcard",
  templateUrl: "./send-postcard.component.html",
  styleUrls: ["./send-postcard.component.css"],
})
export class SendPostcardComponent implements OnInit {
  @Input() postcards = [];
  @Input() style = "";
  showLobOutput = false;
  successLobRestaurants = [];
  failLobRestaurants = [];
  loading = false;

  @Output() finishedSendingPCs = new EventEmitter();

  finishedSendingPC() {
    this.finishedSendingPCs.emit();
  }

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
      console.log("ERROR CREATING LOB ANALYTIC ", e);
    }
  }

  reset() {
    this.showLobOutput = false;
    this.successLobRestaurants = [];
    this.failLobRestaurants = [];
  }

  async firePostCards() {
    console.log("FIRING THESE POSTCARDS ", this.postcards);
    console.log("THIS.POSTCARDS ", this.postcards);
    this.loading = true;
    const fire = async () => {
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
              frontUrl: `${environment.utilsApiUrl}render-url?url=https%3A%2F%2Fsignup.qmenu.com%2Fpostcard.html%3Fcode%3D${encodeURIComponent(
                this.postcards[i].code
              )}%26side%3Dfront%26style%3d${this.style}&format=jpg`,
              backUrl: `${environment.utilsApiUrl}render-url?url=https%3A%2F%2Fsignup.qmenu.com%2Fpostcard.html%3Fcode%3D${encodeURIComponent(
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
            console.log("FAILED TO PATCH RESTAURANT");
          }
        } catch (e) {
          this.failLobRestaurants.push(this.postcards[i].name);

          console.log("FAILED TO CREATE LOB OBJECT", e);
        }
      }
    };

    await fire();
    this.finishedSendingPC();
    this.loading = false;
    this.postcards = [];
    this.showLobOutput = true;
  }
}
