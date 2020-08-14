import { Component, OnInit, Input, OnChanges, ViewChild } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from 'src/environments/environment';
import { Restaurant } from '@qmenu/ui';
import { GlobalService } from 'src/app/services/global.service';
import { AlertType } from 'src/app/classes/alert-type';
import { FormSubmit } from '@qmenu/ui/classes';

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
  selectedChainToAssociate = '';
  chainInEditting = {} as any;
  chainFieldDescriptors = [
    {
      field: "chainName",
      label: "Name",
      required: true,
      placeholder: 'Name of the chain',
      inputType: "text"
    },
    {
      field: "chainHeadquarter",
      label: "Headquarter",
      required: true,
      placeholder: 'Name of the Headquarter',
      inputType: "text"
    }
  ];

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
    this.refresh();
  }

  async refresh() {
    this.chains = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "chain",
      limit: 500
    }).toPromise();

    [this.associatedTo] = this.chains.filter(c => c.restaurants.some(r => r._id === this.restaurant._id));
    this.isAlreadyAssociated = !!this.associatedTo;
  }

  ngOnChanges(params) {
  }

  async addChain(event: FormSubmit) {
    try {
      const { chainName, chainHeadquarter } = event.object;
      const isDuplicated = this.chains.filter(c => c.chainName === chainName && c.chainHeadquarter === chainHeadquarter).length > 0;

      if (!isDuplicated) {
        const chainData = {
          name: chainName,
          headquarter: chainHeadquarter,
          restaurants: []
        };

        // event.acknowledge(null);

        await this._api.post(environment.qmenuApiUrl + 'generic?resource=chain', [chainData]).toPromise();
        this._global.publishAlert(AlertType.Success, 'Chain added succesfuly');
        await this.refresh();
        this.chainInEditting = {};
        this.addChainModal.hide();


      } else {
        event.acknowledge(null);
        this._global.publishAlert(AlertType.Warning, 'Chain already exists. No action took place');
        this.chainInEditting = {};
        this.addChainModal.hide();
      }
    } catch (error) {
      console.error('Error while adding chain', error);
      this._global.publishAlert(AlertType.Danger, 'Error while adding chain');
      this.chainInEditting = {};
    }

  }

  async removeAssociation() {
    try {
      const oldChain = { ...this.associatedTo };

      const newChain = { ...this.associatedTo };
      newChain.restaurants = newChain.restaurants.filter(r => r._id !== this.restaurant._id);

      console.log(oldChain);
      console.log(newChain);

      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=chain', [
        {
          old: oldChain,
          new: newChain
        }
      ]).toPromise();

      this._global.publishAlert(AlertType.Success, 'Association removal was succesful');
      await this.refresh();

    } catch (error) {
      console.error('Error while removing association', error);
      this._global.publishAlert(AlertType.Danger, 'Error while removing association');
    }

  }

  async associateToChain() {
    if (!this.isAlreadyAssociated) {
      const [oldChain] = this.chains.filter(c => c._id === this.selectedChainToAssociate);
      const newChain = { ...oldChain };

      const { _id, name, alias, googleAddress: { formatted_address } } = this.restaurant;
      const chainData = {
        _id,
        name,
        alias,
        googleAddress: {
          formatted_address
        }
      };

      newChain.restaurants = newChain.restaurants ? [...newChain.restaurants, chainData] : [chainData];

      console.log(oldChain);
      console.log(newChain);

      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=chain', [
        {
          old: oldChain,
          new: newChain
          // old: { _id: oldChain._id },
          // new: { _id: newChain._id, restaurants: newChain.restaurants }
        }
      ]).toPromise();

      this._global.publishAlert(AlertType.Success, 'Restauarant associated succesfuly');
      await this.refresh();

    } else {
      this._global.publishAlert(AlertType.Warning, 'Restauarant already associated to a chain');
    }
  }

}
