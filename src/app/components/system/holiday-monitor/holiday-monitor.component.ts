import { Component, OnInit } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";
import { Restaurant, Hour } from '@qmenu/ui';

@Component({
  selector: 'app-holiday-monitor',
  templateUrl: './holiday-monitor.component.html',
  styleUrls: ['./holiday-monitor.component.css']
})
export class HolidayMonitorComponent implements OnInit {
  rows = [];
  constructor(private _api: ApiService, private _global: GlobalService) { }

  async ngOnInit() {

    const replies = await this._api.get('https://67dqylz39g.execute-api.us-east-2.amazonaws.com/dev/' + 'generic', {
      resource: 'event',
      query: {
        name: 'open-thanksgiving'
      },
      projection: {
        name: 1,
        "params.body.From": 1,
        "params.body.Text": 1
      },
      limit: 6000
    }).toPromise();

    const restaurants: Restaurant[] = (await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      projection: {
        name: 1,
        disabled: 1,
        channels: 1,
        closedHours: 1,
        'googleAddress.timezone': 1
      },
      limit: 6000
    }).toPromise()).map(r => new Restaurant(r));

    this.rows = replies.map(reply => {
      const phone = reply.params.body.From.substring(1);
      const text = reply.params.body.Text;
      const restaurant = restaurants.filter(r => {
        const foundChannel = r.channels && Array.isArray(r.channels) && r.channels.some(c => c.value.replace(/\D/g, '') === phone);
        return foundChannel;

      })[0];

      return ({
        restaurant: restaurant,
        phone: phone,
        text: text
      });
    });
  }

  closedHour = new Hour({
    occurence: 'ONE-TIME',
    fromTime: new Date('Nov 22 2018 5:00:00 GMT-0500'),
    toTime: new Date('Nov 23 2018 5:00:00 GMT-0500'),
    comments: 'Happy Thanksgiving'
  });

  isClosed(restaurant) {
    return (restaurant.closedHours || []).some(h => h.fromTime.valueOf() === this.closedHour.fromTime.valueOf());
  }

  async toggle(restaurant) {
    console.log(restaurant);
    const checkPoint = new Date('Nov 22 2018 17:00:00 GMT-0500'); // 5PM
    if (this.isClosed(restaurant)) {
      restaurant.closedHours = restaurant.closedHours.filter(h => !h.isOpenAtTime(checkPoint));
    } else {
      restaurant.closedHours.push(this.closedHour);
    }

    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
      old: { _id: restaurant._id },
      new: { _id: restaurant._id, closedHours: restaurant.closedHours }
    }]).toPromise();
  }

  matchOpen(row) {
    return row.text.toLowerCase().indexOf('open') >= 0 && !this.isClosed(row.restaurant)
  }

}
