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
    messageSelected;
    messages = [
        {
            language: 'Chinese',
            body: [
                {
                    type: "sms",
                    contents: `你好,这里是QMenu, 为了在谷歌推广您的网站，前几天，我们申请谷歌给您店里寄去一个明信片，在明信片上有一个5位数的号码，如果您收到了这个明信片，请直接回复这个短信, 或者给我们的客服打电话 404-382-9768. 多谢!`

                },
                {
                    type: "email",
                    contents: `你好,<br>这里是QMenu, 为了在谷歌推广您的网站，前几天，我们申请谷歌给您店里寄去一个明信片，在明信片上有一个5位数的号码，如果您收到了这个明信片，请回复这个邮件5位数的号码, 或者发短信到844-793-5942或者给我们的客服打电话 404-382-9768. 多谢!`,
                },
                {
                    type: "fax",
                    contents: 'http://qmenu360.com/google-pin/fax_cn.pdf'
                }
            ],

        },
        {
            language: 'English',
            body: [
                {
                    type: "sms",
                    contents: `This is from QMenu, in order to promote your website on google, we requested a postcard mailed from Google several days ago, if you receives this postcard, please reply this text message with the 5 digit PIN on the postcard or call us at 404-382-9768. Thanks`,

                },
                {
                    type: "email",
                    contents: 'Hi, <br>This is from QMenu, in order to promote your website on google, we requested a postcard mailed from Google several days ago, if you receives this postcard, please reply this email with the 5 digit PIN on the postcard, text us at 844-793-5942 or call us at 404-382-9768.<br> Thanks',
                },
                {
                    type: "fax",
                    contents: 'http://qmenu360.com/google-pin/fax_en.pdf'
                }
            ],
        },
        {
            language: 'English/Chinese',
            body: [
                {
                    type: "sms",
                    contents: `你好,这里是QMenu, 为了在谷歌推广您的网站，前几天，我们申请谷歌给您店里寄去一个明信片，在明信片上有一个5位数的号码，如果您收到了这个明信片，请直接回复这个短信, 或者给我们的客服打电话 404-382-9768. 多谢!
                    This is from QMenu, in order to promote your website on google, we requested a postcard mailed from Google several days ago, if you receives this postcard, please reply this text message with the 5 digit PIN on the postcard or call us at 404-382-9768. Thanks`,

                },
                {
                    type: "email",
                    contents: `你好,<br>这里是QMenu, 为了在谷歌推广您的网站，前几天，我们申请谷歌给您店里寄去一个明信片，在明信片上有一个5位数的号码，如果您收到了这个明信片，请回复这个邮件5位数的号码, 或者发短信到844-793-5942或者给我们的客服打电话 404-382-9768. 多谢!<br>
                    Hi, <br>This is from QMenu, in order to promote your website on google, we requested a postcard mailed from Google several days ago, if you receives this postcard, please reply this email with the 5 digit PIN on the postcard, text us at 844-793-5942, or call us at 404-382-9768.<br> Thanks`,
                },
                {
                    type: "fax",
                    contents: 'http://qmenu360.com/google-pin/fax_en_cn.pdf'
                }
            ],


        }
    ]


    constructor(private _api: ApiService, private _global: GlobalService) { }

    ngOnChanges(changes: SimpleChanges) {
        if (this.restaurant) {
            const channels = (this.restaurant.channels || []).map(c => {
                if (c.type === 'SMS') {
                    return { type: "sms", value: c.value }
                }
                else if (c.type === 'Email') {
                    return { type: "email", value: c.value }
                }
                else if (c.type === 'Fax') {
                    return { type: "fax", value: c.value }
                }
            });
            this.contactList = Array.from(new Set(channels)).filter(item => item);
        }
    }
    onChange() {
        if (this.messageTo && this.messageSelected) {
            this.contents = this.messageSelected.body.find(e => e.type === this.messageTo.type).contents;
        }
    }

    sendMessage() {
        console.log("messageTo", this.messageTo);
        //console.log("type",(this.getContactList().filter(p=> p.value == this.messageTo))['type']);
        if (this.messageTo.type === 'sms') {
            this._api.post(environment.qmenuApiUrl + 'events/add-jobs', [{
                "name": "send-sms",
                "params": {
                    "to": this.messageTo.value,
                    "from": "8447935942",
                    "providerName": "plivo",
                    "message": this.contents
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

        } else if (this.messageTo.type === 'email') {
            this._api.post(environment.qmenuApiUrl + 'events/add-jobs', [{
                "name": "send-email",
                "params": {
                    "to": this.messageTo.value,
                    "subject": "QMenu Google PIN",
                    "html": this.contents
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
        else if (this.messageTo.type === 'fax') {
            this._api.post(environment.qmenuApiUrl + 'events/add-jobs', [{
                "name": "send-fax",
                "params": {
                    "from": "8555582558",
                    "to": this.messageTo.value,
                    "mediaUrl:": this.contents,
                    "providerName": "twilio"
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