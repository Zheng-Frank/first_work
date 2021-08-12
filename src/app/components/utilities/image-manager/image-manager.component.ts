/* tslint:disable:max-line-length */
import {AlertType} from '../../../classes/alert-type';
import {Component, EventEmitter, OnInit, Output, ViewChild} from '@angular/core';
import {ApiService} from '../../../services/api.service';
import {environment} from '../../../../environments/environment';
import {GlobalService} from '../../../services/global.service';
import {ModalComponent} from '@qmenu/ui/bundles/qmenu-ui.umd';
import {Helper} from '../../../classes/helper';
import {HttpClient} from '@angular/common/http';

enum orderByTypes {
  NAME = 'Name',
  menuFrequency = 'Menu frequency',
  orderFrequency = 'Order frequency'
}
enum hasImagesTypes {
  All = 'All',
  WithImage = 'with image',
  WithoutImage = 'without images'
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
  filterRows = []; // images items needs cuisineType filter,so we need a filterRows to record them.
  images = [];
  cuisineTypes = [];
  cuisineType = '';
  orderBys = [orderByTypes.NAME, orderByTypes.menuFrequency, orderByTypes.orderFrequency];
  orderBy = orderByTypes.NAME;
  showImagesItemsTypes = [hasImagesTypes.All, hasImagesTypes.WithImage, hasImagesTypes.WithoutImage];
  noImagesFlag = hasImagesTypes.All;// control whether show no image items. 
  restaurants = [];
  restaurantProjection = {
    "googleListing.cuisine": 1
  };
  restaurantQuery = {
    disabled: { $ne: true }
  };

  newImages = [];
  calculatingStats = false; // control progress bar actions.
  constructor(private _api: ApiService, private _global: GlobalService, private _http: HttpClient) { }

  async ngOnInit() {
    await this.reload();
    await this.loadRestaurants();
  }

  isAdmin(){
    this._global.user.roles.indexOf('ADMIN') >= 0;
  }
  
  onChangeShowNoImageItems() {
    switch (this.noImagesFlag) {
      case hasImagesTypes.All:
        this.filterRows = this.filterRows;
        break;
      case hasImagesTypes.WithImage:
        this.filterRows = this.filterRows.filter(item => item.images && item.images.length > 0 &&
          item.images.filter(image => Object.values(image).some(url => url !== "") && image.url192).length > 0);
        break;
      case hasImagesTypes.WithoutImage:
        this.filterRows = this.filterRows.filter(item => !(item.images && item.images.length > 0 &&
          item.images.filter(image => Object.values(image).some(url => url !== "") && image.url192).length > 0));
        break;
      default:
        break;
    }
  }

  // create a new row to add a image's aliases
  createNewLine() {
    this.newImages.push({ _id: Date.now() });
  }
  // delete a row using to add a new record of image table
  deleteNewLine(index) {
    this.newImages.splice(index, 1);
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
      case orderByTypes.menuFrequency:
        this.filterRows.sort((a, b) => (b.menuCount || 0) - (a.menuCount || 0));
        break;
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
    }, 10000);
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
      }).subscribe(r=>this._global.publishAlert(AlertType.Success,
        'Delete successfully !')
        ,e=>{
          this._global.publishAlert(AlertType.Danger,'Fail to delete !');
          console.log(e);
        });
      let cloneRow = JSON.parse(JSON.stringify(row));
      this.filterRows = this.rows =  this.rows.filter(row=>!Helper.areObjectsEqual(row, cloneRow));
      this.filter();
    }
  }

  async scrape() {
    try {
      await this._api.post(environment.appApiUrl + 'events',
        [{
          queueUrl: `https://sqs.us-east-1.amazonaws.com/449043523134/events-v3`,
          event: { name: 'manage-images', params: {  } }
        }]
      ).toPromise();
      this._global.publishAlert(AlertType.Info,
        'Started in background. Refresh in about 1 minute or come back later to check if menus are crawled successfully.');
    } catch (e) {
      this._global.publishAlert(AlertType.Danger, 'Scrape common items failed.');
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

  isAllEmpty() {
    let empties = [];
    this.newImages.forEach((x, i) => {
      let aliases = (x.aliases || '').split(',').filter(a => !!a.trim());
      if (!aliases.length) {
        empties.push({_id: x._id, i});
      }
    });

    if (empties.length > 0) {
      this.newImages = this.newImages.filter(x => !empties.some(e => e._id === x._id));
    }
    if (!this.newImages.length) {
      this._global.publishAlert(AlertType.Danger, 'Please input aliases for each line!');
      return true;
    } else if (empties.length > 0) {
      this._global.publishAlert(AlertType.Warning, `Skipped empty lines ${empties.map(x => x.i).join(', ')}.`);
    }
    return false;
  }

  hasRepeatAlias(newImages, list?) {
    let aliases = new Set((list || this.rows).reduce((a, c) => ([...a, ...(c.aliases || [])]), []));
    let repeated = [];
    newImages.forEach(image => {
      image.aliases.forEach(a => {
        if (aliases.has(a)) {
          repeated.push(a);
        } else {
          aliases.add(a);
        }
      });
    });
    return repeated;
  }

  async createNew() {
    if (this.isAllEmpty()) {
      return;
    }

    let newImages = this.newImages.map(img => ({
      aliases: img.aliases.split(',').filter(alias => alias).map(alias => alias.trim())
    }));

    let repeated = this.hasRepeatAlias(newImages);

    if (repeated.length > 0) {
      return this._global.publishAlert(AlertType.Danger, `Aliases ${repeated.join(',')} repeat!`);
    }

    await this._api.post(environment.qmenuApiUrl + 'generic?resource=image', newImages).toPromise();
    this.addRecordsModal.hide();
    this.newImages = [];
    await this.reload();
    await this.filter();
  }

  async updateAliases(row) {
    let others = this.rows.filter(x => x._id !== row._id);
    let repeated = this.hasRepeatAlias([row], others);

    if (repeated.length > 0) {
      return this._global.publishAlert(AlertType.Danger, `Aliases ${repeated.join(',')} repeat!`);
    }
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
    } catch (err) {
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
