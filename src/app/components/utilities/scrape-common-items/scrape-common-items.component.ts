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
  existingTopItems = [];
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
        // mi:mi
        // count:1 ,
        // cuisines:[]
        // }
        this.scrapingFlag = true;
        this.scrapingTopItems.length = 0;
        this.existingTopItems.length = 0;
        // only filter the restaurants of this cuisine type(current selected).
        let mFRestaurants = this.restaurants.filter(restaurant => (restaurant.menus || []).length > 0 && restaurant.googleListing.cuisine === this.cuisineType);
        if(mFRestaurants.length > 500){
          mFRestaurants = mFRestaurants.slice(0,500);
        }
        let miNames = [];
        mFRestaurants.forEach(restaurant => {
          restaurant.menus.forEach(menu => {
            menu.mcs.forEach(mc => {
              mc.mis.forEach(mi => {
                if(mi.name){
                  let item = miNames.find(x => x.name === mi.name);
                  if (!item && mi.name) {
                    let cuisines = [this.cuisineType];
                    miNames.push({
                      name: mi.name,
                      mi: mi, // we need its orderCount as follow.
                      count: 1,
                      cuisines: cuisines
                    });
                  }else{
                    item.count++;
                  }
                }
              });
            });
          });
        });
        
        // scrapingTopItems only needs the name field that is not in the origin array.
        miNames = miNames.sort((a, b) => a.count - b.count);
        miNames = this.scrapingTopItemsNumber < miNames.length ?
          miNames.slice(0, this.scrapingTopItemsNumber) : miNames.slice(0);
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
                  if (mFExistsNames[i].orderCount) {
                    mFExistsNames[i].orderCount = item.mi.orderCount
                  } else {
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
            url768: ''
          }],
          url192: '', // show in table colnum
          cuisines: [this.cuisineType],
          orderCount: item.mi.orderCount,
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
        this.scrapingTopItems.length = 0;
        this.existingTopItems.length = 0;
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
        if(oFRestaurants.length > 2000){
          oFRestaurants = oFRestaurants.slice(0,2000);
        }
        // scrapingTopItems needs this follow array.
        // field that is in the origin array
        // we filter it and update its' field includes cuisines, orderCount, menuCount
        oFMis = this.scrapingTopItemsNumber < oFMis.length ? oFMis.sort((mi1, mi2) => mi1.orderNumber - mi2.orderNumber).slice(0, this.scrapingTopItemsNumber) : oFMis.sort((mi1, mi2) => mi1.orderNumber - mi2.orderNumber).slice(0, oFMis.length);
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
              url768: ''
            }],
            url192: '',
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
