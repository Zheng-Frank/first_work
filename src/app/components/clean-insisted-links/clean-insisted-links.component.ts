import { TimezoneHelper } from '@qmenu/ui';
import {Component, OnInit, ViewChild} from '@angular/core';
import { ApiService } from "../../services/api.service";
import { GlobalService } from "../../services/global.service";
import {environment} from "../../../environments/environment";
import {AlertType} from "../../classes/alert-type";
import {Gmb3Service} from "../../services/gmb3.service";
import { Log } from 'src/app/classes/log';
import {PrunedPatchService} from "../../services/prunedPatch.service";


@Component({
  selector: 'app-clean-insisted-links',
  templateUrl: './clean-insisted-links.component.html',
  styleUrls: ['./clean-insisted-links.component.css']
})
export class CleanInsistedLinksComponent implements OnInit {
  @ViewChild('logEditingModal') logEditingModal;

  rows = [];

  filterBy = 'All';
  filteredRows;
  insistedRestaurants;
  logInEditing: Log = new Log({ type: 'cleanup-insisted', time: new Date() });
  activeRestaurant;

  myColumnDescriptors = [
    {
      label: "Name",
      paths: ['name'],
      sort: (a, b) => new Date(a || 0) > new Date(b || 0) ? 1 : -1,
    },
    {
      label: 'Timezone (as Offset to EST)'
    },
    {
      label: "GMB Status",
      paths: ['hasGmbOwnership'],
      sort: (a, b) => a > b ? 1 : (a < b ? -1 : 0),
    },
    {
      label: "Insisted Setting",
      paths: ['sortWeight'],
      sort: (a, b) => a > b ? 1 : (a < b ? -1 : 0),
    },
    {
      label: "Logs",
    },
  ];
  now = new Date();
  constructor(private _api: ApiService, private _global: GlobalService, private _gmb3: Gmb3Service, private _prunedPatch: PrunedPatchService) { }

  ngOnInit() {
    this.loadRestaurants();
  }

  getTimezoneCity(timezone){
    return (timezone || '').split('/')[1] || '';
  }

    // our salesperson only wants to know what is the time offset
  // between EST and the location of restaurant
  getTimeOffsetByTimezone(timezone){
    if(timezone){
      let localTime = TimezoneHelper.getTimezoneDateFromBrowserDate(new Date(this.now), timezone);
      let ESTTime = TimezoneHelper.getTimezoneDateFromBrowserDate(new Date(this.now), 'America/New_York');
      let offset = (ESTTime.valueOf() - localTime.valueOf())/(3600*1000);
      return offset > 0 ? "+"+offset.toFixed(0) : offset.toFixed(0);
    }else{
      return 'N/A';
    }
  }

  async loadRestaurants() {
    this.insistedRestaurants = (await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: "restaurant",
      aggregate: [
        {
          '$match': {
            disabled: {$ne: true},
            $or: [
              // {"web.bizManagedWebsite": {$exists: true, $ne: ""}},
              {"web.menuUrl": {$exists: true, $ne: ""}},
              {"web.orderAheadUrl": {$exists: true, $ne: ""}},
              {"web.reservationUrl": {$exists: true, $ne: ""}}
            ]
          }
        },
        {
          $project: {
            "googleListing.place_id": 1,
            "googleAddress.timezone": 1,
            _id: 1,
            disabled: 1,
            logs: {
              $filter: {
                input: "$logs",
                as: "log",
                cond: { $eq: ["$$log.type", "cleanup-insisted"] }
              }
            },
            name: 1,
            web: 1,
          }
        }
      ],
    }, 1000));

    Promise.all(this.insistedRestaurants.map(async restaurant => {
      restaurant.hasGmbOwnership = await this._gmb3.checkGmbOwnership(restaurant._id);
    }));

    this.rows = this.insistedRestaurants;
  }

  async onEdit(event, restaurant, field: string) {
    const web = restaurant.web || {};
    const oldValue = JSON.parse(JSON.stringify(web[field] || {}));
    const newValue = (event.newValue || '').trim();

    if (newValue) {
      try {
        await this._api.get(environment.appApiUrl + 'utils/check-url?url=' + newValue).toPromise();
      } catch (e) {
        console.log(e);
        this._global.publishAlert(AlertType.Danger, 'Error: Please enter a valid website URL');
        return;
      }
    }
    try {
      web[field] = newValue;

      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: { _id: restaurant._id, web: {[field] : oldValue} },
        new: { _id: restaurant._id, web: {[field] : newValue} }
      }]).toPromise();

      restaurant.web = web;

      this._global.publishAlert(AlertType.Success, 'Updated');
    } catch (error) {
      this._global.publishAlert(AlertType.Danger, error);
    }
  }

  async toggle(event, restaurant, field) {
    try {
      const web = restaurant.web || {};
      const oldValue = JSON.parse(JSON.stringify(web[field] || {}));
      const newValue = event.target.checked;
      web[field] = newValue;

      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: { _id: restaurant._id, web: {[field]: oldValue} },
        new: { _id: restaurant._id, web: {[field]: newValue} }
      }]).toPromise();

      restaurant.web = web;

      this._global.publishAlert(AlertType.Success, 'Updated');

    } catch (error) {
      this._global.publishAlert(AlertType.Danger, error);
    }
  }

  filter() {
    switch (this.filterBy) {
      case 'All':
        this.rows = this.insistedRestaurants;
        break;

      case 'Ownership':
        this.rows = this.insistedRestaurants.filter(row => row.hasGmbOwnership);
        break;

      case 'NoOwnership':
        this.rows = this.insistedRestaurants.filter(row => !row.hasGmbOwnership);
        break;

      default:
        this.rows = this.insistedRestaurants;
        break;
    }
  }

  async addLog(row) {
    this.logInEditing = new Log({ type: 'cleanup-insisted', time: new Date() });
    this.activeRestaurant = row;
    let activeRestaurantLogs = await this.getRestaurantLogs(this.activeRestaurant._id); 
    this.activeRestaurant.logs = activeRestaurantLogs;
    this.logEditingModal.show();
  }
  
  // load old logs of restaurant which need to be updated to ensure the integrity of data.
  async getRestaurantLogs(rtId){
    let restaurant = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        _id: {
          $oid:rtId
        }
      },
      projection: {
        logs: 1
      },
      limit: 1
    }).toPromise();
    return restaurant[0].logs || [];
  }

  onSuccessAddLog(event) {
    event.log.time = event.log.time ? event.log.time : new Date();
    event.log.username = event.log.username ? event.log.username : this._global.user.username;
    this.activeRestaurant.logs.push(event.log);

    const newRestaurant = { _id: this.activeRestaurant._id, logs: [...this.activeRestaurant.logs] };

    this._prunedPatch.patch(environment.qmenuApiUrl + 'generic?resource=restaurant',
      [{
        old: { _id: this.activeRestaurant._id },
        new: { _id: newRestaurant._id, logs: newRestaurant.logs }
       }]).subscribe(result => {
          this.rows.find(r => r._id === this.activeRestaurant._id).logs = [...newRestaurant.logs];
          this._global.publishAlert(AlertType.Success, 'Log added successfully');

          event.formEvent.acknowledge(null);
          this.logEditingModal.hide();
        },
        error => {
          this._global.publishAlert(AlertType.Danger, 'Error while adding log');
          event.formEvent.acknowledge('Error while adding log');
        }
      );
  }

  onCancelAddLog() {
    this.logEditingModal.hide();
  }
}
