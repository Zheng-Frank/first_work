import { Component, OnInit, Input, OnChanges, ViewChild } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from 'src/environments/environment';
import { Restaurant } from '@qmenu/ui';
import { GlobalService } from 'src/app/services/global.service';

// A -  Demo        - 58ba1a8d9b4e441100d8cdc1
// B -  Panda Cafe  - 57c4dc97a941661100c642b4
// C -  Panda II    - 5ca2e059891d10cbde2bfe14
// D -  China House - 589e0f6c1f7dc81100f00322
// E -  Pearl Lian  - 5a2b1654f159fa1400902cc9

@Component({
  selector: 'app-restarant-chains',
  templateUrl: './restarant-chains.component.html',
  styleUrls: ['./restarant-chains.component.css']
})
export class RestarantChainsComponent implements OnInit, OnChanges {
  @ViewChild('addChainModal') addChainModal;
  @Input() restaurant: Restaurant;

  chains = [];
  isAlreadyAssociated = false;
  associatedTo;

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
    this.refresh();
  }

  async refresh() {
    this.chains = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "chain",
      limit: 500
    }).toPromise();

    console.log(this.chains);

    this.associatedTo = this.chains.find(c => c.restaurants.some(r => r._id === this.restaurant._id));
    if (this.associatedTo) this.associatedTo.restaurants = this.associatedTo.restaurants ? this.associatedTo.restaurants.filter(r => r._id !== this.restaurant._id) : {};
    this.isAlreadyAssociated = !!this.associatedTo;
  }

  ngOnChanges(params) {
  }

}
