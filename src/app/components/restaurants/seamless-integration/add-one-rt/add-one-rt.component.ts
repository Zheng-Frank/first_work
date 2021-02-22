import { Component, OnInit } from "@angular/core";
import { ApiService } from "src/app/services/api.service";
import { environment } from "src/environments/environment";
import { v4 as uuidv4 } from "uuid";

@Component({
  selector: "app-add-one-rt",
  templateUrl: "./add-one-rt.component.html",
  styleUrls: ["./add-one-rt.component.css"],
})
export class AddOneRtComponent implements OnInit {
  sendSingleRTSuccess;
  sendSingleRTFail;
  sendSingleLobSuccess = false;
  sendSingleLobFail;
  sendSinglePostcard = false;
  singleRestaurantId;
  loading = false;
  constructor(private _api: ApiService) {}

  ngOnInit() {}

  updateId(val) {
    this.singleRestaurantId = val;
    // // console.log(this.singleRestaurantId);
  }

  async submitSingleRestaurant(id) {
    // console.log("ID", id);

    // if not disabled, do not enter to self signup. They are already working with us, if disabled, intention is clear & want to create selfsignup campaign
    this.loading = true;
    try {
      console.log(uuidv4);
      let code = uuidv4().slice(0, 6);
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
        // console.log("RESTAURANT ALREADY EXISTS ", foundRes);
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
      this.loading = false;
      setTimeout(() => {
        this.sendSingleLobFail = false;
        this.sendSingleLobSuccess = false;
        this.sendSingleRTSuccess = false;
        this.sendSingleRTFail = false;
      }, 10000);
    }
  }

  getSinglePostcard() {
    return this.sendSinglePostcard;
  }

  toggleSendSinglePostcard() {
    this.sendSinglePostcard = !this.sendSinglePostcard;
  }

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
}
