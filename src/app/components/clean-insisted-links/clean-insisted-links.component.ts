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

  constructor(private _api: ApiService, private _global: GlobalService, private _gmb3: Gmb3Service, private _prunedPatch: PrunedPatchService) { }

  ngOnInit() {
    this.loadRestaurants();
  }

  async loadRestaurants() {
    this.insistedRestaurants = (await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: "restaurant",
      query: {
        disabled: { $ne: true },
        $or: [
          { "web.useBizWebsite": { $eq: true } },
          { "web.useBizMenuUrl": { $eq: true } },
          { "web.useBizOrderAheadUrl": { $eq: true } },
          { "web.useBizReservationUrl": { $eq: true } },
        ]
      },
      projection: {
        "googleListing.place_id": 1,
        "googleAddress.timezone": 1,
        _id: 1,
        disabled: 1,
        logs: 1,
        name: 1,
        web: 1,
      },
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

  addLog(row) {
    this.logInEditing = new Log({ type: 'cleanup-insisted', time: new Date() });
    this.activeRestaurant = row;
    this.logEditingModal.show();
  }

  onSuccessAddLog(event) {
    event.log.time = event.log.time ? event.log.time : new Date();
    event.log.username = event.log.username ? event.log.username : this._global.user.username;

    const oldRestaurant = { _id: this.activeRestaurant._id, logs: [...this.activeRestaurant.logs] };

    const newRestaurant = { _id: this.activeRestaurant._id, logs: [...this.activeRestaurant.logs] };
    newRestaurant.logs.push(event.log);

    this._prunedPatch.patch(environment.qmenuApiUrl + 'generic?resource=restaurant',
      [{
        old: { _id: oldRestaurant._id, logs: oldRestaurant.logs },
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
