import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Restaurant, MenuImage } from '@qmenu/ui';
import { GlobalService } from '../../../../services/global.service';
import { Helper } from '../../../../classes/helper';
import { ApiService } from '../../../../services/api.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { menuSectionCallScript } from '../restaurant-setup-entry/setup-call-script';
enum MenuSetupModes {
  UploadImage, SendImage, CopyFromWeb, ScrapeFromUrl, AlreadyExist
}

@Component({
  selector: 'app-restaurant-setup-menu',
  templateUrl: './restaurant-setup-menu.component.html',
  styleUrls: ['./restaurant-setup-menu.component.css']
})
export class RestaurantSetupMenuComponent implements OnInit {

  constructor(private _global: GlobalService, private _api: ApiService, private _http: HttpClient) { }

  @Input() restaurant: Restaurant;
  @Output() done = new EventEmitter();
  setupMode: MenuSetupModes;
  menuSetupOptions = [
    {
      value: MenuSetupModes.UploadImage,
      text: 'A. Upload Menu Image(s)'
    },
    {
      value: MenuSetupModes.SendImage,
      text: 'B. Send Menu Image(s)'
    },
    {
      value: MenuSetupModes.CopyFromWeb,
      text: 'C. Copy from another platform'
    },
    {
      value: MenuSetupModes.ScrapeFromUrl,
      text: 'D. Provide Menu URL'
    },
    {
      value: MenuSetupModes.AlreadyExist,
      text: 'E. We found your menu! We\'ll confirm it with you a little later.'
    }
  ];
  images: string[] = [];
  menuImages: MenuImage[] = [];
  menus = [];
  copyFrom = '';
  scrapeUrl = '';
  changeLanguageFlag = this._global.languageType;// this flag decides show English call script or Chinese
  showCallScript = false; // it will display call script when the switch is opened
  ngOnInit() {

  }

  // make menuSectionCallScript from exporting becomes inner field of class RestaurantSetupMenuComponent
  get menuSectionCallScript() {
    return menuSectionCallScript;
  }

  get finished() {
    return (this.restaurant.logs || []).some(x => x.type === 'menu-setup');
  }

  get menuSetupModes() {
    return MenuSetupModes;
  }

  async upload(e) {
    let { files } = e.target;
    const data: any = await Helper.uploadImage(files, this._api, this._http);
    if (data && data.Location) {
      this.images.push(data.Location);
      // create menu image
      let menuImage: MenuImage = {
        url: data.Location,
        description: 'New Image' + this.images.length,
        createdAt: new Date(),
        createdBy: this._global.user.username
      };
      this.menuImages.push(menuImage);
      e.target.value = null;
    }
  }

  removeImage(i) {
    this.images.splice(i, 1);
  }

  canSave() {
    return !![this.images.length > 0, true, this.copyFrom, this.scrapeUrl, true][this.setupMode];
  }

  async addMenuImages() {
    let { menuImages = [] } = this.restaurant;
    menuImages = [...menuImages, ...this.menuImages];
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
      old: { _id: this.restaurant['_id'] },
      new: { _id: this.restaurant['_id'], menuImages: menuImages }
    }]).toPromise();
    this.restaurant.menuImages = menuImages;
  }

  async scrapeMenuByUrl() {
    await this._api.post(environment.appApiUrl + 'events',
      [{
        queueUrl: `https://sqs.us-east-1.amazonaws.com/449043523134/events-v3`,
        event: {
          name: 'populate-menus',
          params: {
            restaurantId: this.restaurant._id,
            url: this.scrapeUrl, keepExistingMenus: true
          }
        }
      }]
    ).toPromise();
  }

  async save() {
    let logContent = [
      {
        problem: "Need to create menus based on images on menu images tab",
        response: "Finish creating menus based on images on menu images tab"
      },
      {
        problem: "Restaurant to send images to qMenu support email or texting number",
        response: "Check support email/SMS for menu images"
      },
      {
        problem: `Restaurant asked us to copy their menu from ${this.copyFrom}`,
        response: `Get menu from ${this.copyFrom}`
      },
      {
        problem: `Restaurant provided us with menu scraping URL ${this.scrapeUrl}`,
        response: "Ensure menu successfully scraped from the URL provided"
      },
      {
        problem: `System already scraped ${this.restaurant.menus.length} menus for this restaurant automatically`,
        response: "Need to confirm with restaurant that at least one of those menus is correct"
      }
    ][this.setupMode];
    let log = {
      time: new Date(),
      username: this._global.user.username,
      ...logContent,
      resolved: false,
      type: "menu-setup"
    };
    if (this.setupMode === MenuSetupModes.UploadImage) {
      await this.addMenuImages();
    } else if (this.setupMode === MenuSetupModes.ScrapeFromUrl) {
      await this.scrapeMenuByUrl();
    }
    let { logs = [] } = this.restaurant;
    let newLogs = [...logs, log];
    this.done.emit({ logs: newLogs });
  }
}
