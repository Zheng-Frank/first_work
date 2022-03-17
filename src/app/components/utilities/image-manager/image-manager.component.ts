/* tslint:disable:max-line-length */
import { AlertType } from '../../../classes/alert-type';
import { Component, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from '../../../../environments/environment';
import { GlobalService } from '../../../services/global.service';
import { ModalComponent, PagerComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import { Helper } from '../../../classes/helper';
import { HttpClient } from '@angular/common/http';
import { ImageItem } from 'src/app/classes/image-item';
import {Menu, Mi, Restaurant} from '@qmenu/ui';
import {MenuItemEditorComponent} from '../../restaurants/menu-item-editor/menu-item-editor.component';

enum OrderByTypes {
  None = 'Order by?',
  Name = 'Name',
  menuFrequency = 'Menu frequency',
  orderFrequency = 'Order frequency',
  numberAliases = 'Number of aliases',
  numberImages = 'Number of images'
}
enum CommonOrderByModes {
  None = 'Order by?',
  MostFrequentOverAll = 'Most frequent overall',
  MostFrequentForItem = 'Most frequent for item'
}
enum HasImageModes {
  All = 'Has Image?',
  WithImage = 'with image',
  WithoutImage = 'without images'
}

enum ManageModes {
  Standard = 'Standard Images',
  Common = 'Common Images'
}

enum KeywordTypes {
  ItemName = 'Search by Item Name',
  ImageUrl = 'Search by Image URL',
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
  @ViewChild('myPager1') myPager1: PagerComponent;
  @ViewChild('myPager2') myPager2: PagerComponent;
  @ViewChild('miModal') miModal: ModalComponent;
  @ViewChild('miEditor') miEditor: MenuItemEditorComponent;
  // menuNames = ['a'];
  // images = ['https://spicysouthernkitchen.com/wp-content/uploads/general-tsau-chicken-15.jpg', 'https://www.jocooks.com/wp-content/uploads/2018/04/instant-pot-general-tsos-chicken-1-6-500x375.jpg'];
  uploadImageError;
  clickedMi;
  rows = [];
  filterRows = []; // images items needs cuisineType filter,so we need a filterRows to record them.
  images = [];
  cuisineTypes = [];
  cuisineType = '';
  orderBys = [OrderByTypes.None, OrderByTypes.Name, OrderByTypes.menuFrequency, OrderByTypes.orderFrequency, OrderByTypes.numberAliases, OrderByTypes.numberImages];
  orderBy = OrderByTypes.None;
  hasImageModes = [HasImageModes.All, HasImageModes.WithImage, HasImageModes.WithoutImage];
  hasImageMode = HasImageModes.All; // control whether show no image items.
  commonOrderBy = CommonOrderByModes.None;
  commonOrderBys = [CommonOrderByModes.None, CommonOrderByModes.MostFrequentOverAll, CommonOrderByModes.MostFrequentForItem];
  newImages = [];
  calculatingStats = false; // control progress bar actions.
  manageMode = ManageModes.Common;
  keyword = '';
  keywordType = KeywordTypes.ItemName;
  merging = false;
  normalizing = false;
  syncing = false;
  removing = false;
  restaurants = [];
  mis = [];
  filteredMis = [];
  pageIndex = 0;
  pageSize = 200;
  miItem;
  menu: Menu;
  restaurant: Restaurant;
  showUniqueImages = false;

  constructor(private _api: ApiService, private _global: GlobalService, private _http: HttpClient) { }

  async ngOnInit() {
    await this.getRtsWithMenuName();
    await this.reload();
    this.miCount();
  }

  get manageModes() {
    return ManageModes;
  }
  getManageModes() {
    return Object.values(ManageModes);
  }

  getKeywordTypes() {
    if (this.hasImageMode === HasImageModes.WithoutImage) {
      this.keywordType = KeywordTypes.ItemName;
      return [KeywordTypes.ItemName]
    }
    return Object.values(KeywordTypes);
  }
  paged() {
    return this.filteredMis.slice(this.pageIndex * this.pageSize, (this.pageIndex + 1) * this.pageSize)
  }
  filterMi() {
    let kw = this.keyword.trim(), kt = this.keywordType;
    const match = str => (str || '').toLowerCase().includes(kw.toLowerCase());
    this.filteredMis = this.mis.filter(item => {
      let matched = (kt === KeywordTypes.ItemName && match(item.mi.name)) || (kt === KeywordTypes.ImageUrl && item.image && match(item.image.url));
      if (this.hasImageMode === HasImageModes.WithImage) {
        return matched && !!item.image;
      } else if (this.hasImageMode === HasImageModes.WithoutImage) {
        return matched && !item.image;
      }
      return matched;
    });
    if (this.commonOrderBy !== CommonOrderByModes.None) {
      this.filteredMis.sort((b, a) => {
        if (a.image && b.image) {
          if (this.commonOrderBy === CommonOrderByModes.MostFrequentForItem) {
            return a.image.nameCount - b.image.nameCount;
          } else {
            return a.image.allCount - b.image.allCount
          }
        }
        return Number(!!a.image) - Number(!!b.image)
      })
    }
    this.showUniqueImages = kt === KeywordTypes.ItemName && !!kw;
  }
  paginate(index) {
    this.pageIndex = index;
    this.myPager1.currentPageNumber = index;
    this.myPager2.currentPageNumber = index;
  }

  uniqueImages() {
    let data = new Set();
    this.filteredMis.forEach(item => {
      if (item.image) {
        data.add(item.image.url)
      }
    })
    return Array.from(data)
  }

  async getRtsWithMenuName() {
    this.restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      aggregate: [
        {
          $project: {
            name: 1,
            'menus.id': 1,
            'menus.name': 1,
            'menus.mcs.id': 1,
            'menus.mcs.name': 1,
            'menus.mcs.mis.id': 1,
            'menus.mcs.mis.name': 1,
            'menus.mcs.mis.imageObjs.originalUrl': 1,
          }
        },
      ],
    }, 250);
  }

  async removeImagelessItems() {
    this.removing = true;
    const imageItems: ImageItem[] = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'image',
      limit: 600000
    }).toPromise();
    const imagelessOnes = imageItems.filter(i => !i.images || i.images.length === 0);
    console.log(imagelessOnes);
    // if too many, we have to delete in batches because URL has length limit
    for (let i = 0; i < imagelessOnes.length; i += 160) {
      await this._api.delete(environment.qmenuApiUrl + "generic",
        {
          resource: 'image',
          ids: imagelessOnes.slice(i, i + 160).map(item => item._id)
        }
      ).toPromise();
    }

    this.removing = false;
    this.reload();
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
      aliases.forEach(a => reorged.push(...(ImageItem.extractAliases(a).map(x => x.alias))));
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
    const TOP_NUMBER_OF_CUISINES = 12;
    const ITEM_APPEARANCE_THRESHOLD = 20;

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

      sortedEntries.forEach(item => {
        // detect if it's existed!
        const root = item[0];
        const aliasCounts = item[1];
        const rootCount = aliasCounts[root];
        const threshold = Math.ceil(rootCount * 0.05) + 4;
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
        if (distance <= 1) {
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
    switch (this.hasImageMode) {
      case HasImageModes.All:
        break;
      case HasImageModes.WithImage:
        this.filterRows = this.filterRows.filter(item => item.images && item.images.length > 0 &&
          item.images.filter(image => Object.values(image).some(url => url !== "") && image.url192).length > 0);
        break;
      case HasImageModes.WithoutImage:
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

  countMiWithImage() {
    return this.filteredMis.filter(item => !!item.image).length;
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
      case OrderByTypes.Name:
        this.filterRows.sort((a, b) => ((a.aliases || [])[0]) > ((b.aliases || [])[0]) ? 1 : ((a.aliases || [])[0] < (b.aliases || [])[0] ? -1 : 0));
        break;
      case OrderByTypes.menuFrequency:
        this.filterRows.sort((a, b) => (b.menuCount || 0) - (a.menuCount || 0));
        break;
      case OrderByTypes.orderFrequency:
        this.filterRows.sort((a, b) => (b.orderCount || 0) - (a.orderCount || 0));
        break;
      case OrderByTypes.numberAliases:
        this.filterRows.sort((a, b) => (b.aliases || []).length - (a.aliases || []).length);
        break;
      case OrderByTypes.numberImages:
        this.filterRows.sort((a, b) => (b.images && a.images) ? b.images.filter(image => image.url192).length - a.images.filter(image => image.url192).length :
         (b.images && !a.images) ? 1 : (!b.images && a.images) ? -1 : 0);
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
      this.filterRows = this.rows = this.rows.filter(x => !Helper.areObjectsEqual(x, cloneRow));
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

    let repeated = []; // this.hasRepeatAlias(newImages); disabled repeat checking to allow enter anything temporarily

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
    let repeated = []; // this.hasRepeatAlias([row], others); temp disable to allow editing

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
        // 10/6/2021 aws only returns Location, not Key anymore. We need to parse hat
        // Location: https://chopst.s3.amazonaws.com/menuImage/1633533679457.jpg
        // => https://s3.amazonaws.com/chopstresized/96_menuImage/1633533679457.jpg
        const url = decodeURIComponent(data.Location);
        const key = url.split('amazonaws.com/')[1];
        const imageObj = { url };
        const resolutions = [96, 128, 192, 256, 512, 768];
        resolutions.forEach(res => imageObj[`url${res}`] = `https://s3.amazonaws.com/chopstresized/${res}_${key}`);

        const newImages = JSON.parse(JSON.stringify(row.images || []));
        newImages.push(imageObj);
        await this._api.patch(environment.qmenuApiUrl + 'generic?resource=image', [{
          old: { _id: row._id },
          new: { _id: row._id, images: newImages }
        }]).toPromise();

        // because it is going to take a little while for S3 to process the resized images, let's deplay a little bit
        // otherwise 404 for those resized urls
        // we are trying to load 192 images
        const url192 = `https://s3.amazonaws.com/chopstresized/192_${key}`;
        await Helper.waitUtilImageExists(url192);
        // wait another 2 seconds after available
        await new Promise(resolve => setTimeout(resolve, 2000));
        row.images = newImages;
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

  miCount() {
    this.mis = [];
    let countName = {}, countAll = {};
    this.restaurants.forEach(rt => {
      (rt.menus || []).forEach(menu => {
        (menu.mcs || []).forEach(mc => {
          (mc.mis || []).forEach(mi => {
            let item = {mi, rt, menu, mc} as any;
            if (mi.imageObjs && mi.imageObjs[0]) {
              let url = mi.imageObjs[0].originalUrl;
              item.image = {url}
              let key = mi.name.toLowerCase() + '-' + url;
              countName[key] = (countName[key] || 0) + 1;
              countAll[url] = (countAll[url] || 0) + 1
            }
            this.mis.push(item)
          })
        })
      })
    });
    this.mis.forEach(item => {
      if (item.image) {
        item.image.nameCount = countName[item.mi.name.toLowerCase() + '-' + item.image.url];
        item.image.allCount = countAll[item.image.url]
      }
    })
    this.filterMi();
  }

  cleanMiCopy(mi: Mi) {
    const miCopy = new Mi(mi);
    for (let i = miCopy.sizeOptions.length - 1; i >= 0; i--) {
      if (!miCopy.sizeOptions[i].name) {
        miCopy.sizeOptions.splice(i, 1);
      }
    }
    return miCopy;
  }

  async editMi(item) {
    this.miItem = item;
    if (!this.restaurant || this.restaurant._id !== item.rt._id) {
      const [ rt ] = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'restaurant',
        query: {_id: {$oid: item.rt._id}},
        projection: {menus: 1},
        limit: 1
      }).toPromise();
      if (rt) {
        this.restaurant = rt;
      }
    }
    if (!this.restaurant) {
      this._global.publishAlert(AlertType.Danger, 'restaurant not found.');
      return;
    }
    let tempMc, tempMi;
    this.restaurant.menus.forEach(menu => {
      if (menu.id === item.menu.id) {
        menu.mcs.forEach(mc => {
          if (mc.id === item.mc.id) {
            tempMc = mc;
            mc.mis.forEach(mi => {
              if (mi.id === item.mi.id) {
                tempMi = mi;
              }
            })
          }
        })
      }
    })
    this.miEditor.setMi(new Mi(tempMi), this.restaurant.menuOptions, tempMc.menuOptionIds)
    this.miModal.show();
  }

  async removeMiImage(item) {
    if (confirm('Are you sure to delete image on this menu item?')) {
      if (!this.restaurant || this.restaurant._id !== item.rt._id) {
        const [ rt ] = await this._api.get(environment.qmenuApiUrl + 'generic', {
          resource: 'restaurant',
          query: {_id: {$oid: item.rt._id}},
          projection: {menus: 1},
          limit: 1
        }).toPromise();
        if (rt) {
          this.restaurant = rt;
        }
      }
      if (!this.restaurant) {
        this._global.publishAlert(AlertType.Danger, 'restaurant not found.');
        return;
      }
      const {rtIndex, i, j, k} = this.getMenuIndices(item.mi, item);
      let { menus } = this.restaurant;
      const newMenus = JSON.parse(JSON.stringify(menus));
      newMenus[i].mcs[j].mis[k].imageObjs = [];
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: { _id: item.rt._id },
        new: { _id: item.rt._id, menus: newMenus }
      }]).toPromise();
      this._global.publishAlert(AlertType.Success, 'Image removed successfully');
      this.restaurants[rtIndex].menus[i].mcs[j].mis[k].imageObjs = [];
      this.restaurant.menus[i].mcs[j].mis[k].imageObjs = [];
      this.miCount();
    }
  }

  miDone(mi) {
    let { menus } = this.restaurant;
    const newMenus = JSON.parse(JSON.stringify(menus));
    // in case there is category, we search for it
    if (!mi.category) {
      menus.find(m => m.id === this.miItem.menu.id).mcs.map(mc => {
        if (mc.mis && mc.mis.some(mii => mii.id === mi.id)) {
          mi.category = mc.id;
        }
      });
    }
    // old Mi, replace everything
    newMenus.forEach(menu => {
      if (menu.id === this.miItem.menu.id) {
        menu.mcs.forEach(mc => {
          if (mc.id === this.miItem.mc.id) {
            mc.mis.forEach(mii => {
              if (mii.id === mi.id) {
                for (const prop of Object.keys(mii)) {
                  delete mii[prop];
                }
                Object.assign(mii, mi);
              }
            })
          }
        });
      }
    });

    this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
      old: {_id: this.restaurant['_id']},
      new: {_id: this.restaurant['_id'], menus: newMenus}
    }])
      .subscribe(
        result => {
          const {rtIndex, i, j, k} = this.getMenuIndices(mi);
          this.restaurants[rtIndex].menus[i].mcs[j].mis[k].name = mi.name;
          this.restaurants[rtIndex].menus[i].mcs[j].mis[k].imageObjs = JSON.parse(JSON.stringify(mi.imageObjs))
          this.restaurant.menus[i].mcs[j].mis[k] = mi;
          this.miCount();
          this._global.publishAlert(AlertType.Success, 'Updated successfully');
        },
        error => {
          this._global.publishAlert(AlertType.Danger, 'Error updating to DB');
        }
      );
    this.miModal.hide();
  }

  miCancel() {
    this.miModal.hide();
  }

  getMenuIndices(mii, item?) {
    item = item || this.miItem;
    let rtIndex = this.restaurants.findIndex(x => x._id === item.rt._id)
    let i = this.restaurants[rtIndex].menus.findIndex(m => m.id === item.menu.id);
    let j = this.restaurants[rtIndex].menus[i].mcs.findIndex(mc => mc.id === item.mc.id);
    let k = this.restaurants[rtIndex].menus[i].mcs[j].mis.findIndex(mi => mi.id === mii.id);
    return {rtIndex, i, j, k};
  }

  miDelete(mii) {
    let { menus } = this.restaurant;
    const newMenus = JSON.parse(JSON.stringify(menus));
    newMenus.forEach(eachMenu => {
      if (this.miItem.menu.id === eachMenu.id) {
        eachMenu.mcs.map(mc => mc.mis = mc.mis.filter(item => item.id !== mii.id));
      }
    });

    this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
      old: {_id: this.restaurant['_id']},
      new: {_id: this.restaurant['_id'], menus: newMenus}
    }]).subscribe(
        result => {
          const {rtIndex, i, j, k} = this.getMenuIndices(mii);
          this.restaurants[rtIndex].menus[i].mcs[j].mis.splice(k, 1);
          this.restaurant.menus.find(m => m.id === this.miItem.menu.id).mcs.forEach(mc => {
            if (mc.id === this.miItem.mc.id) {
              mc.mis = mc.mis.filter(mi => mi.id !== mii.id)
            }
          })
          this.miCount();
          this._global.publishAlert(AlertType.Success, 'Updated successfully');
        },
        error => {
          this._global.publishAlert(AlertType.Danger, 'Error updating to DB');
        }
      );

    this.miModal.hide();
  }
}
