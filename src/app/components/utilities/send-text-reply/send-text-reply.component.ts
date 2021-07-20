import { EventEmitter } from '@angular/core';
import { filter } from 'rxjs/operators';
import { AlertType } from './../../../classes/alert-type';
import { Input, Output } from '@angular/core';
import { GlobalService } from 'src/app/services/global.service';
import { ApiService } from 'src/app/services/api.service';
import { environment } from './../../../../environments/environment.qa';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-send-text-reply',
  templateUrl: './send-text-reply.component.html',
  styleUrls: ['./send-text-reply.component.css']
})
export class SendTextReplyComponent implements OnInit {

  @Input() restaurant;
  phoneNumber = '';
  email = '';
  message = '';
  sendToType = 'All SMS numbers';
  sendWhatType = 'Custom';
  sendToTypes = [];
  channels;
  displayGooglePIN = false;
  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
    if (this.restaurant.channels) {
      this.channels = this.restaurant.channels.filter(channel => channel.type && (channel.type === 'SMS' || (channel.type === 'Email' && channel.notifications && channel.notifications.includes('Order'))));
      if (this.channels && this.channels.length > 0) {
        this.sendToTypes = [...new Set(this.channels.map(channel => channel.value))];
        this.sendToTypes.unshift('All Emails');
        this.sendToTypes.unshift('All SMS numbers');
      }
    }
    this.sendToTypes.push('Other SMS number');
    this.sendToTypes.push('Other email');
    this.sendToTypes.push('Use Old Send Google PIN');
  }
  
  isPhoneValid(text) {
    if (!text) {
      return false;
    }

    let digits = text.replace(/\D/g, '');
    if (digits) {
      let phoneRe = /^[2-9]\d{2}[2-9]\d{2}\d{4}$/;
      if (digits.match(phoneRe)) {
        return true;
      }
    }
    return false;
  }
  isEmailValid(text) {
    if (!text) {
      return false;
    }

    let emailRe = /^[a-zA-Z0-9]+([-_.][a-zA-Z0-9]+)*@[a-zA-Z0-9]+([-_.][a-zA-Z0-9]+)*\.[a-z]{2,}$/;
    if (text.match(emailRe)) {
      return true;
    }
    return false;
  }
  
  sendText() {
    if (this.sendToType === 'All SMS numbers') {
      if (this.channels && this.channels.length > 0) {
        let jobs = this.channels.map(channel => {
          if (channel.type === 'SMS') {
            return {
              "name": "send-sms",
              "params": {
                "to": channel.value,
                "from": "8557592648",
                "providerName": "plivo",
                "message": this.message
              }
            };
          }
        }).filter(job =>job);
        this._api.post(environment.qmenuApiUrl + "events/add-jobs", jobs)
          .subscribe(
            result => {
              // let's update original, assuming everything successful
              this._global.publishAlert(
                AlertType.Success,
                "Text Message Sent successfully"
              );
            },
            error => {
              console.log(JSON.stringify(error));
              this._global.publishAlert(AlertType.Danger, "Failed to send successfully!");
            }
          );
      } else {
        this._global.publishAlert(AlertType.Danger, "Please set the restaurant's contact , if you need to send SMS.");
      }

    } else if (this.sendToType === 'All Emails') {
      if (this.channels && this.channels.length > 0) {
        let emailMessage = this.message.replace(/(\r\n)|(\n)/g,'<br>');
        let jobs = this.channels.map(channel => {
          if (channel.type === 'Email') {
            return {
              "name": "send-email",
              "params": {
                "to": channel.value,
                "subject": "QMenu Google PIN",
                "html": emailMessage
              }
            }
          }
        }).filter(job =>job);
        this._api.post(environment.qmenuApiUrl + "events/add-jobs", jobs)
          .subscribe(
            result => {
              // let's update original, assuming everything successful
              this._global.publishAlert(
                AlertType.Success,
                "Text Message Sent successfully"
              );
            },
            error => {
              console.log(JSON.stringify(error));
              this._global.publishAlert(AlertType.Danger, "Failed to send successfully!");
            }
          );
      } else {
        this._global.publishAlert(AlertType.Danger, "Please set the restaurant's contact , if you need to send email.");
      }
    } else if (this.isPhoneValid(this.phoneNumber)) {
      this._api.post(environment.qmenuApiUrl + 'events/add-jobs', [{
        "name": "send-sms",
        "params": {
          "to": this.phoneNumber,
          "from": "8557592648",
          "providerName": "plivo",
          "message": this.message
        }
      }])
        .subscribe(
          result => {
            // let's update original, assuming everything successful
            this._global.publishAlert(
              AlertType.Success,
              "Text Message Sent successfully"
            );
          },
          error => {
            this._global.publishAlert(AlertType.Danger, "Failed to send successfully!" + JSON.stringify(error));
          }
        );
    } else if (this.isEmailValid(this.email)) {
      let emailMessage = this.message.replace(/(\r\n)|(\n)/g,'<br>');
      this._api.post(environment.qmenuApiUrl + 'events/add-jobs', [{
        "name": "send-email",
        "params": {
          "to": this.email,
          "subject": "QMenu Google PIN",
          "html": emailMessage
        }
      }])
        .subscribe(
          result => {
            // let's update original, assuming everything successful
            this._global.publishAlert(
              AlertType.Success,
              "Text Message Sent successfully"
            );
          },
          error => {
            this._global.publishAlert(AlertType.Danger, "Failed to send successfully!" + JSON.stringify(error));
          }
        );
    }
  }
  /**
   * All show send to all phone number which the restaurant has.
   */
  onChangeSendTo() {
    switch (this.sendToType) {
      case 'All SMS number':
      case 'All Emails':
      case 'Other SMS number':
      case 'Other email':
        this.phoneNumber = '';
        this.email = '';
        this.displayGooglePIN = false;
        break;
      case 'Use Old Send Google PIN':
        this.phoneNumber = '';
        this.email = '';
        this.displayGooglePIN = true;
        break;
      default:
        this.displayGooglePIN = false;
        if (this.isPhoneValid(this.sendToType)) {
          this.email = '';
          this.phoneNumber = this.sendToType;
        } else if (this.isEmailValid(this.sendToType)) {
          this.phoneNumber = '';
          this.email = this.sendToType;
        }
        break;
    }
    this.onChangeSendWhat();
  }
  /**
   * It has follow types:
   * Text for each option:

- QR biz link: http://qrbiz.qmenu.com
- QR promo vid (Chn): https://www.youtube.com/watch?v=HosHBDOXKnw
- QR promo vid (Eng): https://www.youtube.com/watch?v=nP7b1Z79qws
- 5x7 signholder link: https://www.amazon.com/Azar-152722-5-Inch-Vertical-Double-Sided/dp/B0037W5BU2/ref=sr_1_5?dchild=1&keywords=5x7+sign+holder&qid=1623189798&sr=8-5
  <=>https://shorturl.at/gFQ19
- QR tutorial vids (Chn): https://www.youtube.com/watch?v=KATrlX7N2g8&list=PLfftwXwWGQGayoLhjrj6Cocqq87eiBgAn
- QR tutorial vids (Eng): https://www.youtube.com/watch?v=Ifc1uj3MGEc&list=PLfftwXwWGQGbTgG0g8L612iahVJN6ip7l
   */
  onChangeSendWhat() {
    switch (this.sendWhatType) {
      case 'Custom':
        this.message = '';
        break;
        case 'QR Biz link':
        this.message = 'http://qrbiz.qmenu.com';
        break;
      case 'QR promo vid (中)':
        this.message = '从qMenu堂吃扫码点餐过程互动性充分体验其中优势：https://www.youtube.com/watch?v=HosHBDOXKnw';
        break;
      case 'QR promo vid (Eng)':
        this.message = `See how your restaurant would benefit from qMenu's interactive QR dine-in system: https://www.youtube.com/watch?v=_YL2LGE6joM`;
        break;
      case 'QR tutorial vid (中)':
        // this.message = 'https://www.youtube.com/watch?v=KATrlX7N2g8&list=PLfftwXwWGQGayoLhjrj6Cocqq87eiBgAn';
        this.message = '了解如何使用 qMenu 的交互式堂吃扫码点餐系统，包括初始设置：https://shorturl.at/korGR';
        break;
      case 'QR tutorial vid (Eng)':
       // this.message = 'https://www.youtube.com/watch?v=Ifc1uj3MGEc&list=PLfftwXwWGQGbTgG0g8L612iahVJN6ip7l';
        this.message = 'Learn how to use qMenu’s interactive QR dine-in system, including initial setup: https://shorturl.at/cdpO9'
        break;
      case '5x7 Signholder link':
        // this.message = 'https://www.fixturedisplays.com/Picture_Frames_11193-2-5X7-24PK' ;
        this.message = 'https://shorturl.at/gFQ19';
        break;
      case 'QR promo pamphlet (Eng)':
        this.message = `Take a look at all qMenu's QR dine-in system has to offer: https://pro-bee-beepro-messages.s3.amazonaws.com/474626/454906/1210649/5936605.html`;
        break;
      case 'QR promo pamphlet (Chn)':
        this.message = '看看 qMenu 的扫码点餐系统提供的所有好处：https://pro-bee-beepro-messages.s3.amazonaws.com/474626/454906/1210649/6204156.html';
        break;
      case 'First Notice (Chinese)':
        if (this.sendToType === 'All SMS numbers' || (this.phoneNumber != '' && this.isPhoneValid(this.phoneNumber)) || (this.sendToType === 'Other SMS number')) {
          this.message = `你好,这里是QMenu, 为了在谷歌推广您的网站，今天我们申请谷歌给您店里寄去一个明信片，3-5天应该会寄到. 在明信片上有一个5位数的号码，如果您收到了这个明信片，请直接回复这个短信, 发给我们这个5位数号码 (请注意，此短信不能接受照片), 或者给我们的客服打电话 404-382-9768. 多谢!`;
        } else if (this.sendToType === 'All Emails' || (this.email != '' && this.isEmailValid(this.email)) || (this.sendToType === 'Other email')) {
          this.message = `你好,\n这里是QMenu, 为了在谷歌推广您的网站，今天我们申请谷歌给您店里寄去一个明信片，3-5天应该会寄到. 在明信片上有一个5位数的号码，如果您收到了这个明信片，请回复这个邮件5位数的号码, 或者发短信到855-759-2648或者给我们的客服打电话 404-382-9768. 多谢!`;
        }
        break;
      case 'First Notice (English)':
        if (this.sendToType === 'All SMS numbers' || (this.phoneNumber != '' && this.isPhoneValid(this.phoneNumber)) || (this.sendToType === 'Other SMS number')) {
          this.message = `This is from QMenu, in order to promote your website on Google, we just requested a postcard mailed from Google, it may take 3-5 days to arrive. If you receive this postcard, please reply this text message with the 5 digit PIN on the postcard(Pls note, this number can not accept picture) or call us at 404-382-9768. Thanks`;
        } else if (this.sendToType === 'All Emails' || (this.email != '' && this.isEmailValid(this.email)) || (this.sendToType === 'Other email')) {
          this.message = `Hi, \nThis is from QMenu, in order to promote your website on google, we just requested a postcard mailed from Google, it may take 3-5 days to arrive. If you receive this postcard, please reply this email with the 5 digit PIN on the postcard, text us at 855-759-2648 or call us at 404-382-9768.\n Thanks`;
        }
        break;
      case 'First Notice (Chinese/English)':
        if (this.sendToType === 'All SMS numbers' || (this.phoneNumber != '' && this.isPhoneValid(this.phoneNumber)) || (this.sendToType === 'Other SMS number')) {
          this.message = `你好,这里是QMenu, 为了在谷歌推广您的网站，今天我们申请谷歌给您店里寄去一个明信片，3-5天应该会寄到. 在明信片上有一个5位数的号码，如果您收到了这个明信片，请直接回复这个短信, 发给我们这个5位数号码 (请注意，此短信不能接受照片). 或者给我们的客服打电话 404-382-9768. 多谢!
          This is from QMenu, in order to promote your website on Google, we just requested a postcard mailed from Google, it may take 3-5 days to arrive. If you receive this postcard, please reply this text message with the 5 digit PIN on the postcard or call us at 404-382-9768. Thanks`;
        } else if (this.sendToType === 'All Emails' || (this.email != '' && this.isEmailValid(this.email)) || (this.sendToType === 'Other email')) {
          this.message = `你好,\n这里是QMenu, 为了在谷歌推广您的网站，今天我们申请谷歌给您店里寄去一个明信片，3-5天应该会寄到. 在明信片上有一个5位数的号码，如果您收到了这个明信片，请回复这个邮件5位数的号码, 或者发短信到855-759-2648或者给我们的客服打电话 404-382-9768. 多谢!\n
          Hi, \nThis is from QMenu, in order to promote your website on google, we just requested a postcard mailed from Google, it may take 3-5 days to arrive. If you receive this postcard, please reply this email with the 5 digit PIN on the postcard, text us at 855-759-2648 or call us at 404-382-9768.\n Thanks`;
        }
        break;
      case 'Follow up Notice (Chinese)':
        if (this.sendToType === 'All SMS numbers' || (this.phoneNumber != '' && this.isPhoneValid(this.phoneNumber)) || (this.sendToType === 'Other SMS number')) {
          this.message = `你好,这里是QMenu, 为了在谷歌推广您的网站，前几天，我们申请谷歌给您店里寄去一个明信片，在明信片上有一个5位数的号码，如果您收到了这个明信片，请直接回复这个短信, 发给我们这个5位数号码 (请注意，此短信不能接受照片), 或者给我们的客服打电话 404-382-9768. 多谢!`;
        } else if (this.sendToType === 'All Emails' || (this.email != '' && this.isEmailValid(this.email)) || (this.sendToType === 'Other email')) {
          this.message = `你好,\n这里是QMenu, 为了在谷歌推广您的网站，前几天，我们申请谷歌给您店里寄去一个明信片，在明信片上有一个5位数的号码，如果您收到了这个明信片，请回复这个邮件5位数的号码, 或者发短信到855-759-2648或者给我们的客服打电话 404-382-9768. 多谢!`;
        }
        break;
      case 'Follow up Notice (English)':
        if (this.sendToType === 'All SMS numbers' || (this.phoneNumber != '' && this.isPhoneValid(this.phoneNumber)) || (this.sendToType === 'Other SMS number')) {
          this.message = `This is from QMenu, in order to promote your website on google, we requested a postcard mailed from Google several days ago, if you receive this postcard, please reply this text message with the 5 digit PIN on the postcard(Pls note, this number can not accept picture) or call us at 404-382-9768. Thanks`;
        } else if (this.sendToType === 'All Emails' || (this.email != '' && this.isEmailValid(this.email)) || (this.sendToType === 'Other email')) {
          this.message = `Hi, \nThis is from QMenu, in order to promote your website on google, we requested a postcard mailed from Google several days ago, if you receive this postcard, please reply this email with the 5 digit PIN on the postcard, text us at 855-759-2648 or call us at 404-382-9768.\n Thanks`;
        }
        break;
      case 'Follow up Notice (Chinese/English)':
        if (this.sendToType === 'All SMS numbers' || (this.phoneNumber != '' && this.isPhoneValid(this.phoneNumber)) || (this.sendToType === 'Other SMS number')) {
          this.message = `你好,这里是QMenu, 为了在谷歌推广您的网站，前几天，我们申请谷歌给您店里寄去一个明信片，在明信片上有一个5位数的号码，如果您收到了这个明信片，请直接回复这个短信, 发给我们这个5位数号码 (请注意，此短信不能接受照片)或者给我们的客服打电话 404-382-9768. 多谢!
          This is from QMenu, in order to promote your website on google, we requested a postcard mailed from Google several days ago, if you receive this postcard, please reply this text message with the 5 digit PIN on the postcard (Pls note, this number can not accept picture) or call us at 404-382-9768. Thanks`;
        } else if (this.sendToType === 'All Emails' || (this.email != '' && this.isEmailValid(this.email)) || (this.sendToType === 'Other email')) {
          this.message = `你好,\n这里是QMenu, 为了在谷歌推广您的网站，前几天，我们申请谷歌给您店里寄去一个明信片，在明信片上有一个5位数的号码，如果您收到了这个明信片，请回复这个邮件5位数的号码, 或者发短信到855-759-2648或者给我们的客服打电话 404-382-9768. 多谢!\n
          Hi, \nThis is from QMenu, in order to promote your website on google, we requested a postcard mailed from Google several days ago, if you receive this postcard, please reply this email with the 5 digit PIN on the postcard, text us at 855-759-2648, or call us at 404-382-9768.\n Thanks`;
        }
        break;
      default:
        break;
    }
  }

  // when we can send message ? these is two cases.
  isValid() {
    if ((this.sendToType === 'All Emails' || this.sendToType === 'All SMS numbers') && this.message != '') {
      return true;
    } else if (this.isPhoneValid(this.phoneNumber) && this.message != '') {
      return true;
    } else if (this.isEmailValid(this.email) && this.message != '') {
      return true;
    }
    return false;
  }

}
