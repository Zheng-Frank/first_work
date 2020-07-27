import { Component, OnInit, Output, EventEmitter, ViewChild } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { ModalComponent } from "@qmenu/ui/bundles/qmenu-ui.umd";
import { Helper } from '../../../classes/helper';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-image-manager',
  templateUrl: './image-manager.component.html',
  styleUrls: ['./image-manager.component.css']
})
export class ImageManagerComponent implements OnInit {
  @Output() onClickMiThumbnail = new EventEmitter();
  @ViewChild('modalZoom') modalZoom: ModalComponent;

  // menuNames = ['a'];
  // images = ['https://spicysouthernkitchen.com/wp-content/uploads/general-tsau-chicken-15.jpg', 'https://www.jocooks.com/wp-content/uploads/2018/04/instant-pot-general-tsos-chicken-1-6-500x375.jpg'];
  uploadImageError;
  clickedMi;
  addingNew = false;
  rows = [];
  images = [];

  constructor(private _api: ApiService, private _global: GlobalService, private _http: HttpClient) { }

  ngOnInit() {
    this.reload();
  }

  thumbnailClick(row) {
    this.clickedMi = row;
    if (row.images) {
      this.images = row.images;
    }
    setTimeout(() => { this.modalZoom.show(); }, 0);
  }
  async reload() {
    this.rows = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'image',
      limit: 6000
    }).toPromise();
  }

  async deleteRow(row) {
    if (confirm('Are you sure to delete?')) {
      await this._api.delete(environment.qmenuApiUrl + 'generic', {
        resource: 'image',
        ids: [row._id]
      }).toPromise();
      this.reload();
    }
  }

  async createNew() {
    this.addingNew = true;
    await this._api.post(environment.qmenuApiUrl + 'generic?resource=image', [{}]).toPromise();
    this.addingNew = false;
    this.reload();
  }

  async updateAliases(row) {
    console.log(row)
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=image', [{
      old: { _id: row._id },
      new: { _id: row._id, aliases: row.aliases }
    }]).toPromise();

  }

  async onUploadImage(event, row) {

    this.uploadImageError = undefined;
    let files = event.target.files;
    try {
      const data: any = await Helper.uploadImage(files, this._api, this._http);
      console.log(data)
      if (data && data.Location) {

        // https://s3.amazonaws.com/chopstresized/128_menuImage/1546284071756.jpg
        // https://chopst.s3.amazonaws.com/menuImage/1475263127544.jpg
        const imageObj = { 
          url: decodeURIComponent(data.Location), 
          url96: 'https://s3.amazonaws.com/chopstresized/96_' + data.Key,
          url128: 'https://s3.amazonaws.com/chopstresized/128_' + data.Key, 
          url192: 'https://s3.amazonaws.com/chopstresized/192_' + data.Key, 
          url256: 'https://s3.amazonaws.com/chopstresized/256_' + data.Key, 
          url512: 'https://s3.amazonaws.com/chopstresized/512_' + data.Key, 
          url768: 'https://s3.amazonaws.com/chopstresized/768_' + data.Key };
        row.images = row.images || [];
        row.images.push(imageObj);
        await this._api.patch(environment.qmenuApiUrl + 'generic?resource=image', [{
          old: { _id: row._id },
          new: { _id: row._id, images: row.images }
        }]).toPromise();
      }
    }
    catch (err) {
      this.uploadImageError = err;
    }

  }

  async deleteImage(imgObj, row) {
    if (confirm('Are you sure to delete?')) {
      row.images = row.images.filter(img => img !== imgObj);
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=image', [{
        old: { _id: row._id },
        new: { _id: row._id, images: row.images }
      }]).toPromise();
    }
  }

}
