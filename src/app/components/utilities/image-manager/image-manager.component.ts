/* tslint:disable:max-line-length */
import { AlertType } from '../../../classes/alert-type';
import { Component, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from '../../../../environments/environment';
import { GlobalService } from '../../../services/global.service';
import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import { Helper } from '../../../classes/helper';
import { HttpClient } from '@angular/common/http';
import { ImageItem } from 'src/app/classes/image-item';

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

  newImages = [];
  calculatingStats = false; // control progress bar actions.

  merging = false;
  normalizing = false;
  syncing = false;
  constructor(private _api: ApiService, private _global: GlobalService, private _http: HttpClient) { }

  async ngOnInit() {
    await this.reload();
  }

  async normalizeAliases() {

    this.normalizing = true;
    const imageItems: ImageItem[] = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'image',
      limit: 600000
    }).toPromise();

    // fix temp
    const updatePairs = [];
    // imageItems.forEach(item => {
    //   const aliases = item.aliases || [];
    //   const newAliases = [];
    //   aliases.forEach(a => {
    //     if (Array.isArray(a)) {
    //       newAliases.push(...a);
    //     } else {
    //       newAliases.push(a);
    //     }
    //   });
    //   updatePairs.push({
    //     old: { _id: item._id },
    //     new: { _id: item._id, aliases: newAliases }
    //   })
    // });
    // await this._api.patch(environment.qmenuApiUrl + 'generic?resource=image', updatePairs).toPromise();

    // if (new Date()) throw "";


    imageItems.forEach(item => {
      const aliases = item.aliases || [];
      const reorged = [];
      aliases.forEach(a => reorged.push(...(ImageItem.extractAliases(a).map(a => a.alias))));
      const newAliases = [... new Set(reorged)];
      const areTheSame = aliases.length === newAliases.length && aliases.every(a => newAliases.indexOf(a) >= 0);
      if (!areTheSame) {
        updatePairs.push({
          old: { _id: item._id },
          new: { _id: item._id, aliases: newAliases }
        });
      }
    });

    if (updatePairs.length > 0) {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=image', updatePairs).toPromise();
      this._global.publishAlert(AlertType.Success, `Updated ${updatePairs.length}! Check console for details`);
      console.log('updated items', updatePairs);
    } else {
      this._global.publishAlert(AlertType.Info, `No aliases is updated`);
    }
    await this.reload();
    this.normalizing = false;
  }

  async mergeDuplicates() {
    this.merging = true;
    const imageItems: ImageItem[] = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'image',
      limit: 600000
    }).toPromise();


    // let's sort by popularity (menuCount) so that we always merge least popular items to most popular ones
    imageItems.sort((i2, i1) => (i1.menuCount || 0) - (i2.menuCount || 0));

    const removedItems = [];
    const updatedItemsSet = new Set();

    for (let i = imageItems.length - 1; i > 0; i--) {
      for (let j = i - 1; j >= 0; j--) {
        const x = imageItems[i];
        const y = imageItems[j];
        if (x.aliases.some(a1 => y.aliases.some(a2 => ImageItem.areAliasesSame(a1, a2)))) {
          removedItems.push(x);
          updatedItemsSet.add(y);
          y.aliases = [...new Set([...x.aliases, ...y.aliases])];
          y.cuisines = [...new Set([...(x.cuisines || []), ...(y.cuisines || [])])];
          y.images = [...(x.images || []), ...(y.images || [])];
          y.menuCount = (y.menuCount || 0) + (x.menuCount || 0);
        }
      }
    }

    const updatedItems = [...updatedItemsSet] as any;

    if (removedItems.length > 0) {
      console.log('removed', removedItems, 'updated', updatedItems);
      if (confirm('Please check console for duplicates. Are you sure to merge?')) {
        await this._api.patch(environment.qmenuApiUrl + 'generic?resource=image', updatedItems.map(i => ({
          old: { _id: i._id },
          new: {
            _id: i._id,
            menuCount: i.menuCount,
            images: i.images,
            cuisines: i.cuisines,
            aliases: i.aliases
          }
        }))).toPromise();

        await this._api.delete(environment.qmenuApiUrl + "generic",
          {
            resource: 'image',
            ids: removedItems.map(i => i._id)
          }
        ).toPromise();

        this.reload();
        this._global.publishAlert(AlertType.Danger, `Duplicates found and merged: ${removedItems.length}`, 120000);
      }

    } else {
      this._global.publishAlert(AlertType.Success, 'No duplicates found');
    }
    this.merging = false;
  }

  async syncFromMenuItems() {
    this.syncing = true;
    const NUMBER_OF_RESTAURANTS = 4000;
    const TOP_NUMBER_OF_CUISINES = 20;
    const ITEM_APPEARANCE_THRESHOLD = 10;

    const restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: "restaurant",
      sort: { _id: -1 },
      query: {
        disabled: { $ne: true }, 'menus.mcs.mis.name': { $exists: true }, 'googleListing.cuisine': { $exists: true }
      },
      projection: { 'menus.mcs.mis.name': 1, 'menus.mcs.mis.orderCount': 1, 'googleListing.cuisine': 1 },
      limit: NUMBER_OF_RESTAURANTS,
    }, 600); // 600 is a tested good batch size (upper bound)

    const cuisineRts = {};
    restaurants.forEach(rt => {
      const cuisine = rt.googleListing.cuisine;
      cuisineRts[cuisine] = cuisineRts[cuisine] || [];
      cuisineRts[cuisine].push(rt);
    });

    const rankedCuisineRts = Object.entries(cuisineRts).sort((b, a) => a[1]['length'] - b[1]['length']).slice(0, TOP_NUMBER_OF_CUISINES); // top cuisines

    // only cout 3+ as grouped???
    const aliasGroups = {};
    const cuisineGroupedAliases = rankedCuisineRts.map((entry, index) => {
      const cuisine = entry[0];
      const rts = entry[1] as any[];

      const names = new Set();
      rts.forEach(rt => rt.menus.forEach(menu => menu && menu.mcs.forEach(mc => mc && mc.mis.forEach(mi => mi && mi.name && names.add(mi.name)))));
      const clusters = {};
      names.forEach(name => {
        const aliases = ImageItem.extractAliases(name).map(al => al.alias);
        aliases.forEach(a => {
          clusters[a] = clusters[a] || {};
          aliases.forEach(a2 => clusters[a][a2] = (clusters[a][a2] || 0) + 1);
        });
      });

      // remove obvious least used names
      Object.keys(clusters).forEach(key => {
        if (clusters[key][key] < ITEM_APPEARANCE_THRESHOLD) {
          delete clusters[key];
        }
      });

      // now sort them!
      const sortedEntries = Object.entries(clusters).sort((b, a) => a[1][a[0]] - b[1][b[0]]);

      sortedEntries.forEach(entry => {
        // detect if it's existed!
        const root = entry[0];
        const aliasCounts = entry[1];
        const rootCount = aliasCounts[root];
        const threshold = Math.ceil(rootCount * 0.02) + 3;
        const filteredAliases = Object.keys(aliasCounts).filter(key => aliasCounts[key] >= threshold);
        const rootKey = Object.keys(aliasGroups).find(r => filteredAliases.some(a => aliasGroups[r].aliases.has(a)));
        if (rootKey) {
          filteredAliases.forEach(a => {
            aliasGroups[rootKey].cuisines.add(cuisine);
            aliasGroups[rootKey].aliases.add(a);
            aliasGroups[rootKey].count = aliasGroups[rootKey].count + aliasCounts[a];

          });
        } else {
          aliasGroups[root] = {
            cuisines: new Set([cuisine]),
            count: filteredAliases.reduce((sum, alias) => sum + aliasCounts[alias], 0),
            aliases: new Set(filteredAliases)
          }
        };
      });
    });

    console.log('grouped, before', aliasGroups, Object.keys(aliasGroups).length);

    // use levenshteinDistance distance to judge if two aliases are actually the same thing
    Object.keys(aliasGroups).forEach(a1 => Object.keys(aliasGroups).forEach(a2 => {
      if (aliasGroups[a1] && a1 !== a2 && a1.length >= 8) {
        const distance = ImageItem.levenshteinDistance(a1, a2);
        if (distance <= 2) {
          console.log(distance, a1, a2)
          aliasGroups[a1].count = aliasGroups[a1].count + aliasGroups[a2].count;
          aliasGroups[a1].cuisines = new Set([...aliasGroups[a1].cuisines, ...aliasGroups[a2].cuisines]);
          aliasGroups[a1].aliases = new Set([...aliasGroups[a1].aliases, ...aliasGroups[a2].aliases]);
          delete aliasGroups[a2];
        }
      }
    }));

    // now we need to either 
    // a. merge with existing image items, or
    // b. create new image item
    const imageItems: ImageItem[] = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'image',
      limit: 600000
    }).toPromise();

    const newImageItems = [];
    const updatePairs = [];

    for (const aliasRoot in aliasGroups) {
      const aliasItem = aliasGroups[aliasRoot];
      const matchedImageItem = imageItems.find(ii => ii.aliases.some(alias => aliasItem.aliases.has(alias)));

      if (matchedImageItem) {
        // either aliases, cuisines, or menuCount could be different!
        const aliasesEqual = matchedImageItem.aliases.length === aliasItem.aliases.size && matchedImageItem.aliases.every(a => aliasItem.aliases.has(a));
        const cuisinesEqual = (matchedImageItem.cuisines || []).length === aliasItem.cuisines.size && matchedImageItem.cuisines.every(c => aliasItem.cuisines.has(c));
        const menuCountEqual = matchedImageItem.menuCount === aliasItem.count;

        if (!aliasesEqual || !cuisinesEqual || !menuCountEqual) {
          console.log("found updates!", aliasRoot, matchedImageItem);
          updatePairs.push({
            old: { _id: matchedImageItem._id },
            new: {
              _id: matchedImageItem._id,
              menuCount: aliasItem.count,
              aliases: [...new Set([...(matchedImageItem.aliases || []), ...aliasItem.aliases])],
              cuisines: [...new Set([...(matchedImageItem.cuisines || []), ...aliasItem.cuisines])],
            }
          });
        }
      } else {
        // create new
        newImageItems.push({
          aliases: [...aliasItem.aliases],
          cuisines: [...aliasItem.cuisines],
          images: [],
          menuCount: aliasItem.count
        });
      }
    }

    if (newImageItems.length > 0) {
      await this._api.post(environment.qmenuApiUrl + 'generic?resource=image', newImageItems).toPromise();
      this._global.publishAlert(AlertType.Success, `Added ${newImageItems.length}! Check console for details`);
      console.log('new items', newImageItems);
    }

    if (updatePairs.length > 0) {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=image', updatePairs).toPromise();
      this._global.publishAlert(AlertType.Success, `Updated ${updatePairs.length}! Check console for details`);
      console.log('updated items', updatePairs);
    }
    await this.reload();
    this.syncing = false;
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

  async reload() {
    this.rows = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'image',
      limit: 6000
    }).toPromise();
    this.filterRows = this.rows;
    this.filterRows.sort((a, b) => ((a.aliases || [])[0]) > ((b.aliases || [])[0]) ? 1 : ((a.aliases || [])[0] < (b.aliases || [])[0] ? -1 : 0));

    const cuisineTypes: Set<string> = new Set();
    this.rows.forEach(imageItem => (imageItem.cuisines || []).forEach(c => cuisineTypes.add(c)));

    this.cuisineTypes = [...cuisineTypes].sort((a, b) => a.localeCompare(b));
    this.cuisineTypes.unshift('');

  }

  async deleteRow(row) {
    if (confirm('Are you sure to delete?')) {
      await this._api.delete(environment.qmenuApiUrl + 'generic', {
        resource: 'image',
        ids: [row._id]
      }).subscribe(r => this._global.publishAlert(AlertType.Success,
        'Delete successfully !')
        , e => {
          this._global.publishAlert(AlertType.Danger, 'Fail to delete !');
          console.log(e);
        });
      let cloneRow = JSON.parse(JSON.stringify(row));
      this.filterRows = this.rows = this.rows.filter(row => !Helper.areObjectsEqual(row, cloneRow));
      this.filter();
    }
  }

  async scrape() {
    try {
      await this._api.post(environment.appApiUrl + 'events',
        [{
          queueUrl: `https://sqs.us-east-1.amazonaws.com/449043523134/events-v3`,
          event: { name: 'manage-images', params: {} }
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
        empties.push({ _id: x._id, i });
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
