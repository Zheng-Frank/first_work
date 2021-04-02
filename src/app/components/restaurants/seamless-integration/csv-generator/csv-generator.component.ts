import { Component, OnInit, ViewChild } from '@angular/core';
import { Lead } from "../../../../classes/lead";
import { GlobalService } from "../../../../services/global.service";
import {
  ModalComponent,
  AddressPickerComponent
} from "@qmenu/ui/bundles/qmenu-ui.umd";
import { environment } from 'src/environments/environment';
import { ApiService } from "../../../../services/api.service";
import { Address } from '@qmenu/ui';
import { Helper } from "../../../../classes/helper";
import { User } from "../../../../classes/user";
import { saveAs } from "file-saver/FileSaver";


@Component({
  selector: 'app-csv-generator',
  templateUrl: './csv-generator.component.html',
  styleUrls: ['./csv-generator.component.css']
})
export class CsvGeneratorComponent implements OnInit {
  @ViewChild("scanModal") scanModal: ModalComponent;
  @ViewChild("myAddressPicker") myAddressPicker: AddressPickerComponent;
  @ViewChild("editingModal") editingModal: ModalComponent;
  leads: Lead[] = [];
  addressApt = null;

  restaurants;
  leadInEditing = new Lead();

  myColumnDescriptors = [
    {
      label: 'Number'
    },
    {
      label: 'Name'
    },
    {
      label: "Cuisine"
    },
    {
      label: "Ratings"
    },
    {
      label: "Reviews"
    },
    {
      label: "Assignee"
    },
    {
      label: "Web"
    },
    {
      label: "Address"
    },
    {
      label: "Group"
    },
    {
      label: "State"
    },
    {
      label: "Comments"
    },
    {
      label: "Phones"
    },
    {
      label: "Logs"
    }

  ];

  filterFieldDescriptors = [
    {
      field: "cuisine", //
      label: "Cuisine",
      required: false,
      inputType: "single-select",
      items: [
        // 'Restaurants',
        // 'American Restaurants',
        // 'Family Style Restaurants',
        // 'Hamburgers & Hot Dogs',
        // 'Fast Food Restaurants',
        // 'Breakfast  Brunch & Lunch Restaurants',
        "Chinese restaurant",
        "Fast food restaurant",
        "Pizza",
        "Pizza restaurant",
        "Pizza Delivery",
        "Italian Restaurant",
        // 'Take Out Restaurants',
        // 'Greek Restaurants',
        "Asian restaurant",
        // 'Coffee & Espresso Restaurants',
        // 'Sandwich Shops',
        "Sushi Bar",
        "Sushi restaurant",
        "Indian restaurant",
        // 'Bars',
        "Japanese restaurant",
        //"Steak Houses",
        "Mexican restaurant",
        // 'Latin American Restaurants',
        // 'Chicken Restaurants',
        // 'Bar & Grills',
        // 'Barbecue Restaurants',
        "Thai restaurant",
        "American restaurant",
        // 'Sports Bars',
        // 'Brew Pubs',
        // 'Health Food Restaurants',
        // 'Bagels',
        // 'Bakeries',
        // 'Taverns',
        // 'Hot Dog Stands & Restaurants',
        // 'Mediterranean Restaurants',
        // 'Seafood Restaurants',
        // 'Fine Dining Restaurants',
        // 'Creole & Cajun Restaurants',
        // 'Buffet Restaurants',
        // 'Soul Food Restaurants',
        // 'Ice Cream & Frozen Desserts',
        // 'Dessert Restaurants',
        // 'Middle Eastern Restaurants',
        // 'Caribbean Restaurants',
        // 'Continental Restaurants',
        "Vietnamese restaurant",
        // 'French Restaurants',
        // 'Indian Restaurants',
        // 'Vegetarian Restaurants',
        // 'Vegan Restaurants',
        "Korean restaurant",
        // 'Brazilian Restaurants',
        // 'Wine Bars',
        // 'Cuban Restaurants',
        // 'Peruvian Restaurants',
        "Spanish restaurant",
        // 'Irish Restaurants',
        // 'Pasta',
        //"Mongolian Restaurants"
        // 'Gay & Lesbian Bars',
        // 'African Restaurants',
        // 'Hawaiian Restaurants',
        // 'Pies',
        // 'Fondue Restaurants',
        // 'Filipino Restaurants',
        // 'Russian Restaurants'
      ]
        .sort()
        .map(s => ({ object: s, text: s, selected: false }))
    },
    {
      field: "gmbOwner", //
      label: "GMB Website",
      required: false,
      inputType: "single-select",
      items: [
        {
          object: "NOT_QMENU",
          text: "NOT qMenu",
          selected: false
        },
        ...Object.keys(GlobalService.serviceProviderMap).map(s => ({
          object: s,
          text: s,
          selected: false
        }))
      ]
    },
    {
      field: "gmbOpen", //
      label: "GMB Status",
      required: false,
      inputType: "single-select",
      items: [{ object: "gmb open", text: "Open", selected: false }]
    },
    // {
    //   field: "gmbAccountOwner", //
    //   label: "qMenu Is GMB Owner",
    //   required: false,
    //   inputType: "single-select",
    //   items: [{ object: "qMenu gmb account", text: "Yes", selected: false }]
    // },
    // {
    //   field: "inQmenu", //
    //   label: "In qMenu System",
    //   required: false,
    //   inputType: "single-select",
    //   items: [{ object: "in qMenu", text: "Yes", selected: false }]
    // },
    {
      field: "closed", //
      label: "Store Status",
      required: false,
      inputType: "single-select",
      items: [
        { object: "store closed", text: "Store Closed", selected: false },
        { object: "store open", text: "Store Open", selected: false }
      ]
    },
    {
      field: "assigned", //
      label: "Assigned to Someone",
      required: false,
      inputType: "single-select",
      items: [
        { object: "assigned", text: "Assigned", selected: false },
        { object: "not assigned", text: "Not Assigned", selected: false }
      ]
    },
    // {
    //   field: "address.place_id",
    //   label: "Address Resolve",
    //   required: false,
    //   inputType: "single-select",
    //   items: [
    //     { object: "address resolved", text: "Resolved", selected: false },
    //     { object: "not resolved", text: "Not Resolved", selected: false }
    //   ]
    // },
    {
      field: "address.postal_code",
      label: "Zip Code",
      required: false,
      inputType: "tel"
    },
    {
      field: "address.locality",
      label: "City",
      required: false,
      inputType: "text"
    },
    {
      field: "address.administrative_area_level_1",
      label: "State",
      required: false,
      inputType: "single-select",
      items: [
        "AK",
        "AL",
        "AR",
        "AZ",
        "CA",
        "CO",
        "CT",
        "DC",
        "DE",
        "FL",
        "GA",
        "HI",
        "IA",
        "ID",
        "IL",
        "IN",
        "KS",
        "KY",
        "LA",
        "MA",
        "MD",
        "ME",
        "MI",
        "MN",
        "MO",
        "MS",
        "MT",
        "NC",
        "ND",
        "NE",
        "NH",
        "NJ",
        "NM",
        "NV",
        "NY",
        "OH",
        "OK",
        "OR",
        "PA",
        "RI",
        "SC",
        "SD",
        "TN",
        "TX",
        "UT",
        "VA",
        "VT",
        "WA",
        "WI",
        "WV",
        "WY"
      ].map(state => ({ object: state, text: state, selected: false }))
    },
    {
      field: "timezone",
      label: "Timezone",
      required: false,
      inputType: "single-select",
      items: ["PDT", "MDT", "CDT", "EDT", "HST", "AKDT"].map(state => ({
        object: state,
        text: state,
        selected: false
      }))
    },
    {
      field: "gmbScanned", //
      label: "Data Scanned",
      required: false,
      inputType: "single-select",
      items: [
        { object: "scanned", text: "Recently scanned", selected: false },
        { object: "not scanned", text: "Not recently Scanned", selected: false }
      ]
    },
  ];
  formFieldDescriptors = [];

  constructor(private _api: ApiService, private _global: GlobalService) { }
  formSubmit(event) {
    if (!this.myAddressPicker.address.place_id) {
      return event.acknowledge("Must input address");
    }

    this.leadInEditing.address = this.myAddressPicker.address;

    this.leadInEditing.address.apt = (this.addressApt || "").trim();
    this._api
      .post(environment.qmenuApiUrl + "generic?resource=lead", [
        this.leadInEditing
      ])
      .subscribe(
        result => {
          event.acknowledge(null);
          // we get ids returned
          this.leadInEditing._id = result[0];
          this.leads.push(new Lead(this.leadInEditing));
          this.editingModal.hide();

        },
        error => {
          event.acknowledge(error.json() || error);
        }
      );
  }
  async ngOnInit() {
    this.restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      projection: {
        name: 1,
        "googleListing.cid": 1
      },
      limit: 10000
    }).toPromise();
  }

  scanNew() {
    this.formFieldDescriptors = [
      {
        field: "keyword",
        label: "Search Keyword",
        required: true,
        disabled: false
      },
      {
        field: "zip",
        label: "Zip Code",
        required: false,
        disabled: false
      },
      // {
      //   field: "timezone",
      //   label: "Timezone",
      //   required: false,
      //   inputType: "single-select",
      //   items: ["PDT", "MDT", "CDT", "EDT"].map(state => ({
      //     object: this.getStateByZone(state),
      //     text: state,
      //     selected: false
      //   }))
      // },
      {
        field: "state",
        label: "State",
        required: false,
        inputType: "single-select",
        items: [
          "AK",
          "AL",
          "AR",
          "AZ",
          "CA",
          "CO",
          "CT",
          "DC",
          "DE",
          "FL",
          "GA",
          "HI",
          "IA",
          "ID",
          "IL",
          "IN",
          "KS",
          "KY",
          "LA",
          "MA",
          "MD",
          "ME",
          "MI",
          "MN",
          "MO",
          "MS",
          "MT",
          "NC",
          "ND",
          "NE",
          "NH",
          "NJ",
          "NM",
          "NV",
          "NY",
          "OH",
          "OK",
          "OR",
          "PA",
          "RI",
          "SC",
          "SD",
          "TN",
          "TX",
          "UT",
          "VA",
          "VT",
          "WA",
          "WI",
          "WV",
          "WY"
        ].map(state => ({ object: state, text: state, selected: false }))
      },
    ];

    this.scanModal.show();
  }

  async scanSubmit(event) {
    if (!event.object.keyword) {
      return event.acknowledge("Must input keyword");
    }
    let input = event.object;
    console.log("THIS IS THE INPUT ", input)
    let zipCodes;
    if (input.keyword && input.zip) {
      zipCodes = input.zip.split();
    } else if (input.keyword && input.state) {
      //retrieve restaurants with cids
      console.log("ENTERED THIS IF ELSE CONDITION")
      zipCodes = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'zipCodes',
        query: {
          "state_code": input.state
        },
        projection: {
          zip_code: 1
        },
        limit: 10000
      }).toPromise();

      zipCodes = zipCodes.map(each => each.zip_code);
      //since CT zip code only 4 digits
      zipCodes = zipCodes.map(each => each.length == 4 ? '0' + each : each)
      console.log('zipCodes', zipCodes);
    }

    let batchSize = 100;
    // if (this.DEBUGGING) {
    //   batchSize = 2;
    // }


    const batchedZipCodes = Array(Math.ceil(zipCodes.length / batchSize)).fill(0).map((i, index) => zipCodes.slice(index * batchSize, (index + 1) * batchSize));
    const failedZipCodes = [];
    const succeededZipCodes = [];

    for (let batch of batchedZipCodes) {
      try {
        const results = await this.processLeads(event, batch);
        console.log("PROCESSED LEAD RESULTS! ", results)


        await new Promise((resolve, reject) => {
          setTimeout(() => {
            resolve();
          }, 20000)
        });
        succeededZipCodes.push(...batch);
        console.log("done for " + batch);
      } catch (error) {
        failedZipCodes.push(...batch);
        console.log("error for " + batch);
        console.log(error);
      }
    }
    console.log("Failed for " + failedZipCodes);
    console.log("Totally done  for " + succeededZipCodes);
    this.scanModal.hide();
  }

  async scanbOneLead(query) {
    console.log("THIS IS THE QUERY ", query)
    try {
      const result = await this._api.get(environment.qmenuApiUrl + "utils/scan-lead", query).toPromise();

      console.log("THIS IS THE RESULT ", result)
      return result;
    } catch (error) {
      console.log('11111111111111111111111111');
      console.log('error in scanbOneLead for ' + query);
      console.log(error);
      return;
    }
  }

  async processLeads(event, zipCodes) {
    let input = event.object;
    let keyword = input.keyword;
    let scanLeadResults;
    let searchKeyword;
    let scanLeadRequests = [];
    try {
      // parallelly requesting
      searchKeyword =
        scanLeadRequests = zipCodes.map(z => {
          let query = { q: keyword + " " + z };
          return this.scanbOneLead(query);
        });

      console.log("MADE IT HERE")
      scanLeadResults = await Promise.all(scanLeadRequests);
      console.log("HERE TWO!!")
      //merge the array of array to flatten it.
      scanLeadResults = [].concat.apply([], scanLeadResults).filter(each => each);

      console.log("HERE 2.5")
      const restaurantCids = this.restaurants.filter(r => r.googleListing && r.googleListing.cid).map(r => r.googleListing.cid);

      console.log("HERE 2.7")
      //filter out cid already in qMenu restaurants before updating or creating lead
      scanLeadResults = scanLeadResults.filter(each => !restaurantCids.some(cid => cid === each.cid));

      console.log("HERE 2.9")

      console.log('scanLeadResults=', scanLeadResults);
      //retrieve existing lead with the same cids
      // const existingLeads = await this._api.get(environment.qmenuApiUrl + 'generic', {
      //   resource: 'lead',
      //   query: {
      //     cid: { $in: scanLeadResults.map(each => each.cid) }
      //   },
      //   limit: 1000
      // }).toPromise();
      //creating or updating lead for the cids
      //let newLeadsToCreate = scanLeadResults;
      //let newLeadsToCreate = scanLeadResults.filter(each => !existingLeads.some(lead => lead.cid === each['cid']))
      //let existingLeadsToUpdate = existingLeads.filter(each => scanLeadResults.some(lead => lead.cid === each['cid']))
      //skip existing lead crawled within 4 days!;
      // if (existingLeadsToUpdate && existingLeadsToUpdate.length > 0) {
      //   existingLeadsToUpdate = existingLeadsToUpdate.filter(b => {
      //     for (let i = 0; i < existingLeads.length; i++) {
      //       if (existingLeads[i]['cid'] === b.cid) {
      //         return !existingLeads[i].crawledAt || new Date().valueOf() - new Date(existingLeads[i].crawledAt).valueOf() > FOUR_DAYS

      //       }
      //     }
      //   })
      // }
      //crawl GMB info new leads
      const newLeadsGMBRequests = (scanLeadResults).map(each => this.crawlOneGmb(each.cid, each.name, each.keyword));
      // console.log("HERE 3")
      let newLeadsCrawledGMBresults: any = await Promise.all(newLeadsGMBRequests);
      // console.log("HERE 4")
      let newLeadsResults = this.convertToLead(newLeadsCrawledGMBresults.filter(each => each));

      // console.log("THESE ARE THE NEW LEAD RESULTS ", newLeadsResults)

      this.objectsToCSV(newLeadsResults)
      // for (let each of newLeadsResults) {
      //   console.log("THIS IS THE LEAD", each);
      //   await this.createNewLead(each);
      // }


      //crawl GMB info existing leads
      // const existingLeadsGMBRequests = (existingLeadsToUpdate).map(each => this.crawlOneGmb(each.cid, each.name, each.keyword));
      // let existingLeadsCrawledGMBresults: any = await Promise.all(existingLeadsGMBRequests);
      // let existingLeadsResults = this.convertToLead(existingLeadsCrawledGMBresults);
      // existingLeadsResults.map(each => this.updateLead(each, existingLeadsToUpdate.filter(e => e.cid === each.cid)[0]));

      //this.scanModal.hide();

    }
    catch (error) {
      console.log('2222222222222222222222222');
      console.log('error for ' + zipCodes);
      return event.acknowledge("Error while create/updade leads for " + JSON.stringify(zipCodes));
    }

  }

  async crawlOneGmb(cid, name, keyword) {

    // parallelly requesting
    try {
      let result = await this._api.get(environment.qmenuApiUrl + "utils/scan-gmb", { ludocid: cid, q: name }).toPromise();
      result.keyword = keyword;
      return result;
    } catch (error) {
      console.log(error);
      console.log("GMB crawl failed for " + cid + " " + name + " " + keyword);

    }
  }
  convertToLead(input) {
    return input.map(each => {
      let lead = new Lead();
      lead.address = new Address();
      lead.address.formatted_address = each['address'];
      lead.address.administrative_area_level_1 = Helper.getState(each['address'])
      lead.address.locality = Helper.getCity(each['address'])
      lead.address.postal_code = Helper.getZipcode(each['address'])
      lead.cid = each.cid;
      lead.closed = each['closed'];
      lead.gmbOpen = each['gmbOpen']
      lead.gmbOwner = each['gmbOwner'];
      lead.gmbVerified = each['gmbVerified'];
      lead.gmbWebsite = each['gmbWebsite'];
      lead.menuUrls = each['menuUrls'];
      lead.name = each['name'];
      lead.phones = each['phone'] && each['phone'].split();
      lead['place_id'] = each['place_id'];
      lead.rating = each['rating'];
      lead.reservations = each['reservations'];
      lead.serviceProviders = each['serviceProviders'];
      lead.totalReviews = each['totalReviews'];
      lead.crawledAt = new Date();
      lead['keyword'] = each.keyword;
      lead.cuisine = each.cuisine;
      lead['timezone'] = Helper.getTimeZone(each['address'])
      return lead;
    })

  }

  async createNewLead(lead) {
    try {
      const result = await this._api.post(environment.qmenuApiUrl + "generic?resource=lead", [lead]).toPromise();
      console.log("RESULTING LEAD")
      return result;
    } catch (error) {
      console.log(error);
      console.log("creating lead failed for  " + lead);
      // this._global.publishAlert(
      //   AlertType.Danger, "Failed to create lead " + lead
      // );
    }

  }

  objectsToCSV(arr) {
    let finalResult = []
    console.log("RESTAURANT INFO ", arr);
    let header = {
      "Restaurant-Name": "Restaurant Name",
      "Restaurant-Address": "Restaurant Address",
      "Postcard-Style": "Postcard Style",

    };

    console.log("ARRAY IN OBJECTS TO CSV ", arr)

    arr = arr.map(a => {
      return {
        name: a.name,
        address: a.address.formatted_address,
        style: ""
      }
    })

    const array = [Object.keys(arr[0])].concat(arr);
    let result = array
      .map((row) => {
        return Object.values(row)
          .map((value) => {
            return typeof value === "string" ? JSON.stringify(value) : value;
          })
          .toString();
      })
      .join("\n");
    var blob = new Blob([result], { type: "application/octet-stream" });
    saveAs(blob, "leads.csv");
  }


}
