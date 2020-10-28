import { Component, OnInit, ViewChild } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { environment } from 'src/environments/environment';
import { GlobalService } from 'src/app/services/global.service';
import { AlertType } from 'src/app/classes/alert-type';
import { ModalComponent } from "@qmenu/ui/bundles/qmenu-ui.umd";
import { PrunedPatchService } from 'src/app/services/prunedPatch.service';
@Component({
  selector: 'app-sop-dashboard',
  templateUrl: './sop-dashboard.component.html',
  styleUrls: ['./sop-dashboard.component.css']
})
export class SopDashboardComponent implements OnInit {
  @ViewChild('editModal') editModal: ModalComponent;

  showingDisabled = true;
  sopInEditing: any = {};
  apiLoading = false;
  fieldDescriptors = [
    {
      field: "name", //
      label: "Name",
      required: true,
      inputType: "text"
    },
    {
      field: "tags", //
      label: "Tags",
      required: false,
      inputType: "text",
      placeholder: "comma separated tags"
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
  tagSelectors = [];
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
    // turn tags into array of strings
    this.sopInEditing.tags = (this.sopInEditing.tags || []).join(", ");
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

    // fillerup tag selectors
    const tags = new Set(this.tagSelectors.map(ts => ts.tag));
    this.sops.map(sop => (sop.tags || []).map(tag => tags.add(tag)));

    [...tags].map(tag => {
      if (!this.tagSelectors.some(ts => ts.tag === tag)) {
        this.tagSelectors.push({
          tag: tag,
          selected: false
        });
      }
    });
    this.tagSelectors.sort((ts1, ts2) => ts1.tag > ts2.tag ? 1 : -1);
  }

  selectTag(ts) {
    ts.selected = !ts.selected;
  }

  isSopRowVisible(sop) {
    const filteredTags = this.tagSelectors.filter(ts => ts.selected).map(ts => ts.tag);
    const isTagsOk = filteredTags.length === 0 || filteredTags.some(tag => (sop.tags || []).indexOf(tag) >= 0);
    const isDisabledOk = !sop.disabled || this.showingDisabled;
    return isTagsOk && isDisabledOk;
  }

  async formSubmit(event) {
    console.log(event);
    try {
      const cloned = JSON.parse(JSON.stringify(this.sopInEditing));
      // turn tags back to array of strings
      cloned.tags = (this.sopInEditing.tags || '').split(",").map(tag => tag.trim()).filter(tag => tag).sort();
      if (this.sopInEditing.hasOwnProperty("_id")) {
        const [oldSop] = this.sops.filter(sop => sop._id === this.sopInEditing['_id']);
        await this._prunedPatch.patch(environment.qmenuApiUrl + "generic?resource=sop", [
          {
            old: oldSop,
            new: cloned
          }]);
      } else {
        await this._api.post(environment.qmenuApiUrl + "generic?resource=sop", [cloned]).toPromise();
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

}
