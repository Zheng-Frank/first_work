import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { GlobalService } from 'src/app/services/global.service';
import { environment } from 'src/environments/environment';
import { FormSubmit } from '@qmenu/ui/classes';
import { AlertType } from 'src/app/classes/alert-type';

@Component({
  selector: 'app-chains-dashboard',
  templateUrl: './chains-dashboard.component.html',
  styleUrls: ['./chains-dashboard.component.css']
})
export class ChainsDashboardComponent implements OnInit {
  @ViewChild("addChainModal") addChainModal;

  chains = [];
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
      required: false,
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
      sort: {
        name: 1
      },
      limit: 3000
    }).toPromise();

  }

  async handleRemoveChain(chainId) {
    try {
      await this._api.delete(
        environment.qmenuApiUrl + "generic",
        {
          resource: 'chain',
          ids: [chainId]
        }
      ).toPromise();

      this._global.publishAlert(AlertType.Success, 'Chain removed successfully');
      await this.refresh();

    } catch (error) {
      console.error('Error while removing chain', error);
      this._global.publishAlert(AlertType.Danger, 'Error while removing chain');
    }
  }

  async handleRemoveAssociatedRestaurant(event) {
    try {
      const { chainId, restaurantId } = event;
      const [oldChain] = this.chains.filter(c => c._id === chainId);

      if (oldChain) {
        const newChain = { ...oldChain };
        newChain.restaurants = newChain.restaurants.filter(r => r._id !== restaurantId);

        await this._api.patch(environment.qmenuApiUrl + 'generic?resource=chain', [
          {
            old: oldChain,
            new: newChain
          }
        ]).toPromise();

        this._global.publishAlert(AlertType.Success, 'Association removal was succesful');
        await this.refresh();
      } else {
        this._global.publishAlert(AlertType.Danger, 'Chain does not exists');
      }


    } catch (error) {
      console.error('Error while removing association', error);
      this._global.publishAlert(AlertType.Danger, 'Error while removing association');
    }

  }

  async handleAssociateToChain(event) {
    const { chainId, restaurantIdToAssociate } = event;
    const [restaurant] = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query: {
        _id: { $oid: restaurantIdToAssociate }
      },
      projection: {
        _id: 1,
        name: 1,
        alias: 1,
        "googleAddress.formatted_address": 1
      },
      limit: 100000
    }).toPromise();


    if(!restaurant) {
      this._global.publishAlert(AlertType.Danger, 'Restaurant not found');
      return;
    }

    const [associatedWith] = this.chains.filter(c => c.restaurants.some(r => r._id === restaurantIdToAssociate));
    const isAlreadyAssociated = !!associatedWith;

    if (!isAlreadyAssociated) {
      const [oldChain] = this.chains.filter(c => c._id === chainId);
      const newChain = { ...oldChain };

      const { _id, name, alias, googleAddress: { formatted_address } } = restaurant;
      const chainData = {
        _id,
        name,
        alias,
        googleAddress: {
          formatted_address
        }
      };

      newChain.restaurants = newChain.restaurants ? [...newChain.restaurants, chainData] : [chainData];

      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=chain', [
        {
          old: oldChain,
          new: newChain
        }
      ]).toPromise();

      this._global.publishAlert(AlertType.Success, 'Restauarant associated successfully');
      await this.refresh();
    } else {
      this._global.publishAlert(AlertType.Warning, 'Restauarant already associated to a chain');
    }
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

        event.acknowledge(null);

        await this._api.post(environment.qmenuApiUrl + 'generic?resource=chain', [chainData]).toPromise();
        this._global.publishAlert(AlertType.Success, 'Chain added successfully');
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

}
