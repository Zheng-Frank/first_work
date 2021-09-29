import { Component, OnInit } from "@angular/core";
import { ApiService } from "../../services/api.service";
import { environment } from "../../../environments/environment";
import { GlobalService } from "../../services/global.service";
import { Router } from '@angular/router';
import {AlertType} from '../../classes/alert-type';
@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  restaurantList = [];
  searchTerm = '';

  selectedRestaurant;

  isAdmin = false;
  isMenuEditor = false;

  postmatesAvailability;
  checkingPostmatesAvailability;
  addressToCheckAvailability = '';
  messageTemplates = [
    [{title: 'Custom'}],
    [
      {
        title: 'QR Biz link',
        content: 'http://qrbiz.qmenu.com',
      },
      {
        title: 'QR promo vid (中)',
        content: '从qMenu堂吃扫码点餐过程互动性充分体验其中优势：https://www.youtube.com/watch?v=HosHBDOXKnw',
      },
      {
        title: 'QR promo vid (Eng)',
        content: 'See how your restaurant would benefit from qMenu\'s interactive QR dine-in system: https://www.youtube.com/watch?v=_YL2LGE6joM',
      },
      {
        title: 'QR tutorial vid (中)',
        content: '了解如何使用 qMenu 的交互式堂吃扫码点餐系统，包括初始设置：https://youtube.com/playlist?list=PLfftwXwWGQGayoLhjrj6Cocqq87eiBgAn',
      },
      {
        title: 'QR tutorial vid (Eng)',
        content: 'Learn how to use qMenu’s interactive QR dine-in system, including initial setup: https://youtube.com/playlist?list=PLfftwXwWGQGbTgG0g8L612iahVJN6ip7l',
      },
      {
        title: '5x7 Signholder link',
        content: 'https://www.amazon.com/Double-Sided-Picture-Frame-5x7/dp/B07MNXRM29',
      },
      {
        title: 'QR promo pamphlet (Eng)',
        content: 'Take a look at all qMenu\'s QR dine-in system has to offer: https://pro-bee-beepro-messages.s3.amazonaws.com/474626/454906/1210649/5936605.html',
      },
      {
        title: 'QR promo pamphlet (中)',
        content: '看看 qMenu 的扫码点餐系统提供的所有好处：https://pro-bee-beepro-messages.s3.amazonaws.com/474626/454906/1210649/6204156.html',
      },
    ],
    [
      {
        title: 'First GMB Notice (中)',
        content: '你好，这里是QMenu，为了在谷歌推广您的网站，今天我们申请谷歌给您店里寄去一个明信片，3-5天应该会寄到。在明信片上有一个5位数的号码，如果您收到了这个明信片，请直接回复这个短信，发给我们这个5位数号码 (请注意，此短信不能接受照片)，或者给我们的客服打电话 404-382-9768。多谢！',
      },
      {
        title: 'First GMB Notice (Eng)',
        content: 'This is from QMenu, in order to promote your website on Google, we just requested a postcard mailed from Google, it may take 3-5 days to arrive. If you receive this postcard, please reply this text message with the 5 digit PIN on the postcard(Pls note, this number can not accept picture) or call us at 404-382-9768. Thanks.',
      },
      {
        title: 'First GMB Notice (中/Eng)',
        content: '你好,这里是QMenu, 为了在谷歌推广您的网站，今天我们申请谷歌给您店里寄去一个明信片，3-5天应该会寄到. 在明信片上有一个5位数的号码，如果您收到了这个明信片，请直接回复这个短信, 发给我们这个5位数号码 (请注意，此短信不能接受照片). 或者给我们的客服打电话 404-382-9768. 多谢!\nThis is from QMenu, in order to promote your website on Google, we just requested a postcard mailed from Google, it may take 3-5 days to arrive. If you receive this postcard, please reply this text message with the 5 digit PIN on the postcard or call us at 404-382-9768. Thanks.',
      },
      {
        title: 'Second GMB Notice (中)',
        content: '你好,这里是QMenu, 为了在谷歌推广您的网站，前几天，我们申请谷歌给您店里寄去一个明信片，在明信片上有一个5位数的号码，如果您收到了这个明信片，请直接回复这个短信, 发给我们这个5位数号码 (请注意，此短信不能接受照片), 或者给我们的客服打电话 404-382-9768. 多谢!',
      },
      {
        title: 'Second GMB Notice (Eng)',
        content: 'This is from QMenu, in order to promote your website on google, we requested a postcard mailed from Google several days ago, if you receive this postcard, please reply this text message with the 5 digit PIN on the postcard(Pls note, this number can not accept picture) or call us at 404-382-9768. Thanks.',
      },
      {
        title: 'Second GMB Notice (中/Eng)',
        content: '你好，这里是QMenu，为了在谷歌推广您的网站，前几天，我们申请谷歌给您店里寄去一个明信片，在明信片上有一个5位数的号码，如果您收到了这个明信片，请直接回复这个短信，发给我们这个5位数号码 (请注意，此短信不能接受照片)或者给我们的客服打电话 404-382-9768。 多谢！\n          This is from QMenu, in order to promote your website on google, we requested a postcard mailed from Google several days ago, if you receive this postcard, please reply this text message with the 5 digit PIN on the postcard (Pls note, this number can not accept picture) or call us at 404-382-9768. Thanks.',
      }
    ]
  ];
  messageTemplate = { title: '', content: '' };
  textPhoneNumber = '';

  constructor(private _router: Router, private _api: ApiService, private _global: GlobalService) {
    this.isAdmin = _global.user.roles.some(r => r === 'ADMIN');
    this.isMenuEditor = _global.user.roles.some(r => r === 'MENU_EDITOR');
  }

  async ngOnInit() {
    // retrieve restaurant list
    this.restaurantList = await this._global.getCachedRestaurantListForPicker();
    // const result = await this._api.get2(environment.qmenuApiUrl + 'generic2', {a: 123, b: 456, c: 789}).toPromise();
    // console.log(result);
  }

  changeTpl(e) {
    this.messageTemplate = [].concat(...this.messageTemplates).find(x => x.title === e.target.value);
  }

  sendText() {
    const jobs = [{
      'name': 'send-sms',
      'params': {
        'to': this.textPhoneNumber.replace(/\D/g, ''),
        'from': '8557592648',
        'providerName': 'plivo',
        'message': this.messageTemplate.content,
        'trigger': {
          'id': this._global.user._id,
          'name': this._global.user.username,
          'source': 'CSR',
          'module': 'Send Message'
        }
      }
    }];

    this._api.post(environment.qmenuApiUrl + 'events/add-jobs', jobs)
      .subscribe(
        () => {
          this._global.publishAlert(AlertType.Success, 'Text message sent success');
        },
        error => {
          console.log(error);
          this._global.publishAlert(AlertType.Danger, 'Text message sent failed!');
        }
      );
  }

  isPhoneValid() {
    return /^(\d{3}-?){2}\d{4}$/.test(this.textPhoneNumber);
  }

  select(restaurant) {
    if (this.selectedRestaurant === restaurant) {
      this.selectedRestaurant = undefined;
      return;
    }
    this.selectedRestaurant = restaurant;
  }

  isVisible(section) {
    const sectionRolesMap = {
      email: ['ADMIN', 'CSR', 'MENU_EDITOR'],
      template: ['ADMIN', 'CSR', 'MENU_EDITOR'],
      search: ['ADMIN', 'CSR', 'MENU_EDITOR', 'MARKETER'],
     // "fax-problems": ['ADMIN', 'CSR'],
     // "email-problems": ['ADMIN', 'CSR'],
     // "unconfirmed-orders": ['ADMIN', 'CSR'],
      "other-modules": ['ADMIN', 'CSR'],
     // "image-manager": ['ADMIN'],
      "gmb-campaign": ['ADMIN'],
      "bulk-messaging": ['ADMIN'],
      "courier-availability": ['ADMIN', 'CSR', 'MARKETER'],
      "send-text-message": ['ADMIN', 'CSR', 'MENU_EDITOR', 'MARKETER'],
      "broadcasting": ['ADMIN', 'CSR'],
      "awaiting-onboarding": ['ADMIN', 'MENU_EDITOR'],
      // "disabled-restaurants": ['ADMIN'],
      // "monitoring-hours": ['ADMIN', 'CSR']
    };
    return this._global.user.roles.some(r => sectionRolesMap[section].indexOf(r) >= 0);
  }

  selectRestaurant(restaurant) {
    if (restaurant && restaurant._id) {
      this._router.navigate(['/restaurants/' + restaurant._id]);
    }
  }

  async checkPostmatesAvailability() {
    const [postmatesCourier] = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "courier",
      query: {
        name: "Postmates"
      },
      projection: { name: 1 },
      limit: 1000000,
      sort: { name: 1 }
    }).toPromise();

    this.checkingPostmatesAvailability = true;

    try {
      await this._api.post(environment.appApiUrl + 'delivery/check-service-availability', {
        "address": this.addressToCheckAvailability,
        courier: {
          ...postmatesCourier
        }
      }).toPromise();
      this.postmatesAvailability = true;
    } catch (error) {
      console.log(error);
      this.postmatesAvailability = false;
    }
    this.checkingPostmatesAvailability = false;
  }

}
