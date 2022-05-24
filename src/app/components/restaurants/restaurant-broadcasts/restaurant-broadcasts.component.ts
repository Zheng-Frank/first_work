import { environment } from './../../../../environments/environment';
import { ApiService } from 'src/app/services/api.service';
import { Input } from '@angular/core';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-restaurant-broadcasts',
  templateUrl: './restaurant-broadcasts.component.html',
  styleUrls: ['./restaurant-broadcasts.component.css']
})
export class RestaurantBroadcastsComponent implements OnInit {

  @Input() restaurant;
  rows = [];
  columnDescriptors = [
    {
      label: '#'
    },
    {
      label: "Broadcast Name",
      paths: ['name'],
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },
    {
      label: "Text"
    },
    {
      label: "Acknowledged At"
    }
  ];
  pagination = false;

  constructor(private _api: ApiService) { }

  async ngOnInit() {
    await this.populateBroadcasts();
  }

  async populateBroadcasts() {
    const broadcasts = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'broadcast',
      projection: {
        _id: 1,
        name: 1,
        template: 1
      },
      limit: 500
    }).toPromise();
    (this.restaurant.broadcasts || []).forEach(broadcast => {
      const b = (broadcasts || []).find( b => b._id === broadcast._id) || {};
      let item = {
        name: b.name,
        text: b.template,
        acknowledged: broadcast.acknowledged,
        acknowledgedAt: broadcast.acknowledgedAt
      }
      this.rows.push(item);
    });
  }

}
