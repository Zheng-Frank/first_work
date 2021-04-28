import { Component, OnInit , ViewChild} from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { GlobalService } from 'src/app/services/global.service';
import { environment } from 'src/environments/environment';
import { AlertType } from 'src/app/classes/alert-type';
@Component({
  selector: 'app-broadcasting-editor',
  templateUrl: './broadcasting-editor.component.html',
  styleUrls: ['./broadcasting-editor.component.css']
})
export class BroadcastingEditorComponent implements OnInit {
  @ViewChild('newBroadcastModal') newBroadcastModal;

  broadcast = {
    _id: '',
    createdAt: new Date(),
    name: '',
    template: '',
    restaurantListId: ''
  };

  selectedBroadcast;
  broadcasts;

  previewBroadcast = { ...this.broadcast };

  constructor(private _api: ApiService, private _global: GlobalService) { }

  async ngOnInit() {
    this.refresh();
  }

  async refresh() {
    this.broadcasts = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'broadcast',
      projection: {
        _id: 1,
        name: 1,
        template: 1
      },
      limit: 500
    }).toPromise();
  }

  selectBroadcast(broadcastId) {
    const selectedBroadcast = this.broadcasts.find(b => b._id === broadcastId);
    if(selectedBroadcast) {
      this.broadcast.template = selectedBroadcast.template;
    }
  }

  canPublishBroadcast() {
    return !!this.selectedBroadcast && !! this.broadcast.restaurantListId;
  }

  canAddBroadcast() {
    return !!this.previewBroadcast.name && !!this.previewBroadcast.template;
  }

  async getRestaurant(rtId) {
    try {
      const result = await this._api.get(environment.qmenuApiUrl + 'generic', { resource: 'restaurant', query: { _id: { $oid: rtId } }, projection: { _id: 1, broadcasts: 1 } }).toPromise();
      return result;
    } catch (error) {
      console.error(error);
      return;
    }
  }

  cancelAddBroadcast() {
    this.newBroadcastModal.hide();
    this.resetBroadcast();
  }

  resetBroadcast() {
    this.broadcast.restaurantListId = '';
    this.broadcast.name = '';
    this.broadcast.template = '';

    this.previewBroadcast = { ...this.broadcast };
  }

  async publishBroadcast() {
    try {
      const rtIdsList = this.broadcast.restaurantListId.split(',').map(id => id.trim()).filter(id => id !== '');
      const allRestaurantRequests = rtIdsList.map(id => this.getRestaurant(id));
      const restaurants = await Promise.all(allRestaurantRequests);
      const broadcastsStripped = this.broadcasts.map(b => b._id);
      let allPatchResquests = [];

      for (const restaurant of restaurants) {
        const [_restaurant] = restaurant;
        if (_restaurant) {
          const patchedBroadcasts = [...(_restaurant.broadcasts || []), { _id: this.selectedBroadcast }];
          allPatchResquests.push(await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{ old: { _id: _restaurant._id }, new: { _id: _restaurant._id, broadcasts: patchedBroadcasts } }]).toPromise());
        }
      }

      this.resetBroadcast();

      const restaurantsPatched = await Promise.all(allPatchResquests);
      this._global.publishAlert(AlertType.Success, `Broadcast published`);

    } catch (error) {
      console.error('error publishing broadcast', error);
      this._global.publishAlert(AlertType.Danger, `Error while publishing broadcast.`);
    }
  }

  async createBroadcast() {
    try {
      const broadcastData = {
        createAt: new Date(),
        name: this.previewBroadcast.name,
        template: this.previewBroadcast.template
      };

      const [createdBroadcast] = await this._api.post(environment.qmenuApiUrl + 'generic?resource=broadcast', [broadcastData]).toPromise();

      this.broadcasts.push({_id: createdBroadcast});
      this._global.publishAlert(AlertType.Success, `Broadcast created successfully`);
      await this.refresh();
      this.newBroadcastModal.hide();
      this.resetBroadcast();

    } catch (error) {
      console.error('error creating broadcast', error);
      this._global.publishAlert(AlertType.Danger, `Error while creating broadcast.`);
      this.newBroadcastModal.hide();
      this.resetBroadcast();

    }
  }

}
