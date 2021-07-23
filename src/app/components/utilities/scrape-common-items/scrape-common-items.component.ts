import { GlobalService } from './../../../services/global.service';
import { map, filter } from 'rxjs/operators';
import { Component, OnInit, Output, Input, OnChanges, SimpleChanges } from '@angular/core';
import { EventEmitter } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { IfDirective } from '@qmenu/ui/directives/if.directive';
import { AlertType } from 'src/app/classes/alert-type';
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

  @Input() existsImageItems;// we need the exisits items to compare whether the new one should be import.
  @Input() cuisineTypes = [];
  cuisineType;
  @Input() restaurants = [];
  @Output() onCancel = new EventEmitter();
  @Output() onImport = new EventEmitter();

  scrapingTopItemsNumber = 5;
  scrapingTopItems = [];
  basedOns = [basedOnTypes.menuFrequency, basedOnTypes.orderFrequency];
  basedOn = basedOnTypes.menuFrequency;
  scrapingFlag = false;
  constructor(private _global: GlobalService) { }

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
        // count:1 ,
        // cuisines:[]
        // }
        this.scrapingFlag = true;
        let mFRestaurants = this.restaurants.filter(restaurant => restaurant.menus && restaurant.googleListing.cuisine === this.cuisineType);
        let mFMis = [];
        mFRestaurants.forEach(restaurant => {
          restaurant.menus.forEach(menu => {
            menu.mcs.forEach(mc => {
              mc.mis.forEach(mi => {
                if (mFMis.indexOf(mi) === -1 && mi.name) {
                  mFMis.push(mi);
                }
              });
            });
          });
        });
        let miNames = [];
        mFMis.forEach(mi => {
          let flag = miNames.some(miName => miName.name === mi.name);
          if (mi.name && !flag) {
            let cuisines = [this.cuisineType];
            // only filter the restaurant cuisine which in cuisine types array.
            miNames.push({
              name: mi.name,
              mi: mi, // we need its imagesObj as follow.
              count: 1,
              cuisines: cuisines
            });
          } else if (mi.name && flag) {
            let existNames = miNames.find(miName => miName.name === mi.name);
            existNames.count++;
          }
        });

        // scrapingTopItems only needs the name field that is not in the origin array.
        miNames = miNames.sort((a, b) => a.count - b.count);
        miNames = this.scrapingTopItemsNumber < miNames.length ? miNames.sort((a, b) => a.count - b.count).slice(0, this.scrapingTopItemsNumber) : miNames.sort((a, b) => a.count - b.count).slice(0, miNames.length);
        let mFExistsNames = this.existsImageItems.filter(item => item.aliases).map(item => item.aliases);
        
        this.scrapingTopItems = miNames.filter(mi => {
          let flag = true;
          let name = mi.name.toLowerCase().trim();
          for (let i = 0; i < mFExistsNames.length; i++) {
            for (let j = 0; j < mFExistsNames[i].length; j++) {
              let existName = mFExistsNames[i][j].toLowerCase().trim();
              // Strict case sensitivity is required
              // case 1 ===
              // 2 contains 1 or 1 contains 2
              if (existName === name || existName.indexOf(name) !== -1 || name.indexOf(existName) !== -1) {
                flag = false; // dissimilar leaves
              }
            }
          }
          return flag;
        }).map(mi => {
          let imageObjs = mi.imageObjs;
          if (imageObjs && imageObjs.length > 0) {
            return {
              aliases: [mi.name],
              //TODO: the size of image also need to handle,and how to?
              images: [{
                url: (mi.imageObjs[0].originalUrl || ''),
                url92: (mi.imageObjs[0].thumbnailUrl || ''),
                url128: (mi.imageObjs[0].normalUrl || ''),
                url768: (mi.imageObjs[0].normalUrl || '')
              }]
            }
          } else {
            return {
              aliases: [mi.name],
              //TODO: the size of image also need to handle,and how to?
              images: [{
                url: '',
                url92: '',
                url128: '',
                url768: ''
              }]
            }
          }
        });
        setTimeout(() => this.scrapingFlag = false, 5000);
        break;
      case basedOnTypes.orderFrequency:
        if (!this.cuisineType) {
          return this._global.publishAlert(AlertType.Danger, 'Please select cuisine type first.');
        }
        this.scrapingFlag = true;
        let oFRestaurants = this.restaurants.filter(restaurant => restaurant.menus && restaurant.googleListing.cuisine === this.cuisineType);

        let oFMis = [];
        oFRestaurants.forEach(restaurant => {
          restaurant.menus.forEach(menu => {
            menu.mcs.forEach(mc => {
              mc.mis.forEach(mi => {
                if (oFMis.indexOf(mi) === -1 && mi.name && mi.orderCount) {
                  oFMis.push(mi);
                }
              });
            });
          });
        });
        // scrapingTopItems only needs the name field that is not in the origin array.
        oFMis = this.scrapingTopItemsNumber < oFMis.length ? oFMis.sort((mi1, mi2) => mi1.orderNumber - mi2.orderNumber).slice(0, this.scrapingTopItemsNumber) : oFMis.sort((mi1, mi2) => mi1.orderNumber - mi2.orderNumber).slice(0, oFMis.length);
        let oFExistsNames = this.existsImageItems.filter(item => item.aliases).map(item => item.aliases);

        this.scrapingTopItems = oFMis.filter(mi => {
          let flag = true;
          let name = mi.name.toLowerCase().trim();
          for (let i = 0; i < oFExistsNames.length; i++) {
            for (let j = 0; j < oFExistsNames[i].length; j++) {
              let existName = oFExistsNames[i][j].toLowerCase().trim();
              // Strict case sensitivity is required
              // case 1 ===
              // 2 contains 1 or 1 contains 2
              if (existName === name || existName.indexOf(name) !== -1 || name.indexOf(existName) !== -1) {
                flag = false; // dissimilar leaves
              }
            }
          }
          return flag;
        }).map(mi => {
          let imageObjs = mi.imageObjs;
          if (imageObjs && imageObjs.length > 0) {
            return {
              aliases: [mi.name],
              //TODO: the size of image also need to handle,and how to?
              images: [{
                url: (mi.imageObjs[0].originalUrl || ''),
                url92: (mi.imageObjs[0].thumbnailUrl || ''),
                url128: (mi.imageObjs[0].normalUrl || ''),
                url768: (mi.imageObjs[0].normalUrl || '')
              }]
            }
          } else {
            return {
              aliases: [mi.name],
              //TODO: the size of image also need to handle,and how to?
              images: [{
                url: '',
                url92: '',
                url128: '',
                url768: ''
              }]
            }
          }
        });
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
    this.onImport.emit(this.scrapingTopItems);
  }

  isDisabled() {
    return this.scrapingTopItems.length === 0;
  }

}
