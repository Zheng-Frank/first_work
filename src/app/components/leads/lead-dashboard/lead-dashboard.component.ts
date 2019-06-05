import { Component, OnInit, ViewChild } from "@angular/core";
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { Lead } from "../../../classes/lead";
import { AlertType } from "../../../classes/alert-type";
import { CallLog } from "../../../classes/call-log";
import {
  ModalComponent,
  AddressPickerComponent
} from "@qmenu/ui/bundles/qmenu-ui.umd";
import { Address } from "@qmenu/ui";
import { User } from "../../../classes/user";
import { Helper } from "../../../classes/helper";
const FOUR_DAYS = 86400000 * 4; // 4 days

@Component({
  selector: "app-lead-dashboard",
  templateUrl: "./lead-dashboard.component.html",
  styleUrls: ["./lead-dashboard.component.scss"]
})
export class LeadDashboardComponent implements OnInit {
  @ViewChild("editingModal") editingModal: ModalComponent;
  @ViewChild("scanModal") scanModal: ModalComponent;
  @ViewChild("assigneeModal") assigneeModal: ModalComponent;
  @ViewChild("filterModal") filterModal: ModalComponent;
  @ViewChild("viewModal") viewModal: ModalComponent;
  @ViewChild("callModal") callModal: ModalComponent;

  @ViewChild("myAddressPicker") myAddressPicker: AddressPickerComponent;

  users: User[];
  restaurants;
  addressApt = null;
  DEBUGGING = false;
  editingNewCallLog = false;
  newCallLog = new CallLog();
  selectedLead = new Lead();

  apiRequesting = false;

  leads: Lead[] = [];
  selectionSet = new Set();

  showSelectOptions = false;

  leadInEditing = new Lead();
  // for editing
  formFieldDescriptors = [];

  // for assignee
  assigneeObj = {};
  assigneeFieldDescriptors = [];

  // for filtering
  searchFilters = [
    {
      path: "classifications",
      value: "Chinese Restaurants"
    }
  ];

  searchFilterObj = {};
  filterRating;
  leadFieldNotToCompare = ["_id", "crawledAt", "createdAt", "updatedAt", "rating", "totalReviews", "serviceProviders", "keyword"]

  // for editing existing call log
  selectedCallLog;
  tzMap = {
    PDT: ['WA', 'OR', 'CA', 'NV', 'AZ'],
    MDT: ['MT', 'ID', 'WY', 'UT', 'CO', 'NM'],
    CDT: ['ND', 'SD', 'MN', 'IA', 'NE', 'KS',
      'OK', 'TX', 'LA', 'AR', 'MS', 'AL', 'TN', 'MO', 'IL', 'WI'],
    EDT: ['MI', 'IN', 'KY', 'GA', 'FL', 'SC', 'NC', 'VA', 'WV',
      'OH', 'PA', 'NY', 'VT', 'NH', 'ME', 'MA', 'RJ', 'CT',
      'NJ', 'DE', 'MD', 'DC', 'RI'],
    HST: ['HI'],
    AKDT: ['AK']
  };


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

  constructor(private _api: ApiService, private _global: GlobalService) { }

  async ngOnInit() {
    this.searchFilters = this._global.storeGet("searchFilters") || [];
    this.searchLeads();
    this.resetRating();

    //retrieve restaurants with cids
    this.restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      projection: {
        name: 1,
        "googleListing.cid": 1
      },
      limit: 10000
    }).toPromise();

    // grab all users and make an assignee list!
    // get all users
    this._api
      .get(environment.adminApiUrl + "generic", {
        resource: "user",
        limit: 1000
      })
      .subscribe(
      result => {
        this.users = result.map(u => new User(u));

        // make form selector here
        const marketingUsers = result
          .map(u => new User(u))
          .filter(u =>
            (u.roles || []).some(
              r => ["MARKETER", "MARKETING_DIRECTOR"].indexOf(r) >= 0
            )
          );

        const descriptor = {
          field: "assignee", // match db naming otherwise would be single instead of plural
          label: "Assignee",
          required: false,
          inputType: "single-select",
          items: marketingUsers.map(mu => ({
            object: mu.username,
            text: mu.username,
            selected: false
          }))
        };

        this.filterFieldDescriptors.splice(8, 0, descriptor);

        const clonedDescriptor = JSON.parse(JSON.stringify(descriptor));
        clonedDescriptor.required = true;
        this.assigneeFieldDescriptors.push(clonedDescriptor);
      },
      error => {
        this._global.publishAlert(
          AlertType.Danger,
          "Error pulling users from API"
        );
      }
      );
  }

  resetRating() {
    // we need to parse float out of the rating settings
    this.filterRating = undefined;
    this.searchFilters.map(sf => {
      switch (sf.path) {
        case "rating":
          this.filterRating = +sf.value.replace(/^\D+/g, "") + 0.5;
          break;
        default:
          break;
      }
    });
  }
  getObjFromFilters(searchFilters: any[]) {
    const obj = {};
    searchFilters.map(filter =>
      this.setPathValue(obj, filter.path, filter.value)
    );
    return obj;
  }

  setPathValue(object, path, value) {
    const parts = path.split(".");
    let current = object;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        // fill an object if there is none
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
  }

  sortLeads(users) {
    this.leads.sort((u1, u2) => u1.name.localeCompare(u2.name));
  }

  createNew() {
    this.formFieldDescriptors = [
      {
        field: "name",
        label: "Restaurant Name",
        disabled: false
      }
    ];

    this.leadInEditing = new Lead();
    this.editingModal.show();
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

  getLogo(lead) {
    return GlobalService.serviceProviderMap[lead.gmbOwner];
  }

  async crawlOneGmb(cid, name, keyword) {

    // parallelly requesting
    try {
      let result = await this._api.get(environment.adminApiUrl + "utils/scan-gmb", { ludocid: cid, q: name }).toPromise();
      result.keyword = keyword;
      return result;
    } catch (error) {
      console.log(error);
      console.log("GMB crawl failed for " + cid + " " + name + " " + keyword);
      this._global.publishAlert(
        AlertType.Danger, "GMB crawl failed for " + cid + " " + name + " " + keyword
      );
    }
  }

  async updateLead(newLead, oldLead) {
    //delete newLead['_id'];
    //delete oldLead['_id'];
    //this.leadFieldNotToCompare.map(each => delete newLead[each]);
    //this.leadFieldNotToCompare.map(each => delete oldLead[each]);
    //keep the assignee
    if (oldLead.assignee) {
      newLead.assignee = oldLead.assignee;
    }
    //keep the callLogs
    if (oldLead.callLogs && oldLead.callLogs.length > 0) {
      newLead.callLogs = oldLead.callLogs;
    }

    this.patchDiff(oldLead, newLead, false);
  }

  async createNewLead(lead) {
    try {
      const result = await this._api.post(environment.adminApiUrl + "generic?resource=lead", [lead]).toPromise();
      this._global.publishAlert(
        AlertType.Success, "Successfully create lead " + lead
      );
      return result;
    } catch (error) {
      console.log(error);
      console.log("creating lead failed for  " + lead);
      // this._global.publishAlert(
      //   AlertType.Danger, "Failed to create lead " + lead
      // );
    }

  }

  // parseAddress(input) {
  //   //input format "3105 Peachtree Pkwy", " Suwanee", " GA 30024"
  //   let address = new Address();

  //   let addressInputArray = input.split(",");
  //   address.formatted_address=input;
  //   address.


  // }

  getState(formatted_address) {
    try {
      let addressArray = formatted_address.split(",");
      if (addressArray[addressArray.length - 1] && addressArray[addressArray.length - 1].match(/\b[A-Z]{2}/)) {
        //console.log('address=', address);
        //console.log(address.match(/\b[A-Z]{2}/)[0]);
        let state = addressArray[addressArray.length - 1].match(/\b[A-Z]{2}/)[0];
        return state;
      }
    }
    catch (e) {
      return '';
    }
  }

  getCity(formatted_address) {
    try {
      let addressArray = formatted_address.split(",");
      if (addressArray[addressArray.length - 2]) {
        //console.log('address=', address);
        //console.log(address.match(/\b[A-Z]{2}/)[0]);
        let city = addressArray[addressArray.length - 2].trim();
        return city;
      }
    }
    catch (e) {
      return '';
    }
  }

  getZipcode(formatted_address) {
    try {
      let addressArray = formatted_address.split(",");
      let last
      if (addressArray[addressArray.length - 1] && addressArray[addressArray.length - 1].match(/\b\d{5}\b/g)) {
        //console.log('address=', address);
        //console.log(address.match(/\b[A-Z]{2}/)[0]);
        let zip = addressArray[addressArray.length - 1].match(/\b\d{5}\b/g)[0].trim();
        return zip;
      }
    }
    catch (e) {
      return '';
    }
  }


  getTimeZone(formatted_address) {
    const tzMap = {
      PDT: ['WA', 'OR', 'CA', 'NV', 'AZ'],
      MDT: ['MT', 'ID', 'WY', 'UT', 'CO', 'NM'],
      CDT: ['ND', 'SD', 'MN', 'IA', 'NE', 'KS',
        'OK', 'TX', 'LA', 'AR', 'MS', 'AL', 'TN', 'MO', 'IL', 'WI'],
      EDT: ['MI', 'IN', 'KY', 'GA', 'FL', 'SC', 'NC', 'VA', 'WV',
        'OH', 'PA', 'NY', 'VT', 'NH', 'ME', 'MA', 'RJ', 'CT',
        'NJ', 'DE', 'MD', 'DC', 'RI'],
      HST: ['HI'],
      AKDT: ['AK']
    };

    let matchedTz = '';
    if (formatted_address && formatted_address.match(/\b[A-Z]{2}/)) {
      //console.log('address=', address);
      //console.log(address.match(/\b[A-Z]{2}/)[0]);
      let state = formatted_address.match(/\b[A-Z]{2}/)[0];

      Object.keys(tzMap).map(tz => {
        if (tzMap[tz].indexOf(state) > -1) {
          matchedTz = tz;
        }
      });
    }
    return matchedTz;
  }

  async scanbOneLead(query) {
    try {
      const result = await this._api.get(environment.adminApiUrl + "utils/scan-lead", query).toPromise();
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

      scanLeadResults = await Promise.all(scanLeadRequests);
      //merge the array of array to flatten it.
      scanLeadResults = [].concat.apply([], scanLeadResults).filter(each => each);
      const restaurantCids = this.restaurants.filter(r => r.googleListing && r.googleListing.cid).map(r => r.googleListing.cid);
      //filter out cid already in qMenu restaurants before updating or creating lead
      scanLeadResults = scanLeadResults.filter(each => !restaurantCids.some(cid => cid === each.cid));

      console.log('scanLeadResults=', scanLeadResults);
      //retrieve existing lead with the same cids
      const existingLeads = await this._api.get(environment.adminApiUrl + 'generic', {
        resource: 'lead',
        query: {
          cid: { $in: scanLeadResults.map(each => each.cid) }
        },
        limit: 1000
      }).toPromise();
      //creating or updating lead for the cids
      //let newLeadsToCreate = scanLeadResults;
      let newLeadsToCreate = scanLeadResults.filter(each => !existingLeads.some(lead => lead.cid === each['cid']))
      let existingLeadsToUpdate = existingLeads.filter(each => scanLeadResults.some(lead => lead.cid === each['cid']))
      //skip existing lead crawled within 4 days!;
      if (existingLeadsToUpdate && existingLeadsToUpdate.length > 0) {
        existingLeadsToUpdate = existingLeadsToUpdate.filter(b => {
          for (let i = 0; i < existingLeads.length; i++) {
            if (existingLeads[i]['cid'] === b.cid) {
              return !existingLeads[i].crawledAt || new Date().valueOf() - new Date(existingLeads[i].crawledAt).valueOf() > FOUR_DAYS

            }
          }
        })
      }
      //crawl GMB info new leads
      const newLeadsGMBRequests = (scanLeadResults).map(each => this.crawlOneGmb(each.cid, each.name, each.keyword));
      let newLeadsCrawledGMBresults: any = await Promise.all(newLeadsGMBRequests);
      let newLeadsResults = this.convertToLead(newLeadsCrawledGMBresults.filter(each => each));
      newLeadsResults.map(each => this.createNewLead(each));

      //crawl GMB info existing leads
      // const existingLeadsGMBRequests = (existingLeadsToUpdate).map(each => this.crawlOneGmb(each.cid, each.name, each.keyword));
      // let existingLeadsCrawledGMBresults: any = await Promise.all(existingLeadsGMBRequests);
      // let existingLeadsResults = this.convertToLead(existingLeadsCrawledGMBresults);
      // existingLeadsResults.map(each => this.updateLead(each, existingLeadsToUpdate.filter(e => e.cid === each.cid)[0]));

      //this.scanModal.hide();
      this._global.publishAlert(
        AlertType.Success,
        newLeadsResults.length + " leads were added, " + newLeadsGMBRequests.length + " leads were updated"
      );
    }
    catch (error) {
      console.log('2222222222222222222222222');
      console.log('error for ' + zipCodes);
      return event.acknowledge("Error while create/updade leads for " + JSON.stringify(zipCodes));
    }

  }

  convertToLead(input) {
    return input.map(each => {
      let lead = new Lead();
      lead.address = new Address();
      lead.address.formatted_address = each['address'];
      lead.address.administrative_area_level_1 = this.getState(each['address'])
      lead.address.locality = this.getCity(each['address'])
      lead.address.postal_code = this.getZipcode(each['address'])
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
      lead['timezone'] = this.getTimeZone(each['address'])
      return lead;
    })

  }

  async scanSubmit(event) {
    if (!event.object.keyword) {
      return event.acknowledge("Must input keyword");
    }
    let input = event.object;
    let zipCodes;
    if (input.keyword && input.zip) {
      zipCodes = input.zip.split();
    } else if (input.keyword && input.state) {
      //retrieve restaurants with cids
      zipCodes = await this._api.get(environment.adminApiUrl + 'generic', {
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
      //console.log('zipCodes', zipCodes);
    }

    let batchSize = 100;
    if (this.DEBUGGING) {
      batchSize = 2;
    }

    const batchedZipCodes = Array(Math.ceil(zipCodes.length / batchSize)).fill(0).map((i, index) => zipCodes.slice(index * batchSize, (index + 1) * batchSize));
    const failedZipCodes = [];
    const succeededZipCodes = [];

    for (let batch of batchedZipCodes) {
      try {
        const results = await this.processLeads(event, batch);
        await new Promise((resolve, reject) => {
          setTimeout(() => {
            resolve();
          }, 200000)
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
    this._global.publishAlert(AlertType.Success, "Success");
  }

  formSubmit(event) {
    if (!this.myAddressPicker.address.place_id) {
      return event.acknowledge("Must input address");
    }

    this.leadInEditing.address = this.myAddressPicker.address;

    this.leadInEditing.address.apt = (this.addressApt || "").trim();
    this._api
      .post(environment.adminApiUrl + "generic?resource=lead", [
        this.leadInEditing
      ])
      .subscribe(
      result => {
        event.acknowledge(null);
        // we get ids returned
        this.leadInEditing._id = result[0];
        this.leads.push(new Lead(this.leadInEditing));
        this.editingModal.hide();
        this._global.publishAlert(
          AlertType.Success,
          this.leadInEditing.name + " was added"
        );
      },
      error => {
        event.acknowledge(error.json() || error);
      }
      );
  }

  formRemove(event) { }

  filter() {
    // reset the searchFilterObj so that the formbuilder has the latest
    this.searchFilterObj = this.getObjFromFilters(this.searchFilters);
    this.filterModal.show();
  }

  filterSubmit(event) {
    this.searchFilters = this.getFilter(event.object);
    // remove rating field if there is one (maybe we let rating slip into the formbuilder object?)
    this.searchFilters = this.searchFilters.filter(sf => sf.path !== "rating");
    if (this.filterRating && +this.filterRating > 1) {
      this.searchFilters.push({
        path: "rating",
        value: "rating ~ " + this.filterRating
      });
    }

    this.searchLeads(event.acknowledge);
    this.filterModal.hide();
    this._global.storeSet("searchFilters", this.searchFilters);
  }

  getFilter(variable, parentPath?) {
    const results = [];
    Object.keys(variable).map(key => {
      const path = parentPath ? parentPath + "." + key : key;
      if (variable[key] !== Object(variable[key])) {
        results.push({
          path: path,
          value: variable[key]
        });
      } else {
        // case of non-primative
        results.push(...this.getFilter(variable[key], path));
      }
    });
    return results;
  }

  removeFilter(filter) {
    // delete last key by filter's path (eg. address.locality)
    this.searchFilters = this.searchFilters.filter(sf => sf !== filter);

    // need to set rating, assignee values
    this.resetRating();
    this.searchLeads();
    this._global.storeSet("searchFilters", this.searchFilters);
  }

  searchLeads(acknowledge?) {
    // get all users
    const query = {};
    this.searchFilters.map(filter => {
      switch (filter.path) {
        case "rating":
          if (this.filterRating > 0) {
            query["rating"] = { $gte: this.filterRating - 0.5 };
          }
          break;
        case "assigned":
          if (filter.value === "assigned") {
            query["assignee"] = { $exists: true };
          }
          if (filter.value === "not assigned") {
            query["assignee"] = { $exists: false };
          }
          break;
        case "closed":
          if (filter.value === "store closed") {
            query["closed"] = true;
          }
          if (filter.value === "store open") {
            query["closed"] = { $ne: true };
          }
          break;
        case "gmbOpen":
          if (filter.value === "gmb open") {
            query["gmbOpen"] = true;
          }
          break;
        case "inQmenu":
          if (filter.value === "in qMenu") {
            query["inQmenu"] = true;
          }
          break;

        case "gmbOwner":
          if (filter.value === "NOT_QMENU") {
            query["gmbOwner"] = { $ne: "qmenu" };
          } else if (filter.value) {
            query["gmbOwner"] = filter.value;
          }
          break;

        case "gmbAccountOwner":
          if (filter.value === "qMenu gmb account") {
            query["gmbAccountOwner"] = "qmenu";
          }
          break;

        case "gmbScanned":
          if (filter.value === "scanned") {
            query["gmbScanned"] = true;
          } else if (filter.value === "not scanned") {
            query["gmbScanned"] = { $exists: false };
          }
          break;
        case "address.place_id":
          if (filter.value === "address resolved") {
            query["address.place_id"] = { $exists: true };
          } else if (filter.value === "not resolved") {
            query["address.place_id"] = { $exists: false };
          }
          break;
        default:
          query[filter.path] = filter.value;
          break;
      }
    });

    this._api
      .get(environment.adminApiUrl + "generic", {
        resource: "lead",
        limit: 1000,
        query: query
      })
      .subscribe(
      result => {
        this.leads = result.map(u => new Lead(u));
        this.sortLeads(this.leads);
        if (this.leads.length === 0) {
          this._global.publishAlert(AlertType.Info, "No lead found");
        }
        if (acknowledge) {
          acknowledge(null);
        }
      },
      error => {
        if (acknowledge) {
          acknowledge(error.json || error);
        }
        this._global.publishAlert(
          AlertType.Danger,
          "Error pulling leads from API"
        );
      }
      );
  }

  view(lead) {
    this.selectedLead = lead;
    this.leadInEditing = lead;
    this.viewModal.show();
  }

  call(lead) {
    this.leadInEditing = lead;
    this.selectedLead = lead;
    this.callModal.show();
  }

  toggleNewCallLog() {
    this.editingNewCallLog = !this.editingNewCallLog;
    if (this.editingNewCallLog) {
      this.newCallLog = new CallLog();
      this.newCallLog.time = new Date();
      this.newCallLog.caller = this._global.user.username;
      if (this.selectedLead.phones && this.selectedLead.phones.length === 1) {
        this.newCallLog.phone = this.selectedLead.phones[0];
      }
    }
  }

  selectCallLog(log) {
    if (
      this.selectedCallLog &&
      this.selectedCallLog.time &&
      this.selectedCallLog.hasSameTimeAs(log)
    ) {
      this.selectedCallLog = new CallLog();
    } else {
      this.selectedCallLog = new CallLog(log);
    }
  }

  isAllSelected() {
    return this.leads.every(lead => this.selectionSet.has(lead._id));
  }

  toggleSelectAll() {
    if (this.isAllSelected()) {
      this.selectionSet.clear();
    } else {
      this.selectionSet = new Set(this.leads.map(lead => lead._id));
    }
  }

  deselectAll() {
    this.selectionSet.clear();
  }

  toggleSelection(lead) {
    if (this.selectionSet.has(lead._id)) {
      this.selectionSet.delete(lead._id);
    } else {
      this.selectionSet.add(lead._id);
    }
  }

  selectNonCrawled() {
    this.selectionSet.clear();
    this.selectionSet = new Set(
      this.leads.filter(l => !l.gmbScanned).map(l => l._id)
    );
  }

  hasSelection() {
    return this.leads.some(lead => this.selectionSet.has(lead._id));
  }

  crawlGoogle(lead: Lead, resolveCallback?, rejectCallback?) {
    this.apiRequesting = true;
    this._api
      .get(environment.adminApiUrl + "utils/scan-gmb", {
        q: [lead.name, lead.address.formatted_address].filter(i => i).join(" ")
      })
      .subscribe(
      result => {
        const gmbInfo = result;
        const clonedLead = new Lead(JSON.parse(JSON.stringify(lead)));

        if (gmbInfo.name && gmbInfo.name !== clonedLead.name) {
          clonedLead.oldName = clonedLead.name;
        } else {
          // to make sure carry the name
          gmbInfo.name = clonedLead.name;
        }

        // currently we don't want to lose address in original lead
        if (!gmbInfo.address || !gmbInfo.address["place_id"]) {
          gmbInfo.address = clonedLead.address;
        }

        Object.assign(clonedLead, gmbInfo);
        clonedLead.phones = clonedLead.phones || [];
        if (gmbInfo.phone && clonedLead.phones.indexOf(gmbInfo.phone) < 0) {
          clonedLead.phones.push(gmbInfo.phone);
          delete clonedLead["phone"];
        }
        clonedLead.gmbScanned = true;
        this.patchDiff(lead, clonedLead, true);
        this.apiRequesting = false;
        if (resolveCallback) {
          resolveCallback(result);
        }
      },
      error => {
        this.apiRequesting = false;
        this._global.publishAlert(AlertType.Danger, "Failed to crawl");
        if (rejectCallback) {
          rejectCallback(error);
        }
      }
      );
  }

  crawlGooglePromise(lead: Lead) {
    return new Promise((resolve, reject) => {
      this.crawlGoogle(lead, resolve, resolve); // pass ALL resolves to kee the thing going even when some are failing
    });
  }

  injectGoogleAddress(lead: Lead) {
    this.apiRequesting = true;
    lead.address = lead.address || {} as Address;

    this._api
      .get(environment.adminApiUrl + "utils/address", {
        formatted_address: lead.address.formatted_address
      })
      .subscribe(
      result => {
        const clonedLead = new Lead(JSON.parse(JSON.stringify(lead)));
        clonedLead.address = new Address(result);
        this.patchDiff(lead, clonedLead);
        this.apiRequesting = false;
      },
      error => {
        this.apiRequesting = false;
        this._global.publishAlert(
          AlertType.Danger,
          "Failed to update Google address. Try crawling Google first."
        );
      }
      );
  }

  patchDiff(originalLead, newLead, removeFromSelection?) {
    if (Helper.areObjectsEqual(originalLead, newLead)) {
      this._global.publishAlert(
        AlertType.Info,
        originalLead.name + ", Nothing to update"
      );
      this.selectionSet.delete(newLead._id);
    } else {

      this._api
        .patch(environment.adminApiUrl + "generic?resource=lead", [{ old: originalLead, new: newLead }])
        .subscribe(
        result => {
          if (removeFromSelection) {
            this.selectionSet.delete(newLead._id);
          }
          // let's update original, assuming everything successful
          Object.assign(originalLead, newLead);
          this.editingModal.hide();
          this._global.publishAlert(
            AlertType.Success,
            originalLead.name + " was updated"
          );
        },
        error => {
          this._global.publishAlert(AlertType.Danger, "Error updating to DB");
        }
        );
    }
  }

  async crawlGoogleGmbOnSelected() {
    // this has to be done sequencially otherwise overload the server!
    this.leads.filter(lead => this.selectionSet.has(lead._id)).reduce(
      (p: any, lead) =>
        p.then(() => {
          return this.crawlGooglePromise(lead);
        }),
      Promise.resolve()
    );
    // parallel example
    // this.leads
    //   .filter(lead => this.selectionSet.has(lead._id))
    //   .map(lead => {
    //     this.crawlGoogle(lead);
    //   });
  }

  assignOnSelected() {
    this.assigneeModal.show();
  }

  sumbitCallLog(event) {
    const leadClone = new Lead(this.selectedLead);
    //Assign to the current user by default if edit in leads table
    leadClone.assignee = this._global.user.username;
    leadClone.callLogs = leadClone.callLogs || [];
    if (event.object === this.newCallLog) {
      leadClone.callLogs.push(event.object);
    }

    // replace edited callLog, we can only use time as key to find it
    for (let i = 0; i < leadClone.callLogs.length; i++) {
      if (leadClone.callLogs[i].hasSameTimeAs(event.object)) {
        leadClone.callLogs[i] = event.object;
      }
    }
    event.acknowledge(null);

    this.editingNewCallLog = false;
    this.selectedCallLog = null;
    this.patchDiff(this.selectedLead, leadClone);
  }

  removeCallLog(event) {
    const leadClone = new Lead(this.selectedLead);
    leadClone.callLogs = (this.selectedLead.callLogs || []).filter(
      log => !log.hasSameTimeAs(event.object)
    );

    event.acknowledge(null);
    this.selectedCallLog = null;
    this.patchDiff(this.selectedLead, leadClone);
  }

  assigneeSubmit(event) {
    if (event.object.assignee) {
      const myusers = this.users
        .filter(
        u =>
          u.manager === this._global.user.username ||
          this._global.user.roles.indexOf("ADMIN") >= 0
        )
        .map(u => u.username);
      myusers.push(this._global.user.username);
      if (myusers.indexOf(event.object.assignee) < 0) {
        event.acknowledge("Failed to " + event.object.assignee);
      } else {
        this.leads.filter(lead => this.selectionSet.has(lead._id)).map(lead => {
          const clonedLead = JSON.parse(JSON.stringify(lead));

          if (
            !clonedLead.assignee ||
            myusers.indexOf(clonedLead.assignee) >= 0
          ) {
            clonedLead.assignee = event.object.assignee;
            this.patchDiff(lead, clonedLead);
          } else {
            this._global.publishAlert(
              AlertType.Danger,
              "Failed to assign " + event.object.assignee
            );
          }
        });
        this.assigneeModal.hide();
        event.acknowledge(null);
      }
    } else {
      event.acknowledge("No assignee is selected");
    }
  }

  unassignOnSelected() {
    const myusers = this.users
      .filter(
      u =>
        u.manager === this._global.user.username ||
        this._global.user.roles.indexOf("ADMIN") >= 0
      )
      .map(u => u.username);
    myusers.push(this._global.user.username);

    this.leads.filter(lead => this.selectionSet.has(lead._id)).map(lead => {
      const clonedLead = JSON.parse(JSON.stringify(lead));
      if (myusers.indexOf(clonedLead.assignee) >= 0) {
        clonedLead.assignee = undefined;
        this.patchDiff(lead, clonedLead);
      } else {
        this._global.publishAlert(
          AlertType.Danger,
          "Failed to unassign " + clonedLead.assignee
        );
      }
    });
  }

  getGoogleQuery(lead) {
    if (lead.address) {
      return (
        "https://www.google.com/search?q=" +
        encodeURIComponent(
          lead["name"] + " " + lead["address"]["formatted_address"]
        )
      );
    }
    return undefined;
  }
  getStateByZone(timeZone) {
    return this.tzMap[timeZone];
  }


}
