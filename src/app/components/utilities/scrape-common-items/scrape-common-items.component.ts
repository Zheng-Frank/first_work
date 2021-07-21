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
          restaurant.menus.forEach(menu => {
            menu.mcs.forEach(mc => {
              mc.mis.forEach(mi => {
                let flag = miNames.some(miName => miName.name === mi.name);
                if (mi.name && !flag) {
                  let cuisines = [];
                  // only filter the restaurant cuisine which in cuisine types array.
                  if (restaurant.googleListing.cuisine && restaurant.googleListing.cuisine === this.cuisineType) {
                    cuisines.push(restaurant.googleListing.cuisine);
                  }
                  miNames.push({
                    name: mi.name,
                    count: 1,
                    cuisines: cuisines
                  });
                } else if (mi.name && flag) {
                  let existNames = miNames.find(miName => miName.name === mi.name);
                  existNames.count++;
                  // if(restaurant.googleListing.cuisin && existNames.cuisines.indexOf(restaurant.googleListing.cuisin) === -1){ // this restaurant's cuisine is different from the before one.
                  //   existNames.cuisines.push(restaurant.googleListing.cuisine);
                  // }
                }
              });
            });
          });
        });
        // only need the name field.
        this.scrapingTopItems = miNames.sort((a,b)=>a.count - b.count).map(miName=>miName.name);
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
