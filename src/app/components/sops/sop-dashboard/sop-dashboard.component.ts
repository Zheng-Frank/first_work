import { Component, OnInit, ViewChild } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { environment } from 'src/environments/environment';
import { GlobalService } from 'src/app/services/global.service';
import { AlertType } from 'src/app/classes/alert-type';
import {
  ModalComponent,
  AddressPickerComponent
} from "@qmenu/ui/bundles/qmenu-ui.umd";
import { PrunedPatchService } from 'src/app/services/prunedPatch.service';
@Component({
  selector: 'app-sop-dashboard',
  templateUrl: './sop-dashboard.component.html',
  styleUrls: ['./sop-dashboard.component.css']
})
export class SopDashboardComponent implements OnInit {
  @ViewChild('editModal') editModal: ModalComponent;

  showingDisabled = false;
  sopInEditing = {};
  apiLoading = false;
  fieldDescriptors = [
    {
      field: "name", //
      label: "Name",
      required: true,
      inputType: "text"
    },
    {
      field: "version", //
      label: "Version",
      required: true,
      inputType: "text",
      placeholder: "eg. 1.0.0"
    },
    {
      field: "docLink", //
      label: "Docs URL",
      required: false,
      inputType: "text",
    },
    {
      field: "disabled", //
      label: "Disabled",
      required: false,
      inputType: "checkbox"
    },
  ];

  sops = [];
  sopDict = {};
  constructor(private _api: ApiService, private _global: GlobalService, private _prunedPatch: PrunedPatchService) {
    this.populate();
  }

  ngOnInit() {
  }

  addNew() {
    this.sopInEditing = {};
    this.editModal.show();
  }

  edit(sop) {
    this.sopInEditing = JSON.parse(JSON.stringify(sop));
    this.editModal.show();
  }

  async populate() {
    this.apiLoading = true;
    this.sops = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "sop",
      // query: {
      // },
      // projection: { name: 1 },
      limit: 1000000,
      sort: { name: 1 }
    }).toPromise();

    // add count to 
    const sopInstances = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "sop-instance",
      // query: {
      // },
      projection: { "sop._id": 1 },
      limit: 1000000,
      sort: { name: 1 }
    }).toPromise();
    sopInstances.map(si => {
      this.sopInEditing[si.sop._id] = (this.sopInEditing[si.sop._id] || 0) + 1;
    });
    this.apiLoading = false;
  }

  async formSubmit(event) {
    console.log(event);
    try {
      if (this.sopInEditing.hasOwnProperty("_id")) {
        const [oldSop] = this.sops.filter(sop => sop._id === this.sopInEditing['_id']);
        await this._prunedPatch.patch(environment.qmenuApiUrl + "generic?resource=sop", [
          {
            old: oldSop,
            new: this.sopInEditing
          }]);
      } else {
        await this._api.post(environment.qmenuApiUrl + "generic?resource=sop", [this.sopInEditing]).toPromise();
      }
      event.acknowledge(null);
      this.editModal.hide();
      await this.populate();
      this._global.publishAlert(AlertType.Success, "New SOP was added to the list");
    } catch (error) {
      event.acknowledge(error);
    }
  }

  async formDelete(event) {
    try {
      await this._api.delete(environment.qmenuApiUrl + "generic",
        {
          resource: 'sop',
          ids: [this.sopInEditing['_id']]
        }
      ).toPromise();

      this._global.publishAlert(AlertType.Success, 'SOP removed successfully');
      await this.populate();

      event.acknowledge(null);
      this.editModal.hide();
    } catch (error) {
      console.error('Error while removing chain', error);
      event.acknowledge(error);
    }
  }

  toggleDisabled() {

  }

}
