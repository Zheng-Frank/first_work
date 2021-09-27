import { Component, OnInit } from "@angular/core";
import { ViewChild, ElementRef } from "@angular/core";
import { ApiService } from "src/app/services/api.service";
import { environment } from "src/environments/environment";
import * as csvtojsonV2 from "csvtojson";
import { saveAs } from "file-saver/FileSaver";

@Component({
  selector: "app-upload-csv",
  templateUrl: "./upload-csv.component.html",
  styleUrls: ["./upload-csv.component.css"],
})
export class UploadCsvComponent implements OnInit {
  list = true;
  fileList;
  restaurantInfo = [];
  // successLobRestaurants = [];
  // failLobRestaurants = [];
  // successRestaurants = [];
  // failedRestaurants = [];
  // alreadyWorkWithUs = [];
  showOutput = false;
  designatePostcard = false;
  rowsProcessed = 0;
  currentlyUploading: boolean = false;
  invalidFormat = false;
  fileUrl;

  @ViewChild("fileInput") myInputVariable: ElementRef;

  log(val) {
    console.log("VALUE ", val);
  }

  constructor(private _api: ApiService) {}

  ngOnInit() {
    console.log("CURRENT POSTCARD VALUE ", this.designatePostcard);
    // console.log("INVALID FORMAT ", this.invalidFormat);
  }
  objectsToCSV(arr) {
    const array = [Object.keys(arr[0])].concat(arr);
    return array
      .map((row) => {
        return Object.values(row)
          .map((value) => {
            return typeof value === "string" ? JSON.stringify(value) : value;
          })
          .toString();
      })
      .join("\n");
  }

  async downloadFile(restaurantInfo) {
    console.log("RESTAURANT INFO ", restaurantInfo);
    let header = {
      "Restaurant-Name": "Restaurant Name",
      "Restaurant-Address": "Restaurant Address",
      "Postcard-Style": "Postcard Style",
      "Restaurant-Processed-Status": "Restaurant Processed Status",
      "Already-Work-Us": "Already Work With Us",
    };

    let data = this.objectsToCSV(restaurantInfo);
    console.log(data);
    var blob = new Blob([data], { type: "application/octet-stream" });
    saveAs(blob, "output.csv");
  }

  designatePostcardFlag() {
    this.designatePostcard = !this.designatePostcard;
    console.log("CURRENT POSTCARD VALUE ", this.designatePostcard);
    // // console.log(this.designatePostcard);
  }

  reset() {
    this.restaurantInfo = [];
    this.fileList = null;
    this.designatePostcard = false;
    this.currentlyUploading = false;
    this.showOutput = false;
    this.invalidFormat = false;
    this.myInputVariable.nativeElement.value = "";
  }

  addFileList(files: FileList) {
    this.fileList = files;
  }

  addAttachment() {
    console.log("POSTCARD FLAG VALUE ", this.designatePostcard);
    this.currentlyUploading = true;
    this.invalidFormat = false;
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
        if (csvRows[0].length != 3) {
          console.log("INVALID AMOUNT OF ROWS ", csvRows[0].length);
          this.invalidFormat = true;
        }
        csvRows = csvRows.slice(1);
        if (csvRows.length === 0) {
          console.log("NO DATA IN CSV");
          this.invalidFormat = true;
        }
        // csvRows.length = 1;
        const importData = async () => {
          this.currentlyUploading = true;
          if (this.invalidFormat) {
            this.currentlyUploading = false;
            return;
          }
          // this.processedLength = csvRows.length;
          for (let row of csvRows) {
            // this.invalidFormat = false;

            let restaurantName = row[0];
            let restaurantAddress = row[1];
            let postcardStyle = row[2];

            if (!restaurantName || !restaurantAddress) {
              continue;
            }
            let processedStatus = "FAILED";
            let alreadyWorkWithUs = "FALSE";
            let postcardSentStatus = "FAILED";

            let q = `${row[0]}, ${row[1]}`;
            let language = row[2];
            if (language.toLowerCase() === "english") {
              language = "English";
            } else if (language.toLowerCase() === "chinese") {
              language = "Chinese";
            } else {
              language = "English";
            }

            try {
              const crawledResult = await this._api
                .post(
                  environment.appApiUrl +
                    "utils/find-or-create-restaurant-by-gmb",
                  { q }
                )
                .toPromise();
              // console.log(crawledResult);

              if (!crawledResult[0].disabled) {
                alreadyWorkWithUs = "TRUE";
              }

              processedStatus = "SUCCESSFUL";

              let restaurantId = crawledResult[0]._id;
              if (this.designatePostcard && alreadyWorkWithUs != "TRUE") {
                try {
                  let lobObj = await this._api
                    .post(environment.appApiUrl + "utils/send-postcard", {
                      name: crawledResult[0].name,
                      address: crawledResult[0].googleAddress.formatted_address,
                      frontUrl: `${environment.utilsApiUrl}render-url?url=https%3A%2F%2Fsignup.qmenu.com%2Fpostcard.html%3Fcode%3D${encodeURIComponent(
                        crawledResult[0].selfSignup.code
                      )}%26side%3Dfront%26style%3d${language}&format=jpg`,
                      backUrl: `${environment.utilsApiUrl}render-url?url=https%3A%2F%2Fsignup.qmenu.com%2Fpostcard.html%3Fcode%3D${encodeURIComponent(
                        crawledResult[0].selfSignup.code
                      )}%26side%3Dback%26style%3d${language}&format=jpg`,
                    })
                    .toPromise();
                  lobObj = { ...lobObj, restaurantId };
                  this.createLobAnalytic(lobObj);
                  postcardSentStatus = "SENT";
                  try {
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
                  } catch (e) {
                    console.log("PATCHING FAILED "), e;
                  }
                } catch (e) {
                  postcardSentStatus = "FAILED";

                  console.log("THIS LOB FAILED", row[0], e);
                }
              }
            } catch (error) {
              postcardSentStatus = "FAILED";
              processedStatus = "FAILED";
            }
            let finalOutput = {
              "Restaurant Name": restaurantName,
              "Restuarant Address": restaurantAddress,
              "Postcard Style": postcardStyle,
              "Process Status": processedStatus,
              "Work With Us": alreadyWorkWithUs,
            };
            !this.designatePostcard
              ? (this.restaurantInfo.push(finalOutput), console.log("HERE!"))
              : (this.restaurantInfo.push({
                  ...finalOutput,
                  "Postcard Sent Status": postcardSentStatus,
                }),
                console.log("HERE 2"));
          }
          console.log(this.restaurantInfo);
        };
        try {
          await importData();
          if (!this.invalidFormat) {
            await this.downloadFile(this.restaurantInfo);
            this.reset();
          }
        } catch (e) {
          // console.log("import failed");
        }
      };
    }
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
