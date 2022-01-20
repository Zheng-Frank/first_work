import { AlertType } from './../../../classes/alert-type';
import { environment } from 'src/environments/environment';
import { PrunedPatchService } from 'src/app/services/prunedPatch.service';
import { Helper } from 'src/app/classes/helper';
import { HttpClient } from '@angular/common/http';
import { GlobalService } from 'src/app/services/global.service';
import { Component, OnInit, Input } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';

interface menuImage {
  url: string,
  description: string,
  edit: boolean,
  viewDesc: boolean
}

@Component({
  selector: 'app-restaurant-menu-images',
  templateUrl: './restaurant-menu-images.component.html',
  styleUrls: ['./restaurant-menu-images.component.css']
})
export class RestaurantMenuImagesComponent implements OnInit {

  @Input() restaurant;
  images: menuImage[] = [];
  constructor(private _global: GlobalService, private _prunedPatch: PrunedPatchService, private _api: ApiService, private _http: HttpClient) { }

  ngOnInit() {
    this.images = (this.restaurant.menuImages || []).map(menuImage => ({ ...menuImage, edit: false, viewDesc: false }));
  }

  async saveImageDesc() {
    await this.patchMenuImages();
  }

  async upload(e) {
    let { files } = e.target;
    const data: any = await Helper.uploadImage(files, this._api, this._http);
    if (data && data.Location) {
      const url = decodeURIComponent(data.Location);
      this.images.push({
        url,
        description: 'New image',
        edit: false,
        viewDesc: false
      });
      await this.patchMenuImages();
      e.target.value = null;
    }
  }

  async patchMenuImages() {
    let menuImages = this.images.map(image => ({ url: image.url, description: image.description }));
    try {
      await this._prunedPatch.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: { _id: this.restaurant['_id'] },
        new: { _id: this.restaurant['_id'], menuImages }
      }]).toPromise();
      this._global.publishAlert(AlertType.Success, 'Success!');
      this.restaurant.menuImages = menuImages;
    } catch (error) {
      // delete new image added in images array if something is wrong
      this.images = (this.restaurant.menuImages || []).map(menuImage => ({ ...menuImage, edit: false, viewDesc: false }));
      console.log(error);
      this._global.publishAlert(AlertType.Danger, 'Failed!');
    }
  }

  async removeImage(i) {
    this.images.splice(i, 1);
    await this.patchMenuImages();
  }

}
