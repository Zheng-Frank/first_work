import {GlobalService} from '../../../services/global.service';
import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {AlertType} from 'src/app/classes/alert-type';

enum basedOnTypes {
  menuFrequency = 'Menu frequency',
  orderFrequency = 'Order frequency'
}

@Component({
  selector: 'app-scrape-common-items',
  templateUrl: './scrape-common-items.component.html',
  styleUrls: ['./scrape-common-items.component.css']
})
export class ScrapeCommonItemsComponent implements OnInit {

  @Input() existsImageItems; // we need the exisits items to compare whether the new one should be import.
  @Input() cuisineTypes = [];
  cuisineType;
  @Input() restaurants = [];
  @Output() onCancel = new EventEmitter();
  @Output() onImport = new EventEmitter();

  scrapingTopItemsNumber = 500;
  scrapingTopItems = [];
  existingTopItems = [];
  basedOns = [basedOnTypes.menuFrequency, basedOnTypes.orderFrequency];
  basedOn = basedOnTypes.menuFrequency;
  scrapingFlag = false;
  // this following flag is used to avoid user some error behaviors before he scraping
  // (such as change basedOn select before scraping).
  scrapingMenuFlag = false;
  scrapingOrderFlag = false;
  constructor(private _global: GlobalService) {
  }

  ngOnInit() {
  }

  beginScrape() {
    switch (this.basedOn) {
      case basedOnTypes.menuFrequency:
        if (!this.cuisineType) {
          return this._global.publishAlert(AlertType.Danger, 'Please select cuisine type first.');
        }
        // the miName records the count of a menu item which disappear in the restaurant menu.
        // like {
        // name:'mi.name',
        // mi:mi
        // count:1 ,
        // cuisines:[]
        // }
        this.scrapingFlag = true;
        this.scrapingMenuFlag = true;
        this.scrapingOrderFlag = false;
        this.scrapingTopItems.length = 0;
        this.existingTopItems.length = 0;
        // only filter the restaurants of this cuisine type(current selected).
        let mFRestaurants = this.restaurants.filter(restaurant => (restaurant.menus || []).length > 0 && restaurant.googleListing.cuisine === this.cuisineType);
        /**
         * this map likes this:
         * {
         * {
         *  cuisine_mi.name1: 1
         * },
         * {
         *  cuisine_mi.name2: 2
         * },
         * }
         */
        let map = {};
        mFRestaurants.forEach(restaurant => {
          restaurant.menus.forEach(menu => {
            menu.mcs.forEach(mc => {
              mc.mis.forEach(mi => {
                if (mi.name) {
                  let key = this.cuisineType + '_' + mi.name;
                  map[key] = (map[key] || 0) + 1;
                }
              });
            });
          });
        });

        let miNames = [];
        for (const [key, value] of Object.entries(map)) {
          miNames.push({
            name: key.split('_')[1],
            count: value
          });
        }
        // scrapingTopItems only needs the name field that is not in the origin array.
        // sort() method of array api:
        // a - b is ascending order
        // b - a is decending order
        // sort() is void 
        miNames = miNames.sort((a, b) => b.count - a.count).slice(0, Math.min(this.scrapingTopItemsNumber,miNames.length));

        let mFExistsNames = this.existsImageItems.filter(item => item.aliases);

        this.scrapingTopItems = miNames.filter(item => {
          let flag = true;
          let name = item.name.toLowerCase().trim();
          for (let i = 0; i < mFExistsNames.length; i++) {
            let aliases = mFExistsNames[i].aliases;
            for (let j = 0; j < aliases.length; j++) {
              let existName = aliases[j].toLowerCase().trim();
              // Strict case sensitivity is required
              // case 1 ===
              // 2 contains 1 or 1 contains 2
              if (existName === name) {
                if (!this.existingTopItems.includes(mFExistsNames[i])) {
                  // update exist image item cuisine
                  if (mFExistsNames[i].cuisines) {
                    mFExistsNames[i].cuisines = mFExistsNames[i].cuisines.filter(c => c !== this.cuisineType);
                    mFExistsNames[i].cuisines.push(this.cuisineType);
                  } else {
                    mFExistsNames[i].cuisines = [];
                  }
                  // update menu count
                  if (mFExistsNames[i].menuCount) {
                    mFExistsNames[i].menuCount = item.count;
                  } else {
                    mFExistsNames[i].menuCount = 0;
                  }
                  // update order count
                  if (!mFExistsNames[i].orderCount) {
                    mFExistsNames[i].orderCount = 0;
                  }
                  this.existingTopItems.push(mFExistsNames[i]);
                }
                flag = false;
              }
            }
          }
          return flag;
        }).map(item => ({
            aliases: [item.name],
            images: [{
              url: '',
              url96: '',
              url128: '',
              url192: '', // show in table colnum
              url768: ''
            }],
            cuisines: [this.cuisineType],
            orderCount: 0,
            menuCount: item.count
          }
        ));
        setTimeout(() => this.scrapingFlag = false, 5000);
        break;
      case basedOnTypes.orderFrequency:
        if (!this.cuisineType) {
          return this._global.publishAlert(AlertType.Danger, 'Please select cuisine type first.');
        }
        this.scrapingFlag = true;
        this.scrapingOrderFlag = true;
        this.scrapingMenuFlag = false;
        this.scrapingTopItems.length = 0;
        this.existingTopItems.length = 0;
        let oFRestaurants = this.restaurants.filter(restaurant => restaurant.menus && restaurant.googleListing.cuisine === this.cuisineType);
        let ofMiMap = {};
        oFRestaurants.forEach(restaurant => {
          restaurant.menus.forEach(menu => {
            menu.mcs.forEach(mc => {
              mc.mis.forEach(mi => {
                let key = `${this.cuisineType}_${mi.name}`;
                if (mi.name && mi.orderCount && !ofMiMap[key]) {
                }
                ofMiMap[key] = mi.orderCount;
              });
            });
          });
        });

        // scrapingTopItems needs this follow array.
        // field that is in the origin array
        // we filter it and update its' field includes cuisines, orderCount, menuCount
        let oFMis = Object.entries(ofMiMap).map(([k, v]) => ({name: k.split('_')[1], orderCount: v as number}));
        oFMis = oFMis.sort((mi1, mi2) => (mi2.orderCount || 0) - (mi1.orderCount || 0))
          .slice(0, Math.min(oFMis.length, this.scrapingTopItemsNumber));
        let oFExistsNames = this.existsImageItems.filter(item => item.aliases);

        this.scrapingTopItems = oFMis.filter(mi => {
          let flag = true;
          let name = mi.name.toLowerCase().trim();
          for (let i = 0; i < oFExistsNames.length; i++) {
            let aliases = oFExistsNames[i].aliases;
            for (let j = 0; j < aliases.length; j++) {
              let existName = aliases[j].toLowerCase().trim();
              // Strict case sensitivity is required
              // case 1 ===
              // 2 contains 1 or 1 contains 2
              if (existName === name) {
                if (!this.existingTopItems.includes(oFExistsNames[i])) {
                  // update exist image item cuisine
                  if (oFExistsNames[i].cuisines) {
                    oFExistsNames[i].cuisines = oFExistsNames[i].cuisines.filter(c => c !== this.cuisineType);
                    oFExistsNames[i].cuisines.push(this.cuisineType);
                  } else {
                    oFExistsNames[i].cuisines = [];
                  }
                  // if it don't have menuCount, set a default value.
                  if (!oFExistsNames[i].menuCount) {
                    oFExistsNames[i].menuCount = 0;
                  }
                  // update order count
                  if (oFExistsNames[i].orderCount) {
                    oFExistsNames[i].orderCount = mi.orderCount;
                  } else {
                    oFExistsNames[i].orderCount = 0;
                  }

                  this.existingTopItems.push(oFExistsNames[i]);
                }
                flag = false;
              }
            }
          }
          return flag;
        }).map(mi =>
          ({
              aliases: [mi.name],
              images: [{
                url: '',
                url96: '',
                url128: '',
                url192: '',
                url768: ''
              }],
              cuisines: [this.cuisineType],
              orderCount: mi.orderCount,
              menuCount: 0
            }
          ));
        setTimeout(() => this.scrapingFlag = false, 5000);
        break;
      default:
        break;
    }

  }

  cancel() {
    this.onCancel.emit();
  }

  success() {
    this.onImport.emit({
      existItems: this.existingTopItems,
      newItems: this.scrapingTopItems
    });
  }

  isDisabled() {
    return this.scrapingTopItems.length === 0 && this.existingTopItems.length === 0;
  }

}
