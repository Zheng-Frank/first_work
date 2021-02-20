import { Component, OnInit } from "@angular/core";

@Component({
  selector: "app-upload-csv",
  templateUrl: "./upload-csv.component.html",
  styleUrls: ["./upload-csv.component.css"],
})
export class UploadCsvComponent implements OnInit {
  constructor() {}

  ngOnInit() {}

  addAttachment() {
    // let files = this.fileList;
    // if (files && files.length > 0) {
    //   let file: File = files.item(0);
    //   let reader: FileReader = new FileReader();
    //   reader.readAsText(file);
    //   reader.onload = async (e) => {
    //     let csv: string = reader.result as string;
    //     let csvRows = await csvtojsonV2({
    //       noheader: true,
    //       output: "csv",
    //     }).fromString(csv);
    //     if (csvRows[0].length != 3) {
    //       console.log("INVALID AMOUNT OF ROWS ", csvRows[0].length);
    //       this.invalidFormat = true;
    //       return;
    //     }
    //     csvRows = csvRows.slice(1);
    //     if (csvRows.length === 0) {
    //       console.log("NO DATA IN CSV");
    //       this.invalidFormat = true;
    //       return;
    //     }
    //     // csvRows.length = 1;
    //     const importData = async () => {
    //       this.currentlyUploading = true;
    //       this.processedLength = csvRows.length;
    //       for (let row of csvRows) {
    //         this.invalidFormat = false;
    //         let q = `${row[0]}, ${row[1]}`;
    //         let language = row[2];
    //         if (language.toLowerCase() === "english") {
    //           language = "English";
    //         } else if (language.toLowerCase() === "chinese") {
    //           language = "Chinese";
    //         } else {
    //           language = "English";
    //         }
    //         try {
    //           const crawledResult = await this._api
    //             .post(
    //               environment.appApiUrl +
    //                 "utils/find-or-create-restaurant-by-gmb",
    //               { q }
    //             )
    //             .toPromise();
    //           // console.log(crawledResult);
    //           if (crawledResult[0].disabled.toString().toLowerCase() === 'false') {
    //             console.log("THIS RESTAURANT ALREADY WORKS WITH US, NOT ADDING RESTAURANT OR SENDING POST CARD ", crawledResult[0].name)
    //             continue
    //           }
    //           // TODO: CHECK DISABLED
    //           let restaurantId = crawledResult[0]._id;
    //           if (this.designatePostcard) {
    //             // send LOB response'
    //             // const backUrl =
    //             //   "http://bf1651968fee.ngrok.io/postcard.html?code=abcdef&style=Chinese&side=back";
    //             // const frontUrl =
    //             //   "http://bf1651968fee.ngrok.io/postcard.html?code=abcdef&style=Chinese&side=front";
    //             //   frontUrl: `https://08znsr1azk.execute-api.us-east-1.amazonaws.com/dev/render-url?url=${encodeURIComponent(
    //             // frontUrl
    //             // )}&format=jpg`,
    //             try {
    //               let lobObj = await this._api
    //                 .post(environment.appApiUrl + "utils/send-postcard", {
    //                   name: crawledResult[0].name,
    //                   address: crawledResult[0].googleAddress.formatted_address,
    //                   frontUrl: `https://08znsr1azk.execute-api.us-east-1.amazonaws.com/dev/render-url?url=https%3A%2F%2Fsignup.qmenu.com%2Fpostcard.html%3Fcode%3D${encodeURIComponent(
    //                     crawledResult[0].selfSignup.code
    //                   )}%26side%3Dfront%26style%3d${language}&format=jpg`,
    //                   backUrl: `https://08znsr1azk.execute-api.us-east-1.amazonaws.com/dev/render-url?url=https%3A%2F%2Fsignup.qmenu.com%2Fpostcard.html%3Fcode%3D${encodeURIComponent(
    //                     crawledResult[0].selfSignup.code
    //                   )}%26side%3Dback%26style%3d${language}&format=jpg`,
    //                 })
    //                 .toPromise();
    //               lobObj = { ...lobObj, restaurantId };
    //               this.createLobAnalytic(lobObj);
    //               this.successEveryLobCount += 1;
    //               try {
    //                 await this._api
    //                   .patch(
    //                     environment.qmenuApiUrl + "generic?resource=restaurant",
    //                     [
    //                       {
    //                         old: { _id: restaurantId, selfSignup: {} },
    //                         new: {
    //                           _id: restaurantId,
    //                           selfSignup: { postcardSent: true },
    //                         },
    //                       },
    //                     ]
    //                   )
    //                   .toPromise();
    //               } catch (e) {
    //                 console.log("PATCHING FAILED "), e;
    //               }
    //             } catch (e) {
    //               this.failEveryLobCount += 1;
    //               // console.log("ONE EVERY LOB FAILED ", e);
    //             }
    //           }
    //         } catch (error) {
    //           this.failedRestaurants.push({
    //             name: row[0],
    //             address: row[1],
    //             language: row[2],
    //           });
    //           console.log("ERROR ", error);
    //         }
    //       }
    //     };
    //     try {
    //       await importData();
    //       if (this.failedRestaurants && this.fai) {
    //         console.log(
    //           "WE FAILED TO UPLOAD THESE RESTAURANTS ",
    //           this.failedRestaurants
    //         );
    //       }
    //       // // console.log(
    //       //   `WE SUCCESSFULLY SENT POSTCARDS TO ${this.successEveryLobCount}`);
    //       this.currentlyUploading = false;
    //       const selfSignupRestaurantsAfter = await this._api
    //         .get(environment.qmenuApiUrl + "generic", {
    //           resource: "restaurant",
    //           query: { selfSignup: { $exists: true } },
    //           limit: 100000,
    //         })
    //         .toPromise();
    //       this.afterCsvLength = selfSignupRestaurantsAfter.length;
    //       this.rowsProcessed = this.afterCsvLength - this.beforeCsvLength;
    //       this.currentRestaurants = selfSignupRestaurantsAfter;
    //       // // console.log(`We imported ${this.rowsProcessed} restaurants`);
    //     } catch (e) {
    //       // console.log("import failed");
    //     }
    //   };
    // }
  }
}
