import {Component, OnInit, ViewChild} from '@angular/core';
import { ApiService } from "../../services/api.service";
import { environment } from "../../../environments/environment";
import { GlobalService } from "../../services/global.service";
import { Router } from '@angular/router';
import {SendMessageComponent} from '../utilities/send-message/send-message.component';
@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  @ViewChild("sendMessageComponent") sendMessageComponent: SendMessageComponent;
  restaurantList = [];
  searchTerm = '';

  selectedRestaurant;

  isAdmin = false;
  isMenuEditor = false;

  postmatesAvailability;
  checkingPostmatesAvailability;
  addressToCheckAvailability = '';
  messageTemplates = {
    'Owner APP': [
      {
        title: "Biz App (Android)",
        subject: "Biz App (Android)",
        smsContent: "https://play.google.com/store/apps/details?id=qmenu.Owner&hl=en_US&gl=US",
        emailContent: "https://play.google.com/store/apps/details?id=qmenu.Owner&hl=en_US&gl=US"
      },
      {
        title: "Biz App (iOS)",
        subject: "Biz App (iOS)",
        smsContent: "https://apps.apple.com/us/app/qmenu-owner/id1476098960",
        emailContent: "https://apps.apple.com/us/app/qmenu-owner/id1476098960"
      },
      {
        title: "Biz App (website)",
        subject: "Biz App (website)",
        smsContent: "https://biz.qmenu.us/#/",
        emailContent: "https://biz.qmenu.us/#/"
      },
      {
        title: "Biz App User Guide (Eng)",
        subject: "Biz App User Guide",
        smsContent: "https://drive.google.com/file/d/1SFsJDVLWP62g0-Sr6bNPwv7dHbG_HFJ6/view?usp=sharing",
        emailContent: "https://drive.google.com/file/d/1SFsJDVLWP62g0-Sr6bNPwv7dHbG_HFJ6/view?usp=sharing"
      },
      {
        title: "Biz App User Guide (中)",
        subject: "Biz App 用户指南",
        smsContent: "https://drive.google.com/file/d/1HbRUtZYEMKQD_lfi7XRRK7DQqhc06MkA/view?usp=sharing",
        emailContent: "https://drive.google.com/file/d/1HbRUtZYEMKQD_lfi7XRRK7DQqhc06MkA/view?usp=sharing"
      }
    ],
    'GMB Notices': [
      {
        title: 'First GMB Notice (中)',
        subject: '谷歌推广明信片',
        smsContent: '你好，这里是QMenu，为了在谷歌推广您的网站，今天我们申请谷歌给您店里寄去一个明信片，3-5天应该会寄到。在明信片上有一个5位数的号码，如果您收到了这个明信片，请直接回复这个短信，发给我们这个5位数号码 (请注意，此短信不能接受照片)，或者给我们的客服打电话 404-382-9768。多谢！',
        emailContent: '你好，<br/>&nbsp;&nbsp;&nbsp;&nbsp;这里是QMenu，为了在谷歌推广您的网站，今天我们申请谷歌给您店里寄去一个明信片，3-5天应该会寄到。在明信片上有一个5位数的号码，如果您收到了这个明信片，请回复这个邮件5位数的号码，或者发短信到 <strong>855-759-2648</strong> 或者给我们的客服打电话 <strong>404-382-9768</strong>。多谢！'
      },
      {
        title: 'First GMB Notice (Eng)',
        subject: 'Google promote postcard',
        smsContent: 'This is from QMenu, in order to promote your website on Google, we just requested a postcard mailed from Google, it may take 3-5 days to arrive. If you receive this postcard, please reply this text message with the 5 digit PIN on the postcard(Pls note, this number can not accept picture) or call us at 404-382-9768. Thanks.',
        emailContent: 'Hi, <br/>&nbsp;&nbsp;&nbsp;&nbsp;This is from QMenu, in order to promote your website on google, we just requested a postcard mailed from Google, it may take 3-5 days to arrive. If you receive this postcard, please reply this email with the 5 digit PIN on the postcard, text us at <strong>855-759-2648</strong> or call us at <strong>404-382-9768</strong>.<br/>Thanks.'
      },
      {
        title: 'First GMB Notice (中/Eng)',
        subject: '谷歌推广明信片(Google promote postcard)',
        smsContent: '你好,这里是QMenu, 为了在谷歌推广您的网站，今天我们申请谷歌给您店里寄去一个明信片，3-5天应该会寄到. 在明信片上有一个5位数的号码，如果您收到了这个明信片，请直接回复这个短信, 发给我们这个5位数号码 (请注意，此短信不能接受照片). 或者给我们的客服打电话 404-382-9768. 多谢!\nThis is from QMenu, in order to promote your website on Google, we just requested a postcard mailed from Google, it may take 3-5 days to arrive. If you receive this postcard, please reply this text message with the 5 digit PIN on the postcard or call us at 404-382-9768. Thanks.',
        emailContent: '你好，<br/>&nbsp;&nbsp;&nbsp;&nbsp;这里是QMenu，为了在谷歌推广您的网站，今天我们申请谷歌给您店里寄去一个明信片，3-5天应该会寄到。在明信片上有一个5位数的号码，如果您收到了这个明信片，请回复这个邮件5位数的号码，或者发短信到 855-759-2648 或者给我们的客服打电话 404-382-9768。多谢！<br/><br/>&nbsp;&nbsp;&nbsp;&nbsp;Hi,<br/>This is from QMenu, in order to promote your website on google, we just requested a postcard mailed from Google, it may take 3-5 days to arrive. If you receive this postcard, please reply this email with the 5 digit PIN on the postcard, text us at <strong>855-759-2648</strong> or call us at <strong>404-382-9768</strong>.<br/>Thanks.'
      },
      {
        title: 'Second GMB Notice (中)',
        subject: '谷歌推广明信片',
        smsContent: '你好,这里是QMenu, 为了在谷歌推广您的网站，前几天，我们申请谷歌给您店里寄去一个明信片，在明信片上有一个5位数的号码，如果您收到了这个明信片，请直接回复这个短信, 发给我们这个5位数号码 (请注意，此短信不能接受照片), 或者给我们的客服打电话 404-382-9768. 多谢!',
        emailContent: '你好，<br/>&nbsp;&nbsp;&nbsp;&nbsp;这里是QMenu，为了在谷歌推广您的网站，前几天，我们申请谷歌给您店里寄去一个明信片，在明信片上有一个5位数的号码，如果您收到了这个明信片，请回复这个邮件5位数的号码，或者发短信到 <strong>855-759-2648</strong> 或者给我们的客服打电话 <strong>404-382-9768</strong>。<br/>多谢！'
      },
      {
        title: 'Second GMB Notice (Eng)',
        subject: 'Google promote postcard',
        smsContent: 'This is from QMenu, in order to promote your website on google, we requested a postcard mailed from Google several days ago, if you receive this postcard, please reply this text message with the 5 digit PIN on the postcard(Pls note, this number can not accept picture) or call us at 404-382-9768. Thanks.',
        emailContent: 'Hi,<br/>&nbsp;&nbsp;&nbsp;&nbsp;This is from QMenu, in order to promote your website on google, we requested a postcard mailed from Google several days ago, if you receive this postcard, please reply this email with the 5 digit PIN on the postcard, text us at <strong>855-759-2648</strong> or call us at <strong>404-382-9768</strong>.<br/>Thanks.'
      },
      {
        title: 'Second GMB Notice (中/Eng)',
        subject: '谷歌推广明信片(Google promote postcard)',
        smsContent: '你好，这里是QMenu，为了在谷歌推广您的网站，前几天，我们申请谷歌给您店里寄去一个明信片，在明信片上有一个5位数的号码，如果您收到了这个明信片，请直接回复这个短信，发给我们这个5位数号码 (请注意，此短信不能接受照片)或者给我们的客服打电话 404-382-9768。 多谢！\n          This is from QMenu, in order to promote your website on google, we requested a postcard mailed from Google several days ago, if you receive this postcard, please reply this text message with the 5 digit PIN on the postcard (Pls note, this number can not accept picture) or call us at 404-382-9768. Thanks.',
        emailContent: '你好，<br/>&nbsp;&nbsp;&nbsp;&nbsp;这里是QMenu，为了在谷歌推广您的网站，前几天，我们申请谷歌给您店里寄去一个明信片，在明信片上有一个5位数的号码，如果您收到了这个明信片，请回复这个邮件5位数的号码，或者发短信到 <strong>855-759-2648</strong> 或者给我们的客服打电话 <strong>404-382-9768</strong>。<br/>多谢！<br/><br/>Hi,<br/>&nbsp;&nbsp;&nbsp;&nbsp;This is from QMenu, in order to promote your website on google, we requested a postcard mailed from Google several days ago, if you receive this postcard, please reply this email with the 5 digit PIN on the postcard, text us at <strong>855-759-2648</strong>, or call us at <strong>404-382-9768</strong>.<br/>Thanks.'
      }
    ],
    'QR Dine-in': [
      {
        title: 'QR Biz link',
        subject: 'QR Biz link',
        smsContent: 'http://qrbiz.qmenu.com',
        emailContent: 'http://qrbiz.qmenu.com'
      },
      {
        title: 'QR promo vid (中)',
        subject: '堂吃扫码点餐优势展示',
        smsContent: '从qMenu堂吃扫码点餐过程互动性充分体验其中优势：https://www.youtube.com/watch?v=HosHBDOXKnw',
        emailContent: '从qMenu堂吃扫码点餐过程互动性充分体验其中优势：https://www.youtube.com/watch?v=HosHBDOXKnw'
      },
      {
        title: 'QR promo vid (Eng)',
        subject: 'QR dine-in benefit',
        smsContent: 'See how your restaurant would benefit from qMenu\'s interactive QR dine-in system: https://www.youtube.com/watch?v=_YL2LGE6joM',
        emailContent: 'See how your restaurant would benefit from qMenu\'s interactive QR dine-in system: https://www.youtube.com/watch?v=_YL2LGE6joM'
      },
      {
        title: 'QR tutorial vid (中)',
        subject: '堂吃扫码点餐教学视频',
        smsContent: '了解如何使用 qMenu 的交互式堂吃扫码点餐系统，包括初始设置：https://youtube.com/playlist?list=PLfftwXwWGQGayoLhjrj6Cocqq87eiBgAn',
        emailContent: '了解如何使用 qMenu 的交互式堂吃扫码点餐系统，包括初始设置：https://youtube.com/playlist?list=PLfftwXwWGQGayoLhjrj6Cocqq87eiBgAn'
      },
      {
        title: 'QR tutorial vid (Eng)',
        subject: 'QR dine-in tutorial video',
        smsContent: 'Learn how to use qMenu’s interactive QR dine-in system, including initial setup: https://youtube.com/playlist?list=PLfftwXwWGQGbTgG0g8L612iahVJN6ip7l',
        emailContent: 'Learn how to use qMenu’s interactive QR dine-in system, including initial setup: https://youtube.com/playlist?list=PLfftwXwWGQGbTgG0g8L612iahVJN6ip7l'
      },
      {
        title: '5x7 Signholder link',
        subject: '5x7 Signholder link',
        smsContent: 'https://www.amazon.com/Double-Sided-Picture-Frame-5x7/dp/B07MNXRM29',
        emailContent: 'https://www.amazon.com/Double-Sided-Picture-Frame-5x7/dp/B07MNXRM29'
      },
      {
        title: 'QR promo pamphlet (Eng)',
        subject: 'QR promo pamphlet',
        smsContent: 'Take a look at all qMenu\'s QR dine-in system has to offer: https://pro-bee-beepro-messages.s3.amazonaws.com/474626/454906/1210649/5936605.html',
        emailContent: 'Take a look at all qMenu\'s QR dine-in system has to offer: https://pro-bee-beepro-messages.s3.amazonaws.com/474626/454906/1210649/5936605.html'
      },
      {
        title: 'QR promo pamphlet (中)',
        subject: '扫码点餐宣传手册',
        smsContent: '看看 qMenu 的扫码点餐系统提供的所有好处：https://pro-bee-beepro-messages.s3.amazonaws.com/474626/454906/1210649/6204156.html',
        emailContent: '看看 qMenu 的扫码点餐系统提供的所有好处：https://pro-bee-beepro-messages.s3.amazonaws.com/474626/454906/1210649/6204156.html'
      },
    ],
  };


  constructor(private _router: Router, private _api: ApiService, private _global: GlobalService) {
    this.isAdmin = _global.user.roles.some(r => r === 'ADMIN');
    this.isMenuEditor = _global.user.roles.some(r => r === 'MENU_EDITOR');
  }

  async ngOnInit() {
    // retrieve restaurant list
    this.restaurantList = await this._global.getCachedRestaurantListForPicker();
    // const result = await this._api.get2(environment.qmenuApiUrl + 'generic2', {a: 123, b: 456, c: 789}).toPromise();
    // console.log(result);
    this.sendMessageComponent.init();
  }

  select(restaurant) {
    if (this.selectedRestaurant === restaurant) {
      this.selectedRestaurant = undefined;
      return;
    }
    this.selectedRestaurant = restaurant;
  }

  isVisible(section) {
    const publicSections = ["other-modules"];
    const sectionRolesMap = {
      ownership: ['ADMIN', 'CSR', 'CSR_MANAGER', 'MENU_EDITOR'],
      search: ['ADMIN', 'CSR', 'CSR_MANAGER', 'MENU_EDITOR', 'MARKETER'],
      "gmb-campaign": ['ADMIN'],
      "bulk-messaging": ['ADMIN'],
      "courier-availability": ['ADMIN', 'CSR', 'CSR_MANAGER', 'MARKETER'],
      "change-rt-alias": ['ADMIN', 'CSR_MANAGER'],
      "send-fax": ["ADMIN", 'CSR', 'CSR_MANAGER', 'MARKETER', 'MARKETER_INTERNAL'],
      "send-text-message": ['ADMIN', 'CSR', 'CSR_MANAGER', 'MENU_EDITOR', 'MARKETER'],
      "broadcasting": ['ADMIN', 'CSR', 'CSR_MANAGER'],
    };
    return publicSections.includes(section) || this._global.user.roles.some(r => sectionRolesMap[section].indexOf(r) >= 0);
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
