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
  sendSingleRTSuccess = false;
  sendSingleRTFail = false;
  sendSingleLobSuccess = false;
  sendSingleLobFail = false;
  sendSinglePostcard = false;
  singleRestaurantId = "";
  loading = false;
  showOutput = false;
  style = "English";

  constructor(private _api: ApiService) {}

  ngOnInit() {}

  updateId(val) {
    this.singleRestaurantId = val;
    // // console.log(this.singleRestaurantId);
  }

  setEnglishStyle() {
    this.style = "English";
  }

  setChineseStyle() {
    this.style = "Chinese";
  }

  async submitSingleRestaurant(id) {
    // console.log("ID", id);
    console.log("POSTCARD FLAG ", this.sendSinglePostcard);
    // if not disabled, do not enter to self signup. They are already working with us, if disabled, intention is clear & want to create selfsignup campaign
    this.loading = true;
    try {
      console.log(uuidv4);
      let code = uuidv4().slice(0, 6);
      console.log("TYPE OF CODE ", typeof code);
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
        console.log("FOUND RES  ", foundRes);
        alert("RESTAURANT ALREADY EXISTS");
        this.reset();
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

      console.log("RESOURCE AFTER PATCHING ", resource);
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

        console.log("RESOURCE IN SEND POSTCARD ", resource);

        const [foundRes] = await this._api
          .get(environment.qmenuApiUrl + "generic", {
            resource: "restaurant",
            query: { _id: { $oid: resource[0] } },
            limit: 100000,
          })
          .toPromise();

        console.log("FOUND RES ", foundRes);

        // console.log("FOUND SINGLE RES ", foundRes);
        try {
          let lobObj = await this._api
            .post(environment.appApiUrl + "utils/send-postcard", {
              name: foundRes.name,
              address: foundRes.googleAddress.formatted_address,
              frontUrl: `https://08znsr1azk.execute-api.us-east-1.amazonaws.com/dev/render-url?url=https%3A%2F%2Fsignup.qmenu.com%2Fpostcard.html%3Fcode%3D${encodeURIComponent(
                code
              )}%26side%3Dfront%26style%3d${this.style}&format=jpg`,
              backUrl: `https://08znsr1azk.execute-api.us-east-1.amazonaws.com/dev/render-url?url=https%3A%2F%2Fsignup.qmenu.com%2Fpostcard.html%3Fcode%3D${encodeURIComponent(
                code
              )}%26side%3Dback%26style%3d${this.style}&format=jpg`,
            })
            .toPromise();

          lobObj = { ...lobObj, restaurantId: resource[0] };
          console.log("LOB ANALYTIC ", lobObj);
          this.createLobAnalytic(lobObj);
          // // console.log("LOB SINGLE SUCCESS");
          this.sendSingleLobSuccess = true;
          try {
            await this._api
              .patch(environment.qmenuApiUrl + "generic?resource=restaurant", [
                {
                  old: {
                    _id: foundRes.restaurantId,
                    selfSignup: {},
                  },
                  new: {
                    _id: foundRes.restaurantId,
                    selfSignup: { postcardSent: true },
                  },
                },
              ])
              .toPromise();
          } catch (e) {
            // console.log("FAILED TO PATCH RESTAURANT");
          }
        } catch (e) {
          // // console.log("LOB SINGLE FAILED ", e);
          this.sendSingleLobFail = true;
        }
      }
      this.loading = false;
    } catch (e) {
      console.log("ERROR ", e);
      this.sendSingleRTFail = true;
      if (this.sendSinglePostcard) {
        this.sendSingleLobFail = true;
      }
      // // console.log("COULDN'T ADD SINGLE RT", e);
    } finally {
      setTimeout(() => {
        this.reset();
      }, 6000);
    }
  }

  reset() {
    this.sendSingleRTSuccess = false;
    this.sendSingleRTFail = false;
    this.sendSingleLobSuccess = false;
    this.sendSingleLobFail = false;
    this.sendSinglePostcard = false;
    this.singleRestaurantId = "";
    this.loading = false;
    this.showOutput = false;
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
