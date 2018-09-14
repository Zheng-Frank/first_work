import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { GmbBiz } from '../../../classes/gmb/gmb-biz';
import { GlobalService } from '../../../services/global.service';
import { ApiService } from '../../../services/api.service';
import { environment } from '../../../../environments/environment';
import { AlertType } from '../../../classes/alert-type';

@Component({
  selector: 'app-biz-website-editor',
  templateUrl: './biz-website-editor.component.html',
  styleUrls: ['./biz-website-editor.component.css']
})
export class BizWebsiteEditorComponent implements OnInit, OnChanges {

  @Input() gmbBiz: GmbBiz;
  gmbBizCopy;

  fieldDescriptors = [
    {
      field: "qmenuWebsite", //
      label: "qMenu Managed Website",
      required: false,
      inputType: "text"
    },
    {
      field: "bizManagedWebsite", //
      label: "Restaurant Insisted Website",
      required: false,
      inputType: "text",
      items: []
    }];

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges) {
    if(this.gmbBiz) {
      this.gmbBizCopy = JSON.parse(JSON.stringify(this.gmbBiz));
    }
  }

  async formSubmit(event) {
    try {

      await this._api.patch(environment.adminApiUrl + 'generic?resource=gmbBiz', [
        {
          old: {
            _id: this.gmbBiz._id
          },
          new: {
            _id: this.gmbBiz._id,
            qmenuWebsite: this.gmbBizCopy.qmenuWebsite,
            bizManagedWebsite: this.gmbBizCopy.bizManagedWebsite
          }
        }
      ]).toPromise();
      this._global.publishAlert(AlertType.Success, 'Updated website');
      this.gmbBiz.bizManagedWebsite = this.gmbBizCopy.bizManagedWebsite;
      this.gmbBiz.qmenuWebsite = this.gmbBizCopy. qmenuWebsite;
      event.acknowledge(null);
    }
    catch (error) {
      event.acknowledge(error);
      this._global.publishAlert(AlertType.Danger, 'Error updating website');
    }
  }

}
