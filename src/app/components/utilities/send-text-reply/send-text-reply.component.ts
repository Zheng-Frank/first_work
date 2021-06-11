import { filter } from 'rxjs/operators';
import { AlertType } from './../../../classes/alert-type';
import { Input } from '@angular/core';
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
  message = '';
  textedPhoneNumber;
  sendToType = 'All';
  sendWhatType = 'Custom';
  sendToTypes = [];
  channels;
  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
    if(this.restaurant.channels){
      this.channels = this.restaurant.channels.filter(channel => channel.type && channel.type === 'SMS');
      if(this.channels && this.channels.length > 0){
        this.sendToTypes = [...new Set(this.channels.map(channel=>channel.value))];
        this.sendToTypes.unshift('All');
      }
    }
    this.sendToTypes.push('Other');
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

  sendText() {
    console.log(this.phoneNumber);
    if (this.sendToType === 'All') {
      if (this.channels && this.channels.length > 0) {
        let error;
        this.channels.forEach(channel => {
          this.phoneNumber = channel.value;
          this._api.put(environment.legacyApiUrl + "twilio/sendTextAndCreateCustomer/", {
            phoneNumber: this.phoneNumber,
            message: this.message,
            source: this.restaurant.id
          })
            .subscribe(
              result => {
                // let's update original, assuming everything successful
                this.textedPhoneNumber = this.phoneNumber;
              },
              error => {
                error = error;
              }
            );
        });
        if(error){
          this._global.publishAlert(AlertType.Danger, "Failed to send successfully!" + JSON.stringify(error));
        }
      } else {
        this._global.publishAlert(AlertType.Danger, "Please set the restaurant's contact , if you need to send SMS.");
      }

    } else {
      this.textedPhoneNumber = this.phoneNumber;
      this._api.put(environment.legacyApiUrl + "twilio/sendTextAndCreateCustomer/", {
        phoneNumber: this.phoneNumber,
        message: this.message,
        source: this.restaurant.id
      })
        .subscribe(
          result => {
            // let's update original, assuming everything successful
            this._global.publishAlert(
              AlertType.Success,
              "Text Message Sent successfully"
            );

          },
          error => {
            this._global.publishAlert(AlertType.Danger, "Failed to send successfully!"+JSON.stringify(error));
          }
        );
    }

  }
  /**
   * All show send to all phone number which the restaurant has.
   */
  onChangeSendTo() {
    switch (this.sendToType) {
      case 'All':
        this.phoneNumber = '';
        break;
      case 'Other':
        this.phoneNumber = '';
        break;
      default:
      this.phoneNumber = this.sendToType;
        break;
    }
  }
  /**
   * It has follow types:
   * Text for each option:

- QR biz link: http://qrbiz.qmenu.com
- QR promo vid (Chn): https://www.youtube.com/watch?v=HosHBDOXKnw
- QR promo vid (Eng): https://www.youtube.com/watch?v=nP7b1Z79qws
- 5x7 signholder link: https://www.amazon.com/Azar-152722-5-Inch-Vertical-Double-Sided/dp/B0037W5BU2/ref=sr_1_5?dchild=1&keywords=5x7+sign+holder&qid=1623189798&sr=8-5
- QR tutorial vids (Chn): https://www.youtube.com/watch?v=KATrlX7N2g8&list=PLfftwXwWGQGayoLhjrj6Cocqq87eiBgAn
- QR tutorial vids (Eng): https://www.youtube.com/watch?v=Ifc1uj3MGEc&list=PLfftwXwWGQGbTgG0g8L612iahVJN6ip7l
   */
  onChangeSendWhat() {
    switch (this.sendWhatType) {
      case 'Custom':
        this.message = '';
        break;
      case 'QR Biz link':
        this.message = 'http://qrbiz.qmenu.com' + " qMenu 测试短信，请客服人员不要碰";
        break;
      case 'QR promo vid (中)':
        this.message = 'https://www.youtube.com/watch?v=HosHBDOXKnw' + " qMenu 测试短信，请客服人员不要碰";
        break;
      case 'QR promo vid (Eng)':
        this.message = 'https://www.youtube.com/watch?v=nP7b1Z79qws' + " qMenu 测试短信，请客服人员不要碰";
        break;
      case 'QR tutorial vid (中)':
        this.message = 'https://www.youtube.com/watch?v=KATrlX7N2g8&list=PLfftwXwWGQGayoLhjrj6Cocqq87eiBgAn' + " qMenu 测试短信，请客服人员不要碰";
        break;
      case 'QR tutorial vid (Eng)':
        this.message = 'https://www.youtube.com/watch?v=Ifc1uj3MGEc&list=PLfftwXwWGQGbTgG0g8L612iahVJN6ip7l' + " qMenu 测试短信，请客服人员不要碰";
        break;
      case '5x7 Signholder link':
        this.message = 'https://www.amazon.com/Azar-152722-5-Inch-Vertical-Double-Sided/dp/B0037W5BU2/ref=sr_1_5?dchild=1&keywords=5x7+sign+holder&qid=1623189798&sr=8-5' + " qMenu 测试短信，请客服人员不要碰";
        break;
      default:
        break;
    }
  }
  // when we can send message ? these is two cases.
  isValid() {
    if (this.sendToType === 'All' && this.message != '') {
      return true;
    } else if (this.isPhoneValid(this.phoneNumber) && this.message != '') {
      return true;
    }
    return false;
  }

}
