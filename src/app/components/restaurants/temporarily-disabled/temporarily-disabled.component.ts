import { TimezoneHelper } from '@qmenu/ui';
import { Component, OnInit } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { ApiService } from 'src/app/services/api.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-temporarily-disabled',
  templateUrl: './temporarily-disabled.component.html',
  styleUrls: ['./temporarily-disabled.component.css']
})
export class TemporarilyDisabledComponent implements OnInit {

  restaurants: Restaurant[] = [];
  pagination = true;
  apiLoading = false;

  columnDescriptors = [
    {
      label: "#"
    },
    {
      label: "Restaurant"
    },
    {
      label: 'Timezone (as Offset to EST)'
    },
    {
      label: "Comeback Date",
      paths: ['comebackDate'],
      sort: (a, b) => a.valueOf() - b.valueOf()
    }
  ];
  now = new Date();
  constructor(private _api: ApiService) { }

  ngOnInit() {
    this.refresh();
  }

  // our salesperson only wants to know what is the time offset
  // between EST and the location of restaurant
  getTimeOffsetByTimezone(timezone) {
    if (timezone) {
      let localTime = TimezoneHelper.getTimezoneDateFromBrowserDate(new Date(this.now), timezone);
      let ESTTime = TimezoneHelper.getTimezoneDateFromBrowserDate(new Date(this.now), 'America/New_York');
      let offset = (ESTTime.valueOf() - localTime.valueOf()) / (3600 * 1000);
      return offset > 0 ? "+" + offset.toFixed(0) : offset.toFixed(0);
    } else {
      return 'N/A';
    }
  }

  getTimezoneCity(timezone) {
    return (timezone || '').split('/')[1] || '';
  }

  async refresh() {
    this.restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        disabled: true,
        comebackDate: { $exists: true }
      },
      projection: {
        _id: 1,
        "googleAddress.formatted_address": 1,
        "googleAddress.timezone": 1,
        name: 1,
        disabled: 1,
        comebackDate: 1
      }
    }, 5000);

    this.restaurants.map(rt => {
      if (rt['comebackDate'] !== null) {
        rt['comebackDate'] = new Date(rt['comebackDate']);
      }
    })
  }


}
