import { AlertType } from './../../../classes/alert-type';
import { map, filter } from 'rxjs/operators';
import { Component, OnInit, Output, EventEmitter, ViewChild } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { ModalComponent } from "@qmenu/ui/bundles/qmenu-ui.umd";
import { Helper } from '../../../classes/helper';
import { HttpClient } from '@angular/common/http';
import { Restaurant } from '@qmenu/ui';
import { stringify } from '@angular/core/src/util';
enum orderByTypes {
  NAME = 'Name',
  // menuFrequency = 'Menu frequency',
  orderFrequency = 'Order frequency'
}
@Component({
  selector: 'app-image-manager',
  templateUrl: './image-manager.component.html',
  styleUrls: ['./image-manager.component.css']
})
export class ImageManagerComponent implements OnInit {
  @Output() onClickMiThumbnail = new EventEmitter();
  @ViewChild('modalZoom') modalZoom: ModalComponent;
  @ViewChild('addRecordsModal') addRecordsModal: ModalComponent;
  // menuNames = ['a'];
  // images = ['https://spicysouthernkitchen.com/wp-content/uploads/general-tsau-chicken-15.jpg', 'https://www.jocooks.com/wp-content/uploads/2018/04/instant-pot-general-tsos-chicken-1-6-500x375.jpg'];
  uploadImageError;
  clickedMi;
  rows = [];
  filterRows = [];// images items needs cuisineType filter,so we need a filterRows to record them.
  images = [];
  cuisineTypes = [];
  cuisineType = '';
  orderBys = [orderByTypes.NAME, orderByTypes.orderFrequency];
  orderBy = orderByTypes.NAME;
  restaurants = [];
  restaurantProjection = {
    _id: 1,
    "googleListing.cuisine": 1,
    "menus.mcs.mis.name": 1,
    "menus.mcs.mis.orderCount": 1
  };
  restaurantQuery = {
    disabled: { $ne: true }
  }

  newImages = [];
  calculatingStats = false; // control progress bar actions.
  noImagesFlag = false; // control whether show no image items. 
  constructor(private _api: ApiService, private _global: GlobalService, private _http: HttpClient) { }

  async ngOnInit() {
    await this.reload();
    await this.loadRestaurants();
  }

  onChangeShowNoImageItems(){
    if(this.noImagesFlag){
      this.filterRows = this.filterRows.filter(item => !(item.images && item.images.length > 0 &&
        item.images.filter(image => Object.values(image).some(url => url !== "") && image.url192).length > 0));
    }
  }

  // create a new row to add a image's aliases
  createNewLine() {
    if (this.newImages.length === 10) {
      return this._global.publishAlert(AlertType.Danger, 'Can not add a new row (10 is maxinum) !');
    }
    let _id = this.newImages.length;
    this.newImages.push({ _id: _id });
  }
  // delete a row using to add a new record of image table
  deleteNewLine(_id) {
    if (this.newImages.length === 1) {
      return this._global.publishAlert(AlertType.Danger, 'Can not remove this row (1 is minium) !');
    }
    this.newImages.splice(this.newImages.findIndex(img => img._id === _id), 1);
  }

  getItemWithImageCount() {
    return this.filterRows.filter(item => item.images && item.images.length > 0 &&
      item.images.filter(image => Object.values(image).some(url => url !== "") && image.url192).length > 0).length;
  }

  filter() {
    if (!this.cuisineType) {
      this.filterRows = this.rows;
    } else {
      this.filterRows = this.rows.filter(row => row.cuisines && row.cuisines.length > 0 && row.cuisines.includes(this.cuisineType));
    }
    this.onChangeOrderBy();
    this.onChangeShowNoImageItems();
  }

  // change order by select value toggle this method.
  onChangeOrderBy() {
    switch (this.orderBy) {
      case orderByTypes.NAME:
        this.filterRows.sort((a, b) => ((a.aliases || [])[0]) > ((b.aliases || [])[0]) ? 1 : ((a.aliases || [])[0] < (b.aliases || [])[0] ? -1 : 0));
        break;
      // case orderByTypes.menuFrequency:
      //   this.filterRows.sort((a, b) => (b.menuCount || 0) - (a.menuCount || 0));
      //   break;
      case orderByTypes.orderFrequency:
        this.filterRows.sort((a, b) => (b.orderCount || 0) - (a.orderCount || 0));
        break;
      default:
        break;
    }
  }

  thumbnailClick(row) {
    this.clickedMi = row;
    if (row.images) {
      this.images = row.images;
    }
    setTimeout(() => { this.modalZoom.show(); }, 0);
  }

  async loadRestaurants() {
    const restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: this.restaurantQuery,
      projection: this.restaurantProjection,
      limit: 10000
    }, 500);
    this.restaurants = restaurants;
    // calculate cuisine types
    const cuisineTypes = this.restaurants.filter(restaurant => restaurant.googleListing && restaurant.googleListing.cuisine && restaurant.googleListing.cuisine !== '').map(restaurant => restaurant.googleListing.cuisine);
    cuisineTypes.forEach(type => (this.cuisineTypes.indexOf(type) === -1 && this.cuisineTypes.push(type)));
    this.cuisineTypes.sort((a, b) => a.localeCompare(b));
    this.cuisineTypes.unshift('');
  }

  async reload() {
    this.rows = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'image',
      limit: 6000
    }).toPromise();
    this.filterRows = this.rows;
    this.filterRows.sort((a, b) => ((a.aliases || [])[0]) > ((b.aliases || [])[0]) ? 1 : ((a.aliases || [])[0] < (b.aliases || [])[0] ? -1 : 0));
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

  openAddRecordsModal() {
    this.newImages.length = 0;
    this.newImages.push({ _id: 0 });
    this.addRecordsModal.show();
  }

  cancelCreateNew() {
    this.addRecordsModal.hide();
  }

  aliasesHasEmpty() {
    return this.newImages.filter(img => img.aliases && img.aliases.trim() === '' || !img.aliases).length > 0;
  }

  async createNew() {
    if (this.aliasesHasEmpty()) {
      return this._global.publishAlert(AlertType.Danger, 'Please check whose aliases is empty !');
    }
    this.newImages = this.newImages.map(img => {
      delete img['_id'];
      img.aliases = img.aliases.split(',').filter(alias => alias).map(alias => alias.trim());
      return img;
    });
    await this._api.post(environment.qmenuApiUrl + 'generic?resource=image', this.newImages).toPromise();
    this.addRecordsModal.hide();
    await this.reload();
    await this.filter();
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
          url768: 'https://s3.amazonaws.com/chopstresized/768_' + data.Key
        };
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
