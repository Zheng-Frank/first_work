import {Component, OnInit} from '@angular/core';
import {Restaurant} from '@qmenu/ui';
import {Router} from '@angular/router';
import {ApiService} from '../../../services/api.service';
import {GlobalService} from '../../../services/global.service';
import {environment} from '../../../../environments/environment';
import {Helper} from '../../../classes/helper';
import {AlertType} from '../../../classes/alert-type';

declare var google: any;

@Component({
  selector: 'app-restaurant-map',
  templateUrl: './restaurant-map.component.html',
  styleUrls: ['./restaurant-map.component.css']
})
export class RestaurantMapComponent implements OnInit {

  restaurants: Restaurant[] = [];
  map = null;
  markers = [];
  infoWindow = null;
  state = '';
  agent = '';
  states = [
    'AK', 'AL', 'AR', 'AZ', 'CA', 'CO', 'CT', 'DC', 'DE', 'FL', 'GA', 'HI', 'IA', 'ID', 'IL', 'IN', 'KS', 'KY', 'LA', 'MA',
    'MD', 'ME', 'MI', 'MN', 'MO', 'MS', 'MT', 'NC', 'ND', 'NE', 'NH', 'NJ', 'NM', 'NV', 'NY', 'OH', 'OK', 'OR', 'PA', 'RI',
    'SC', 'SD', 'TN', 'TX', 'UT', 'VA', 'VT', 'WA', 'WI', 'WV', 'WY'
  ];
  agents = [];
  geocoder = null;
  keyword = '';
  placeService = null;
  searchedMarkers = [];
  cuisine = '';
  markerRTDict = new Map();
  filteredRTs: Restaurant[] = [];

  constructor(private _router: Router, private _api: ApiService, private _global: GlobalService) {
  }

  async ngOnInit() {
    this.initMap();
    await this.initAgents();
    await this.getRTs();
    this.placeService = new google.maps.places.PlacesService(this.map);
    this.drawMarkers();
    const autocomplete = new google.maps.places.Autocomplete(document.getElementById('address-input'), {
      placeholder: undefined, types: ['geocode'],
      fields: ['geometry.location', 'place_id', 'formatted_address', 'address_components', 'utc_offset_minutes', 'vicinity']
    });
    autocomplete.bindTo('bounds', this.map);
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      this.map.setCenter(place.geometry.location);
      this.searchByAddress(place.geometry.location);
    });
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
    this.agents.sort((x, y) => x.username > y.username ? 1 : -1);
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
        'googleListing.cuisine': 1
      }
    }, 10000);
  }

  get cuisines(): string[] {
    let list = this.restaurants.reduce((a, c) => {
      if (c.googleListing && c.googleListing.cuisine && !a.includes(c.googleListing.cuisine)) {
        return [...a, c.googleListing.cuisine];
      }
      return a;
    }, []);
    list.sort((x, y) => x > y ? 1 : -1);
    return list;
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
    this.infoWindow = new google.maps.InfoWindow();
    this.map.addListener('click', () => {
      this.infoWindow.close();
      this.infoWindow.setContent('');
    });
    this.centerTo();
  }

  centerTo(address?) {
    // default address to whole USA
    this.geocoder.geocode({address: address || 'United States'}, (results, status) => {
      if (status === google.maps.GeocoderStatus.OK) {
        this.map.setCenter(results[0].geometry.location);
      }
    });
  }

  centerToRT(rt) {
    let {googleAddress: {formatted_address, lat, lng}} = rt;
    this.map.setCenter({lat, lng});
    this.infoWindow.setContent(`<div><h3>${rt.name}</h3><div>${formatted_address}</div></div>`);
    this.infoWindow.open({anchor: this.markerRTDict.get(rt._id), map: this.map});
  }

  drawMarkers() {
    this.clearMap(this.markers);
    this.markerRTDict.clear();
    this.centerTo(this.state);

    let rts = this.restaurants.filter(x => {
      // @ts-ignore
      return (!this.state || x.googleAddress && x.googleAddress.administrative_area_level_1 === this.state)
        && (!this.agent || Helper.getSalesAgent(x.rateSchedules, this.agents) === this.agent)
        && (!this.cuisine || x.googleListing && x.googleListing.cuisine === this.cuisine);
    });
    rts.sort((x, y) => x.name > y.name ? 1 : -1);
    this.filteredRTs = rts;

    rts.forEach(rt => {
      // @ts-ignore
      let {lat, lng} = rt.googleAddress || {};
      if (!lat || !lng) {
        return;
      }

      let icon = './assets/icons/marker-blue.svg';
      if (Helper.getSalesAgent(rt.rateSchedules, this.agents) === this._global.user.username) {
        icon = './assets/icons/marker-cyan.svg';
      }

      const marker = new google.maps.Marker({
        position: {lat, lng}, title: rt.name, map: this.map, icon
      });
      marker.addListener('click', () => {
        this.infoWindow.setContent(`<div><h3>${rt.name}</h3><div>${rt.googleAddress.formatted_address}</div></div>`);
        this.infoWindow.open({
          anchor: marker, map: this.map
        });
      });
      this.markers.push(marker);
      this.markerRTDict.set(rt._id, marker);
    });
  }

  markSearched(items) {
    items.forEach(item => {
      this.placeService.getDetails({
        placeId: item.place_id,
        fields: ['formatted_address']
      }, (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
          const marker = new google.maps.Marker({
            position: item.geometry.location,
            title: item.name, map: this.map,
            icon: './assets/icons/marker-red.svg'
          });
          marker.addListener('click', () => {
            this.infoWindow.setContent(`<div><h3>${item.name}</h3><div>${place.formatted_address}</div></div>`);
            this.infoWindow.open({
              anchor: marker, map: this.map
            });
          });
          this.searchedMarkers.push(marker);
        }
      });
    });

  }

  clearMap(markers) {
    if (this.infoWindow) {
      this.infoWindow.close();
      this.infoWindow.setContent('');
    }
    markers.forEach(m => m.setMap(null));
    markers.length = 0;
  }

  search() {
    if (!this.keyword) {
      this._global.publishAlert(AlertType.Warning, 'Please input a keyword to search');
      return;
    }
    this.clearMap(this.searchedMarkers);
    this.placeService.nearbySearch({
      query: this.keyword, bounds: this.map.getBounds(), type: ['restaurant']
    }, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK) {
        this.markSearched(results);
      }
    });
  }

  searchByAddress(location) {
    this.clearMap(this.searchedMarkers);
    this.placeService.nearbySearch({
      location, radius: '50000', type: ['restaurant']
    }, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK) {
        this.markSearched(results);
      }
    });
  }

}
