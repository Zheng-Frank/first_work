import { Component, OnInit } from '@angular/core';
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
  broadcast = {
    _id: '',
    createdAt: new Date(),
    name: '',
    template: '',
    restaurantListId: ''
  };

  broadcasts;

  constructor(private _api: ApiService, private _global: GlobalService) { }

  async ngOnInit() {
    this.broadcasts = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'broadcast',
      projection: {
        _id: 1
      },
      limit: 500
    }).toPromise();
  }


  canPublishBroadcast() {
    return !!this.broadcast.name && !!this.broadcast.template && !!this.broadcast.restaurantListId;
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

  resetBroadcast() {
    this.broadcast.restaurantListId = '';
    this.broadcast.name = '';
    this.broadcast.template = '';
  }

  async publishBroadcast() {
    try {
      const broadcastData = {
        createAt: new Date(),
        name: this.broadcast.name,
        template: this.broadcast.template
      };

      const [createdBroadcast] = await this._api.post(environment.qmenuApiUrl + 'generic?resource=broadcast', [broadcastData]).toPromise();
      this.broadcasts.push({_id: createdBroadcast});

      const rtIdsList = this.broadcast.restaurantListId.split(',').map(id => id.trim()).filter(id => id !== '');
      const allRestaurantRequests = rtIdsList.map(id => this.getRestaurant(id));
      const restaurants = await Promise.all(allRestaurantRequests);
      const broadcastsStripped = this.broadcasts.map(b => b._id);
      let newIds = [];
      let allPatchResquests = [];

      for (const restaurant of restaurants) {
        const [_restaurant] = restaurant;
        newIds = broadcastsStripped.filter(x => !_restaurant.broadcasts.map(b => b._id).includes(x)).concat(_restaurant.broadcasts.map(b => b._id).filter(x => !broadcastsStripped.includes(x)));
        const _newIds = newIds.map(n => { return { _id: n } });
        const patchedBroadcasts = [..._restaurant.broadcasts, ..._newIds];
        allPatchResquests.push(await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{ old: { _id: _restaurant._id }, new: { _id: _restaurant._id, broadcasts: patchedBroadcasts } }]).toPromise());
      }

      this.resetBroadcast();

      const restaurantsPatched = await Promise.all(allPatchResquests);
      this._global.publishAlert(AlertType.Success, `Broadcast published`);

    } catch (error) {
      console.error('error publishing broadcast', error);
      this._global.publishAlert(AlertType.Danger, `Error while publishing broadcast.`);
    }
  }

}
