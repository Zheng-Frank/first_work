import {Component, OnInit} from '@angular/core';
import {Restaurant} from '@qmenu/ui';
import {Router} from '@angular/router';
import {ApiService} from '../../../services/api.service';
import {GlobalService} from '../../../services/global.service';
import {environment} from '../../../../environments/environment';
import {Helper} from '../../../classes/helper';

declare var google: any;

@Component({
  selector: 'app-restaurant-map',
  templateUrl: './restaurant-map.component.html',
  styleUrls: ['./restaurant-map.component.css']
})
export class RestaurantMapComponent implements OnInit {

  restaurants: Restaurant[];
  map = null;
  markers = [];
  infoWindow = null;
  markerClusterer = null;
  state = 'GA';
  agent = '';
  states = [
    'AK', 'AL', 'AR',
    'AZ',
    'CA',
    'CO',
    'CT',
    'DC',
    'DE',
    'FL',
    'GA',
    'HI',
    'IA',
    'ID',
    'IL',
    'IN',
    'KS',
    'KY',
    'LA',
    'MA',
    'MD',
    'ME',
    'MI',
    'MN',
    'MO',
    'MS',
    'MT',
    'NC',
    'ND',
    'NE',
    'NH',
    'NJ',
    'NM',
    'NV',
    'NY',
    'OH',
    'OK',
    'OR',
    'PA',
    'RI',
    'SC',
    'SD',
    'TN',
    'TX',
    'UT',
    'VA',
    'VT',
    'WA',
    'WI',
    'WV',
    'WY'
  ];
  agents = [];
  geocoder = null;

  constructor(private _router: Router, private _api: ApiService, private _global: GlobalService) {
  }

  async ngOnInit() {
    this.initMap();
    await this.initAgents();
    await this.getRTs();
    this.infoWindow = new google.maps.InfoWindow();
    this.drawMarkers();
  }

  async initAgents() {
    let users = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'user',
      query: {
        disabled: {$ne: true},
        username: {$ne: ''}
      },
      projection: {_id: 1, username: 1, roles: 1},
    }, 500);

    this.agents = users.filter(u => u.roles && u.roles.includes('MARKETER'));
    let current = this._global.user;
    // if current user is marketer, default to self
    if (current.roles.includes('MARKETER')) {
      this.agent = current.username;
    }
  }

  async getRTs() {
    this.restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {disabled: {$ne: true}},
      projection: {
        name: 1,
        rateSchedules: 1,
        'googleAddress.formatted_address': 1,
        'googleAddress.administrative_area_level_1': 1,
        'googleAddress.lat': 1,
        'googleAddress.lng': 1,
      }
    }, 10000);
  }

  initMap() {
    this.geocoder = new google.maps.Geocoder();
    this.map = new google.maps.Map(
      document.getElementById('rt-map') as HTMLElement,
      {
        zoom: 3.5,
        center: {lat: 40.997780, lng: -101.996079},
      }
    );
    this.centerTo();
  }

  centerTo(address?) {
    // default address to whole USA
    this.geocoder.geocode( { address: address || 'United States' }, (results, status) => {
      if (status === google.maps.GeocoderStatus.OK) {
        this.map.setCenter(results[0].geometry.location);
      }
    });
  }

  drawMarkers() {

    if (this.infoWindow) {
      this.infoWindow.close();
      this.infoWindow.setContent('');
    }

    this.markers.forEach(m => m.setMap(null));
    this.markers.length = 0;


    this.centerTo(this.state);

    let rts = this.restaurants.filter(x => {
      // @ts-ignore
      return (!this.state || x.googleAddress && x.googleAddress.administrative_area_level_1 === this.state)
        && (!this.agent || Helper.getSalesAgent(x.rateSchedules, this.agents) === this.agent);
    });

    rts.forEach(rt => {
      // @ts-ignore
      let {lat, lng} = rt.googleAddress || {};
      if (!lat || !lng) {
        return;
      }

      const marker = new google.maps.Marker({
        position: {lat, lng},
        title: rt.name,
        map: this.map
      });
      marker.addListener('click', () => {
        this.infoWindow.setContent(`<div><h3>${rt.name}</h3><div>${rt.googleAddress.formatted_address}</div></div>`);
        this.infoWindow.open({
          anchor: marker, map: this.map
        });
      });
      this.markers.push(marker);
    });
    this.map.addListener('click', () => {
      this.infoWindow.close();
      this.infoWindow.setContent('');
    });
  }

}
