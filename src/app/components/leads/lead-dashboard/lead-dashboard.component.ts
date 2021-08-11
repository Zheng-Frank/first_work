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
import { Address, TimezoneHelper } from "@qmenu/ui";
import { User } from "../../../classes/user";
import { Helper } from "../../../classes/helper";
const FOUR_DAYS = 86400000 * 4; // 4 days
enum enumViewTypes {
  ALL = 'All',
  Contacted = 'Contacted',
  Uncontacted = 'Uncontacted'
}
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
  @ViewChild("removeRTModal") removeRTModal: ModalComponent;
  @ViewChild("timeFiltersModal") timeFilterModal: ModalComponent;

  multipleChoice = false; // it's true when using checkbox of the table.
  checkAllDelChainRT = false; // this flag is used to check chain restaurants which will be deleted.
  beforeCloseFlag = false; // three conditions of timer filters, and one must be checked at least.
  betweenHoursFlag = false;
  openNowFlag = false;
  //timeFilterHours is an array needed in second condition of time filters, 
  timeFiltersHours = ['00 AM', '01 AM', '02 AM', '03 AM', '04 AM', '05 AM', '06 AM', '07 AM', '08 AM', '09 AM', '10 AM',
    '11 AM', '12 AM', '01 PM', '02 PM', '03 PM', '04 PM', '05 PM', '06 PM', '07 PM', '08 PM', '09 PM', '10 PM', '11 PM', '12 PM'];
  // minsBeforeClosings is an array needed in first condition of time filters, whose elements from 1 - 60.
  minsBeforeClosings = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
    31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60];
  minsBeforeClosing = 60; // the first condition of time filters 
  timeFiltersStartHours; // the first variable of second condition of time filters 
  timeFiltersEndHours; // the second variable of second condition of time filters 
  removeLeadsNoLogs = false; // if the value is true,we need to filter which has no logs.
  chainDelRestaurants = []; // the field is the chain restaurants which needs to be deleted.
  searchDelRTText = ''; // try to search the name of removed chain restaurant.
  showMoreFunction = false; // show remove chain restaurant function.
  viewTypes = [enumViewTypes.ALL, enumViewTypes.Contacted, enumViewTypes.Uncontacted];
  viewType = enumViewTypes.ALL; // this type is used to control view filters
  users: User[];
  restaurants;
  addressApt = null;
  DEBUGGING = false;
  editingNewCallLog = false;
  newCallLog = new CallLog();
  selectedLead = new Lead();

  apiRequesting = false;

  leads: Lead[] = [];
  filterLeads = [];
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
  // select id, which it is used to assign/unassign restaurant to new salesperson. 
  selectId;
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
      .get(environment.qmenuApiUrl + "generic", {
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


  /**
   * - Is RT open today or not?
     - Show hours they're open on current day (and line on timeline showing current time)
   */
  applyTimeFilters() {
    if (!this.beforeCloseFlag && !this.betweenHoursFlag && !this.openNowFlag) {
      return this._global.publishAlert(AlertType.Danger, 'Please check one at least!');
    }
    this.viewFilter(); // The time filters has an intersection with view filter types.
    if (this.betweenHoursFlag) {
      if (!this.timeFiltersStartHours || !this.timeFiltersEndHours) {
        return this._global.publishAlert(AlertType.Danger, 'Start hours and end hours also should be selected!');
      }
      let startHours = this.convertTWToTF(this.timeFiltersStartHours);
      let endHours = this.convertTWToTF(this.timeFiltersEndHours);
      if (startHours > endHours) {
        return this._global.publishAlert(AlertType.Danger, 'Start hours can not be greater than end hours!');
      }
      let now = new Date();
      this.filterLeads = this.filterLeads.filter(lead => {
        if (lead.timezone) {
          // midHours maybe -1 or 25 that represents 23:00 yestorday and 1:00 tomorrow using 24 hours rules.
          let midHour = this.getLeadHoursFromTimezone(now, lead.timezone);
          return midHour >= Number(startHours) && midHour <= Number(endHours);
        }
        return false;
      });
    }

    this.timeFilterModal.hide();
  }
  // it means convert a.m./p.m. to 24 hours of a day.
  // tw is twelve,tf is twenty-four
  convertTWToTF(time: string): string {
    let formatStr = time[3] + time[4];
    let result = "";
    switch (formatStr) {
      case "AM":
        result = time[0] + time[1];
        break;
      case "PM":
        result = Number(time[0] + time[1]) + 12 + "";
        break;
      default:
        break;
    }
    return result;
  }

  // lead has a timezone value, and we need it to calculate middle hours
  // of start hours and end hours of second conditio of time filters.
  getLeadHoursFromTimezone(now: Date, timezone: string): number {
    let utcOffsetHours = now.getTimezoneOffset() / 60;
    const tfMap = { // the map records the delta hours between UTC and PDT,MDT,EDT,CDT
      PDT: -7,
      MDT: -6,
      CDT: -5,
      EDT: -4,
      HDT: -9,
      AKDT: -8,
      HST: -10,
      AKST: -9,
      PST: -8,
      MST: -7,
      CST: -6,
      EST: -5
    }
    let deltaHours = utcOffsetHours + tfMap[timezone];
    return new Date(now.valueOf() + (deltaHours * 3600 * 1000)).getHours();
  }

  openTimeFiltersModal() {
    this.timeFilterModal.show();
  }

  // Disabling remove button, if any chain is not checked.
  disabledRemove() {
    return !this.chainDelRestaurants.some(chain => chain.beChecked === true);
  }

  isAdmin() {
    return this._global.user.roles.indexOf("ADMIN") >= 0;
  }

  // when the checkbox is checked, we only checked the chains without logs.
  onCheckDelChainRTWithoutLogs() {
    this.checkAllDelChainRT = false;
    if (this.removeLeadsNoLogs) {
      this.chainDelRestaurants.forEach(chain => chain.getDescSortedCallLogs().length > 0 ? chain.beChecked = undefined : chain.beChecked = true)
    } else {
      this.onCheckAllDelChainRT();
    }
  }

  // all table rows be checked, then will be deleted in lead
  onCheckAllDelChainRT() {
    this.removeLeadsNoLogs = false;
    this.chainDelRestaurants.forEach(c => c.beChecked = this.checkAllDelChainRT);
  }

  // a table row be checked, then will be deleted in lead
  onCheckDelChainRT(restaurant) {
    restaurant.beChecked = !restaurant.beChecked;
  }

  getCheckedDelChainCount() {
    return this.chainDelRestaurants.filter(chain => chain.beChecked).length;
  }

  // the function is used to remove chain restaurant in restaurant
  async removeRTInLeads() {
    if (this.getCheckedDelChainCount() === 0) {
      return this._global.publishAlert(AlertType.Danger, 'Please check one at least!');
    }
    let delChains = this.chainDelRestaurants.filter(chain => chain.beChecked).map(c => c._id);
    await this._api.delete(environment.qmenuApiUrl + 'generic', {
      resource: 'lead',
      ids: delChains
    }).toPromise();
    this.removeRTModal.hide();
    this.searchLeads();
  }

  getContactedDelRTCount() {
    return this.chainDelRestaurants.filter(chain => chain.getDescSortedCallLogs().length > 0).length;
  }

  // the function is used to search rts which need to delete in leads table.
  async searchDelRTInLeads() {
    if (!this.searchDelRTText) {
      return this._global.publishAlert(AlertType.Danger, 'Please input chain restaurant name!');
    }
    const query = {
      name: {
        $regex: this.searchDelRTText
      }
    };
    this.chainDelRestaurants.length = 0;
    this.chainDelRestaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'lead',
      query: query,
      limit: 10000
    }, 3000);
    this.chainDelRestaurants = this.chainDelRestaurants.map(u => new Lead(u));
    this.chainDelRestaurants.sort((u1, u2) => u1.name.localeCompare(u2.name));
  }

  // remove rt modal is used to remove some out-of-date data in lead table.
  openRemoveRTModal() {
    this.removeLeadsNoLogs = false;
    this.searchDelRTText = '';
    this.chainDelRestaurants.length = 0;
    this.removeRTModal.show();
  }

  // sales person 
  viewFilter() {
    switch (this.viewType) {
      case enumViewTypes.ALL:
        this.filterLeads = this.leads;
        break;
      case enumViewTypes.Contacted:
        this.filterLeads = this.leads.filter(lead => lead.getDescSortedCallLogs().length > 0);
        break;
      case enumViewTypes.Uncontacted:
        this.filterLeads = this.leads.filter(lead => lead.getDescSortedCallLogs().length === 0);
        break;
      default:
        break;
    }
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
    this.filterLeads = this.leads;
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
      let result = await this._api.get(environment.qmenuApiUrl + "utils/scan-gmb", { ludocid: cid, q: name }).toPromise();
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
      const result = await this._api.post(environment.qmenuApiUrl + "generic?resource=lead", [lead]).toPromise();
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





  async scanbOneLead(query) {
    try {
      const result = await this._api.get(environment.qmenuApiUrl + "utils/scan-lead", query).toPromise();
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
      let newLeadsCrawledGMBresults: any = await Promise.all(newLeadsGMBRequests);
      let newLeadsResults = this.convertToLead(newLeadsCrawledGMBresults.filter(each => each));

      for (let each of newLeadsResults) {
        console.log(each);
        await this.createNewLead(each);
      }


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
      lead.address.administrative_area_level_1 = Helper.getState(each['address'])
      lead.address.locality = Helper.getCity(each['address'])
      lead.address.postal_code = Helper.getZipcode(each['address'])
      lead.cid = each.cid;
      lead.closed = each['closed'];
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
    this._global.publishAlert(AlertType.Success, "Success");
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

    this.searchLeads();
    event.acknowledge();
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

  async searchLeads() {
    // get all users
    const query = {};
    this.viewType = enumViewTypes.ALL;
    this.leads.length = 0;
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

    this.leads = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'lead',
      query: query,
      limit: 10000
    }, 3000)

    this.leads = this.leads.map(u => new Lead(u));
    this.sortLeads(this.leads);
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
    return this.filterLeads.every(lead => this.selectionSet.has(lead._id));
  }

  toggleSelectAll() {
    if (this.isAllSelected()) {
      this.selectionSet.clear();
    } else {
      this.selectionSet = new Set(this.filterLeads.map(lead => lead._id));
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
      this.filterLeads.filter(l => !l.gmbScanned).map(l => l._id)
    );
  }

  hasSelection() {
    return this.filterLeads.some(lead => this.selectionSet.has(lead._id));
  }

  crawlGoogle(lead: Lead, resolveCallback?, rejectCallback?) {
    this.apiRequesting = true;
    this._api
      .get(environment.qmenuApiUrl + "utils/scan-gmb", {
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
      .get(environment.qmenuApiUrl + "utils/address", {
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
        .patch(environment.qmenuApiUrl + "generic?resource=lead", [{ old: originalLead, new: newLead }])
        .subscribe(
          result => {
            if (removeFromSelection) {
              this.selectionSet.delete(newLead._id);
            }
            // let's update original, assuming everything successful
            Object.assign(originalLead, newLead);
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
    this.filterLeads.filter(lead => this.selectionSet.has(lead._id)).reduce(
      (p: any, lead) =>
        p.then(() => {
          return this.crawlGooglePromise(lead);
        }),
      Promise.resolve()
    );
  }
  // using single button clicked (green button named assign to marketer of each row).
  assignSingle(lead_id) {
    this.multipleChoice = false;
    this.selectId = lead_id;
    this.assigneeObj = {
      assignee:this._global.user.username
    } 
    this.assigneeModal.show();
  }
  // using in many leads be checked of the table. 
  assignOnSelected() {
    this.multipleChoice = true;
    this.assigneeObj = {
      assignee:this._global.user.username
    } 
    this.assigneeModal.show();
  }

  submitCallLog(event) {
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
            u.manager === this._global.user.username||
            this.isAdmin()
        )
        .map(u => u.username);
      myusers.push(this._global.user.username);
      if (myusers.indexOf(event.object.assignee) < 0) {
        event.acknowledge("Failed to assign to " + event.object.assignee);
      } else {
        if (!this.multipleChoice) {
          let lead = this.filterLeads.find(lead => lead._id === this.selectId);

          const clonedLead = JSON.parse(JSON.stringify(lead));

          if (
            !clonedLead.assignee ||
            myusers.indexOf(clonedLead.assignee) >= 0
          ) {
            clonedLead.assignee = event.object.assignee;
            this._api
              .patch(environment.qmenuApiUrl + "generic?resource=lead", [{ old: lead, new: clonedLead }])
              .subscribe(
                result => {
                  // let's update original, assuming everything successful
                  lead.assignee = clonedLead.assignee;
                  this._global.publishAlert(
                    AlertType.Success,
                    lead.name + " was updated"
                  );
                },
                error => {
                  error = error;
                  this._global.publishAlert(AlertType.Danger, "Error updating to DB");
                }
              );
          } else {
            this._global.publishAlert(
              AlertType.Danger,
              "Failed to assign to " + event.object.assignee
            );
          }
        } else {
          this.leads.filter(lead => this.selectionSet.has(lead._id)).map(lead => {
            const clonedLead = JSON.parse(JSON.stringify(lead));

            if (
              !clonedLead.assignee ||
              myusers.indexOf(clonedLead.assignee) >= 0
            ) {
              clonedLead.assignee = event.object.assignee;
              this._api
                .patch(environment.qmenuApiUrl + "generic?resource=lead", [{ old: lead, new: clonedLead }])
                .subscribe(
                  result => {
                    // let's update original, assuming everything successful
                    lead.assignee = clonedLead.assignee;
                    this._global.publishAlert(
                      AlertType.Success,
                      lead.name + " was updated"
                    );
                  },
                  error => {
                    error = error;
                    this._global.publishAlert(AlertType.Danger, "Error updating to DB");
                  }
                );
            } else {
              this._global.publishAlert(
                AlertType.Danger,
                "Failed to assign " + event.object.assignee
              );
            }
          });
        }
        this.multipleChoice = false;
        this.assigneeModal.hide();
        event.acknowledge(null);
      }
    } else {
      event.acknowledge("No assignee is selected");
    }
  }

  // using in many leads be checked of the table. 
  unassignOnSelected() {
    const myusers = this.users
      .filter(
        u =>
          u.manager === this._global.user.username || 
          this.isAdmin()
      )
      .map(u => u.username);
    myusers.push(this._global.user.username);

    this.leads.filter(lead => this.selectionSet.has(lead._id)).map(lead => {
      const clonedLead = JSON.parse(JSON.stringify(lead));
      if (myusers.indexOf(clonedLead.assignee) >= 0) {
        clonedLead.assignee = undefined;
        this._api
          .patch(environment.qmenuApiUrl + "generic?resource=lead", [{ old: lead, new: clonedLead }])
          .subscribe(
            result => {
              // let's update original, assuming everything successful
              lead.assignee = undefined;
              this._global.publishAlert(
                AlertType.Success,
                lead.name + " was updated"
              );
            },
            error => {
              this._global.publishAlert(AlertType.Danger, "Error updating to DB");
            }
          );
      } else {
        this._global.publishAlert(
          AlertType.Danger,
          "Failed to unassign."
        );
      }
    });
  }

  // using single button clicked (green button named unassign of each row).
  unassignSingle(lead_id) {
    const myusers = this.users
      .filter(
        u =>
          u.manager === this._global.user.username ||
          this.isAdmin()
      )
      .map(u => u.username);
    myusers.push(this._global.user.username);
    let lead = this.filterLeads.find(lead => lead._id === lead_id);

    const clonedLead = JSON.parse(JSON.stringify(lead));
    if (myusers.indexOf(clonedLead.assignee) >= 0) {
      clonedLead.assignee = undefined;
      this._api
        .patch(environment.qmenuApiUrl + "generic?resource=lead", [{ old: lead, new: clonedLead }])
        .subscribe(
          result => {
            // let's update original, assuming everything successful
            lead.assignee = undefined;
            this._global.publishAlert(
              AlertType.Success,
              lead.name + " was updated"
            );
          },
          error => {
            this._global.publishAlert(AlertType.Danger, "Error updating to DB");
          }
        );
    } else {
      this._global.publishAlert(
        AlertType.Danger,
        "Failed to unassign."
      );
    }
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
