import { map } from 'rxjs/operators';
import { Component, OnInit, Output, Input } from '@angular/core';
import { EventEmitter } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
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
  @Input() cuisineTypes;
  cuisineType;
  @Input() restaurants: Restaurant[] = [];
  @Output() onCancel = new EventEmitter();
  @Output() onImport = new EventEmitter();

  scrapingTopItemsNumber = 500;
  scrapingTopItems = [];
  basedOns = [basedOnTypes.menuFrequency, basedOnTypes.orderFrequency];
  basedOn = basedOnTypes.menuFrequency;
  scrapingFlag = false;
  constructor() { }

  ngOnInit() {
  }
  // the function need two string array.
  compareStringSimilarity(x, y) {
    var z = 0;
    var s = x.length + y.length;;

    x.sort();
    y.sort();
    var a = x.shift();
    var b = y.shift();

    while (a !== undefined && b !== undefined) {
      if (a === b) {
        z++;
        a = x.shift();
        b = y.shift();
      } else if (a < b) {
        a = x.shift();
      } else if (a > b) {
        b = y.shift();
      }
    }
    return z / s * 200;
  }
  beginScrape() {
    switch (this.basedOn) {
      case basedOnTypes.menuFrequency:
        // the miName records the count of a menu item which disappear in the restaurant menu.
        // like {
        // name:'mi.name',
        // count:1 ,
        // cuisines:[]
        // }
        let miNames = [];
        this.scrapingFlag = true;
        this.restaurants.forEach(restaurant => {
          if(restaurant.menus)
            restaurant.menus.forEach(menu => {
            menu.mcs.forEach(mc => {
              mc.mis.forEach(mi => {
                let flag = miNames.some(miName => miName.name === mi.name);
                console.log("cuisines");
                if (mi.name && !flag) {
                  let cuisines = [];
                  // only filter the restaurant cuisine which in cuisine types array.
                  if (restaurant.googleListing.cuisine && restaurant.googleListing.cuisine === this.cuisineType) {
                    cuisines.push(restaurant.googleListing.cuisine);
                  }
                  miNames.push({
                    name: mi.name,
                    mi: mi, // we need its imagesObj as follow.
                    count: 1,
                    cuisines: cuisines
                  });
                } else if (mi.name && flag) {
                  let existNames = miNames.find(miName => miName.name === mi.name);
                  existNames.count++;
                  if (restaurant.googleListing.cuisin && existNames.cuisines.indexOf(restaurant.googleListing.cuisin) === -1) { // this restaurant's cuisine is different from the before one.
                    existNames.cuisines.push(restaurant.googleListing.cuisine);
                  }
                }
              });
            });
          });
          else
            console.log('this restaurant does not have menus');
        });
        // scrapingTopItems only needs the name field that is not in the origin array.
        this.scrapingTopItems = miNames.sort((a, b) => a.count - b.count);
        let existsItems = this.existsImageItems.map(item => item.name);
        this.scrapingTopItems.filter(item => {
          let flag = false;
          let name = item.name.split(' ');
          for (let i = 0; i < existsItems.length; i++) {
            const existsItem = existsItems[i];
            let existName = (existsItem.aliases[0] || '').split(' ');
            if (this.compareStringSimilarity(existName, name) >= 60) { // 60 is ok
              flag = true;
              break;
            }
          }
          return flag;
        }).map(item => ({
          aliases: [item.name],
          //TODO: the size of image also need to handle,and how to?
          images: [{
            url: (item.mi.imageObjs[0].originalUrl || ''),
            url96: (item.mi.imageObjs[0].normalUrl || ''),
            url128: (item.mi.imageObjs[0].normalUrl || ''),
            url768: (item.mi.imageObjs[0].normalUrl || '')
          }]
        }));
        console.log(this.scrapingTopItems[0]);
        debugger
        this.scrapingFlag = false;
        break;
      case basedOnTypes.orderFrequency:
        this.restaurants.forEach(restaurant => {
          restaurant.menus.forEach(menu => {
            menu.mcs.forEach(mc => {
              mc.mis.forEach(mi => {

              });
            });
          });
        });
        break;
      default:
        break;
    }

  }

  cancel() {
    this.onCancel.emit(this.scrapingTopItems);
  }

  success() {
    this.onImport.emit();
  }

  isDisabled() {
    return this.scrapingTopItems.length === 0;
  }

}
