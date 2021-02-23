import { Component, OnInit } from "@angular/core";
import { ViewChild, ElementRef } from "@angular/core";
import { ApiService } from "src/app/services/api.service";
import { environment } from "src/environments/environment";
import * as csvtojsonV2 from "csvtojson";
import { DomSanitizer } from "@angular/platform-browser";
import { saveAs } from "file-saver/FileSaver";

@Component({
  selector: "app-upload-csv",
  templateUrl: "./upload-csv.component.html",
  styleUrls: ["./upload-csv.component.css"],
})
export class UploadCsvComponent implements OnInit {
  list = true;
  fileList;
  successLobRestaurants = [];
  failLobRestaurants = [];
  successRestaurants = [];
  failedRestaurants = [];
  alreadyWorkWithUs = [];
  showOutput = false;
  designatePostcard;
  rowsProcessed = 0;
  currentlyUploading: boolean = false;
  invalidFormat = false;
  fileUrl;

  @ViewChild("fileInput") myInputVariable: ElementRef;

  log(val) {
    console.log("VALUE ", val);
  }

  constructor(private _api: ApiService, private sanitizer: DomSanitizer) {}

  ngOnInit() {
    // console.log("INVALID FORMAT ", this.invalidFormat);
  }

  downloadFile(
    successRestaurants,
    failRestaurants,
    successLobRestaurants,
    failLobRestaurants
  ) {
    let data = "";
    let header =
      "SUCCESS RESTAURANTS                    ADDRESS                                         LANGUAGE";
    let newLine = "\r\n";
    data += header;
    data += newLine;
    data +=
      "--------------------------------------------------------------------------------------";
    data += newLine;
    if (successRestaurants) {
      for (let i = 0; i < successRestaurants.length; i++) {
        data += `${successRestaurants[i].name}  |     ${successRestaurants[i].address} |   ${successRestaurants[i].language} `;
        data += newLine;
      }
    }

    if (failRestaurants) {
      data += newLine;
      data += newLine;
      data += newLine;
      data +=
        "FAIL RESTAURANTS                    ADDRESS                                         LANGUAGE";
      data += newLine;
      data +=
        "--------------------------------------------------------------------------------------";
      data += newLine;
      for (let i = 0; i < failRestaurants.length; i++) {
        data += `${failRestaurants[i].name}  |     ${failRestaurants[i].address} |   ${failRestaurants[i].language} `;
        data += newLine;
      }
    }

    if (successLobRestaurants) {
      data += newLine;
      data += newLine;
      data += newLine;
      data +=
        "SUCCESS LOB RESTAURANTS                    ADDRESS                                         LANGUAGE";
      data += newLine;
      data +=
        "--------------------------------------------------------------------------------------";
      data += newLine;

      for (let i = 0; i < successLobRestaurants.length; i++) {
        data += `${successLobRestaurants[i].name}  |     ${successLobRestaurants[i].address} |   ${successLobRestaurants[i].language} `;
        data += newLine;
      }
    }

    if (failLobRestaurants) {
      data += newLine;
      data += newLine;
      data += newLine;
      data +=
        "FAIL LOB RESTAURANTS                    ADDRESS                                         LANGUAGE";
      data += newLine;
      data +=
        "--------------------------------------------------------------------------------------";
      data += newLine;

      for (let i = 0; i < failLobRestaurants.length; i++) {
        data += `${failLobRestaurants[i].name}  |     ${failLobRestaurants[i].address} |   ${failLobRestaurants[i].language} `;
        data += newLine;
      }
    }

    var blob = new Blob([data], { type: "application/octet-stream" });
    var url = window.URL.createObjectURL(blob);
    saveAs(blob, "file_name.txt");
    window.open(url);
  }

  designatePostcardFlag() {
    this.designatePostcard = !this.designatePostcard;
    // // console.log(this.designatePostcard);
  }

  reset() {
    this.failLobRestaurants = [];
    this.successRestaurants = [];
    this.failedRestaurants = [];
    this.alreadyWorkWithUs = [];
    this.currentlyUploading = false;
    this.designatePostcard = false;
    this.showOutput = false;
    this.successLobRestaurants = [];
    this.invalidFormat = false;
    this.myInputVariable.nativeElement.value = "";
  }

  addFileList(files: FileList) {
    this.fileList = files;
  }

  addAttachment() {
    this.currentlyUploading = true;
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
            return;
          }
          // this.processedLength = csvRows.length;
          for (let row of csvRows) {
            // this.invalidFormat = false;
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
                this.alreadyWorkWithUs.push(crawledResult[0].name);
                continue;
              }

              this.successRestaurants.push({
                name: row[0],
                address: row[1],
                language: row[2],
              });

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
                      )}%26side%3Dfront%26style%3d${language}&format=jpg`,
                      backUrl: `https://08znsr1azk.execute-api.us-east-1.amazonaws.com/dev/render-url?url=https%3A%2F%2Fsignup.qmenu.com%2Fpostcard.html%3Fcode%3D${encodeURIComponent(
                        crawledResult[0].selfSignup.code
                      )}%26side%3Dback%26style%3d${language}&format=jpg`,
                    })
                    .toPromise();
                  lobObj = { ...lobObj, restaurantId };
                  this.createLobAnalytic(lobObj);
                  this.successLobRestaurants.push({
                    name: row[0],
                    address: row[1],
                    language: row[2],
                  });
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
                  this.failLobRestaurants.push({
                    name: row[0],
                    address: row[1],
                    language: row[2],
                  });
                  console.log("THIS LOB FAILED", row[0], e);
                }
              }
            } catch (error) {
              if (this.designatePostcard) {
                this.failLobRestaurants.push({
                  name: row[0],
                  address: row[1],
                  language: row[2],
                });
              }
              this.failedRestaurants.push({
                name: row[0],
                address: row[1],
                language: row[2],
              });
              console.log("ERROR ", error);
            }
          }
        };
        try {
          await importData();
          console.log("SUCCESS RESTAURANTS ", this.successRestaurants);
          console.log("FAIL RESTAURANTS ", this.failedRestaurants);
          console.log("SUCCESS LOB RESTAURANTS ", this.successLobRestaurants);
          console.log("FAIL LOB RESTAURANTS ", this.failLobRestaurants);
          console.log(
            "RESTAURANTS THAT ALREADY WORK WITH US ",
            this.alreadyWorkWithUs
          );
          this.currentlyUploading = false;
          this.showOutput = true;
          this.downloadFile(
            this.successRestaurants,
            this.failedRestaurants,
            this.successLobRestaurants,
            this.failLobRestaurants
          );
          this.reset();
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
