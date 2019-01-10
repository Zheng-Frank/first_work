import { Component, OnInit, Input, ViewChild, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";

@Component({
    selector: 'send-google-pin',
    templateUrl: './send-google-pin.component.html',
    styleUrls: ['./send-google-pin.component.css']
})
export class SendGooglePINComponent implements OnChanges {
    @Input() restaurant;
    contactList = [];
    messageTo;
    contents;
    text_contents: String = `This is from QMenu, in order to promote your website on google, we requested a postcard mailed from Google several days ago, if you receives this postcard, please reply this text message with the 5 digit PIN on the postcard. Thanks
        
    你好,这里是QMenu, 为了在谷歌推广您的网站，前几天，我们申请谷歌给您店里寄去一个明信片，在明信片上有一个5位数的号码，如果您收到了这个明信片，请给我们
    的客服打电话 404-382-9768 或者发短信到 978-652-9542。 多谢
    `;
    email_contents: String = 'Hi, <br>This is from QMenu, in order to promote your website on google, we requested a postcard mailed from Google several days ago, if you receives this postcard, please reply this email with the 5 digit PIN on the postcard, or call us at 404-382-9768.<br> Thanks'


    constructor(private _api: ApiService, private _global: GlobalService) { }

    ngOnChanges(changes: SimpleChanges) {
        if (this.restaurant) {
            console.log('mega', this.restaurant);

            const channels = (this.restaurant.channels || []).map(c => {
                if (c.type === 'SMS') {
                    return { type: "SMS", value: c.value }
                }
                else if (c.type === 'Email') {
                    return { type: "Email", value: c.value }
                }
            });
            const phones = (this.restaurant.phones || []).map(p => {
                if (p.type === 'Mobile') {
                    return { type: "SMS", value: p.phoneNumber }
                }
            });

            this.contactList = Array.from(new Set(phones.concat(channels))).filter(item => item);

        }



    }

    onChange(value) {
        if (this.messageTo) {
            if (this.messageTo.type === 'SMS') {
                this.contents = this.text_contents
            } else if (this.messageTo.type === 'Email'){
                this.contents = this.email_contents;
            }

        }
    }

    sendMessage() {
        console.log("messageTo", this.messageTo);
        //console.log("type",(this.getContactList().filter(p=> p.value == this.messageTo))['type']);
        if (this.messageTo.type === 'SMS') {
            this._api.post(environment.qmenuApiUrl + 'events/add-jobs', [{
                "name": "send-sms",
                "params": {
                    "to": this.messageTo.value,
                    "from": "8447935942",
                    "providerName": "plivo",
                    "message": this.text_contents
                }
            }]).subscribe(
                result => {
                    this._global.publishAlert(
                        AlertType.Success,
                        "Message sent successfully"
                    );
                },
                error => {
                    this._global.publishAlert(AlertType.Danger, "Error sending message");
                }
                );

        } else if (this.messageTo.type === 'Email') {
            this._api.post(environment.qmenuApiUrl + 'events/add-jobs', [{
                "name": "send-email",
                "params": {
                    "to": this.messageTo.value,
                    "subject": "QMenu Google PIN",
                    "html": this.email_contents
                }
            }]).subscribe(
                result => {
                    this._global.publishAlert(
                        AlertType.Success,
                        "Message sent successfully"
                    );
                },
                error => {
                    this._global.publishAlert(AlertType.Danger, "Error sending message");
                }
                );

        }

    }
}