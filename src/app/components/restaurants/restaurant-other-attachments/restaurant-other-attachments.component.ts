import { TimezoneHelper } from '@qmenu/ui';
import { AlertType } from './../../../classes/alert-type';
import { environment } from 'src/environments/environment';
import { PrunedPatchService } from 'src/app/services/prunedPatch.service';
import { Helper } from 'src/app/classes/helper';
import { HttpClient } from '@angular/common/http';
import { GlobalService } from 'src/app/services/global.service';
import { Component, OnInit, Input } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { User } from 'src/app/classes/user';
import { Restaurant } from '@qmenu/ui';

interface attachmentFile {
  type: string,
  url: string,
  createdAt: Date,
  createdBy: string,
  description: string,
  edit: boolean
}

@Component({
  selector: 'app-restaurant-other-attachments',
  templateUrl: './restaurant-other-attachments.component.html',
  styleUrls: ['./restaurant-other-attachments.component.css']
})
export class RestaurantOtherAttachmentsComponent implements OnInit {


  @Input() restaurant: Restaurant;
  files: attachmentFile[] = [];
  user: User;
  constructor(private _global: GlobalService, private _prunedPatch: PrunedPatchService, private _api: ApiService, private _http: HttpClient) { }

  ngOnInit() {
    this.files = (this.restaurant.otherAttachments || []).map(otherAttachment => ({ ...otherAttachment, edit: false }));
    this.user = new User(this._global.user);
  }

  // displaying 50 front words of the description of the attachment if the length of decription is longer then 50.
  getShortSDecription(description: string) {
    return (description || '').length < 40 ? description : description.substring(0, 40) + "...";
  }

  async saveAttachmentDesc(attachment: attachmentFile) {
    if (!attachment.description) {
      return this._global.publishAlert(AlertType.Danger, `Description can't be null!!`);
    }
    await this.patchOtherAttachments();
    attachment.edit = false;
  }

  async upload(e) {
    let { files } = e.target;
    const data: any = await Helper.uploadImage(files, this._api, this._http);
    let createdAt = TimezoneHelper.getTimezoneDateFromBrowserDate(new Date(), this.restaurant.googleAddress.timezone);
    if (data && data.Location) {
      const url = decodeURIComponent(data.Location);
      this.files.push({
        type: 'image',
        url,
        description: 'Image attachment',
        createdAt,
        createdBy: this.user.username,
        edit: false
      });
      await this.patchOtherAttachments();
      e.target.value = null;
    }
  }

  async patchOtherAttachments() {
    let otherAttachments = this.files.map(attachment => ({ type: attachment.type, url: attachment.url, description: attachment.description, createdAt: attachment.createdAt, createdBy: attachment.createdBy } as AttachmentFile));
    try {
      await this._prunedPatch.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: { _id: this.restaurant['_id'] },
        new: { _id: this.restaurant['_id'], otherAttachments }
      }]).toPromise();
      this._global.publishAlert(AlertType.Success, 'Success!');
      this.restaurant.otherAttachments = otherAttachments;
    } catch (error) {
      // delete new image added in images array if something is wrong
      this.files = (this.restaurant.otherAttachments || []).map(otherAttachment => ({ ...otherAttachment, edit: false }));
      console.log(error);
      this._global.publishAlert(AlertType.Danger, 'Failed!');
    }
  }

  async removeAttachment(i) {
    this.files.splice(i, 1);
    await this.patchOtherAttachments();
  }

}
