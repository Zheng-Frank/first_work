import {Component, OnInit} from '@angular/core';
import {Restaurant} from '@qmenu/ui';
import {Router} from '@angular/router';
import {ApiService} from '../../../services/api.service';
import {GlobalService} from '../../../services/global.service';
import {environment} from '../../../../environments/environment';

declare var google: any;
declare var MarkerClusterer: any;

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

  constructor(private _router: Router, private _api: ApiService, private _global: GlobalService) {
  }

  async ngOnInit() {
    this.initMap();
    await this.getRTs();
    this.drawMarkers();
  }

  async getRTs() {
    this.restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: { disabled: {$ne: true} },
      projection: {
        name: 1,
        'googleAddress.formatted_address': 1,
        'googleAddress.lat': 1,
        'googleAddress.lng': 1,
      }
    }, 10000);
  }


  initMap() {
    this.map = new google.maps.Map(
      document.getElementById('rt-map') as HTMLElement,
      {
        zoom: 4,
        center: {lat: 40.997780, lng: -101.996079},
      }
    );
  }

  drawMarkers() {

    this.infoWindow = new google.maps.InfoWindow();

    this.restaurants.forEach(rt => {
      // @ts-ignore
      let { lat, lng } = rt.googleAddress || {};
      if (!lat || !lng) {
        return;
      }
      const marker = new google.maps.Marker({
        position: {lat, lng},
        title: rt.name,
      });
      marker.addListener('click', () => {
        this.infoWindow.setContent(`<div><h3>${rt.name}</h3><p>${rt.googleAddress.formatted_address}</p></div>`);
        this.infoWindow.open({
          anchor: marker, map: this.map
        });
      });
      this.markers.push(marker);
      this.markerClusterer = new MarkerClusterer(this.map, this.markers, {
        imagePath: 'https://unpkg.com/@googlemaps/markerclustererplus@1.0.3/images/m'
      });
    });
    this.map.addListener('click', () => {
      this.infoWindow.close();
      this.infoWindow.setContent('');
    });
  }

}
