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
    @Input() restaurantId;
    restaurant;
    contactList = [];
    messageTo;
    messageSelected;
    lanugages = ['Chinese', 'English', 'English/Chinese'];
    noticeLanguage;
    noticeType;
    noticeContent;
    contents = [
        {
            noticeType: 'First Notice',
            messages: [
                {
                    language: 'Chinese',
                    body: [
                        {
                            type: "sms",
                            contents: `你好,这里是QMenu, 为了在谷歌推广您的网站，今天我们申请谷歌给您店里寄去一个明信片，3-5天应该会寄到. 在明信片上有一个5位数的号码，如果您收到了这个明信片，请直接回复这个短信, 发给我们这个5位数号码 (请注意，此短信不能接受照片), 或者给我们的客服打电话 404-382-9768. 多谢!`

                        },
                        {
                            type: "email",
                            contents: `你好,<br>这里是QMenu, 为了在谷歌推广您的网站，今天我们申请谷歌给您店里寄去一个明信片，3-5天应该会寄到. 在明信片上有一个5位数的号码，如果您收到了这个明信片，请回复这个邮件5位数的号码, 或者发短信到844-793-5942或者给我们的客服打电话 404-382-9768. 多谢!`,
                        },
                        {
                            type: "fax",
                            contents: 'http://qmenu360.com/google-pin/1st_fax_cn.pdf'
                        }
                    ],

                },
                {
                    language: 'English',
                    body: [
                        {
                            type: "sms",
                            contents: `This is from QMenu, in order to promote your website on Google, we just requested a postcard mailed from Google, it may take 3-5 days to arrive. If you receive this postcard, please reply this text message with the 5 digit PIN on the postcard(Pls note, this number can not accept picture) or call us at 404-382-9768. Thanks`,

                        },
                        {
                            type: "email",
                            contents: 'Hi, <br>This is from QMenu, in order to promote your website on google, we just requested a postcard mailed from Google, it may take 3-5 days to arrive. If you receive this postcard, please reply this email with the 5 digit PIN on the postcard, text us at 844-793-5942 or call us at 404-382-9768.<br> Thanks',
                        },
                        {
                            type: "fax",
                            contents: 'http://qmenu360.com/google-pin/1st_fax_en.pdf'
                        }
                    ],
                },
                {
                    language: 'English/Chinese',
                    body: [
                        {
                            type: "sms",
                            contents: `你好,这里是QMenu, 为了在谷歌推广您的网站，今天我们申请谷歌给您店里寄去一个明信片，3-5天应该会寄到. 在明信片上有一个5位数的号码，如果您收到了这个明信片，请直接回复这个短信, 发给我们这个5位数号码 (请注意，此短信不能接受照片). 或者给我们的客服打电话 404-382-9768. 多谢!
                        This is from QMenu, in order to promote your website on Google, we just requested a postcard mailed from Google, it may take 3-5 days to arrive. If you receive this postcard, please reply this text message with the 5 digit PIN on the postcard or call us at 404-382-9768. Thanks`,

                        },
                        {
                            type: "email",
                            contents: `你好,<br>这里是QMenu, 为了在谷歌推广您的网站，今天我们申请谷歌给您店里寄去一个明信片，3-5天应该会寄到. 在明信片上有一个5位数的号码，如果您收到了这个明信片，请回复这个邮件5位数的号码, 或者发短信到844-793-5942或者给我们的客服打电话 404-382-9768. 多谢!<br>
                        Hi, <br>This is from QMenu, in order to promote your website on google, we just requested a postcard mailed from Google, it may take 3-5 days to arrive. If you receive this postcard, please reply this email with the 5 digit PIN on the postcard, text us at 844-793-5942 or call us at 404-382-9768.<br> Thanks`
                        },
                        {
                            type: "fax",
                            contents: 'http://qmenu360.com/google-pin/1st_fax_en_cn.pdf'
                        }
                    ],


                }
            ]
        },
        {
            noticeType: 'Follow up Notice',
            messages: [
                {
                    language: 'Chinese',
                    body: [
                        {
                            type: "sms",
                            contents: `你好,这里是QMenu, 为了在谷歌推广您的网站，前几天，我们申请谷歌给您店里寄去一个明信片，在明信片上有一个5位数的号码，如果您收到了这个明信片，请直接回复这个短信, 发给我们这个5位数号码 (请注意，此短信不能接受照片), 或者给我们的客服打电话 404-382-9768. 多谢!`

                        },
                        {
                            type: "email",
                            contents: `你好,<br>这里是QMenu, 为了在谷歌推广您的网站，前几天，我们申请谷歌给您店里寄去一个明信片，在明信片上有一个5位数的号码，如果您收到了这个明信片，请回复这个邮件5位数的号码, 或者发短信到844-793-5942或者给我们的客服打电话 404-382-9768. 多谢!`,
                        },
                        {
                            type: "fax",
                            contents: 'http://qmenu360.com/google-pin/2nd_fax_cn.pdf'
                        }
                    ],

                },
                {
                    language: 'English',
                    body: [
                        {
                            type: "sms",
                            contents: `This is from QMenu, in order to promote your website on google, we requested a postcard mailed from Google several days ago, if you receive this postcard, please reply this text message with the 5 digit PIN on the postcard(Pls note, this number can not accept picture) or call us at 404-382-9768. Thanks`,

                        },
                        {
                            type: "email",
                            contents: 'Hi, <br>This is from QMenu, in order to promote your website on google, we requested a postcard mailed from Google several days ago, if you receive this postcard, please reply this email with the 5 digit PIN on the postcard, text us at 844-793-5942 or call us at 404-382-9768.<br> Thanks',
                        },
                        {
                            type: "fax",
                            contents: 'http://qmenu360.com/google-pin/2nd_fax_en.pdf'
                        }
                    ],
                },
                {
                    language: 'English/Chinese',
                    body: [
                        {
                            type: "sms",
                            contents: `你好,这里是QMenu, 为了在谷歌推广您的网站，前几天，我们申请谷歌给您店里寄去一个明信片，在明信片上有一个5位数的号码，如果您收到了这个明信片，请直接回复这个短信, 发给我们这个5位数号码 (请注意，此短信不能接受照片)或者给我们的客服打电话 404-382-9768. 多谢!
                            This is from QMenu, in order to promote your website on google, we requested a postcard mailed from Google several days ago, if you receive this postcard, please reply this text message with the 5 digit PIN on the postcard (Pls note, this number can not accept picture) or call us at 404-382-9768. Thanks`,

                        },
                        {
                            type: "email",
                            contents: `你好,<br>这里是QMenu, 为了在谷歌推广您的网站，前几天，我们申请谷歌给您店里寄去一个明信片，在明信片上有一个5位数的号码，如果您收到了这个明信片，请回复这个邮件5位数的号码, 或者发短信到844-793-5942或者给我们的客服打电话 404-382-9768. 多谢!<br>
                            Hi, <br>This is from QMenu, in order to promote your website on google, we requested a postcard mailed from Google several days ago, if you receive this postcard, please reply this email with the 5 digit PIN on the postcard, text us at 844-793-5942, or call us at 404-382-9768.<br> Thanks`,
                        },
                        {
                            type: "fax",
                            contents: 'http://qmenu360.com/google-pin/2nd_fax_en_cn.pdf'
                        }
                    ],


                }
            ]
        }
    ]

    noticeTypes = this.contents.map(each => each.noticeType);

    constructor(private _api: ApiService, private _global: GlobalService) { }

    async ngOnChanges(changes: SimpleChanges) {
        if (this.restaurantId) {
            const restaurants = await this._api.get(environment.qmenuApiUrl + "generic", {
                resource: "restaurant",
                query: {
                    _id: { $oid: this.restaurantId }
                }
            }).toPromise();
            this.restaurant = restaurants[0];
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
        if (this.messageTo && this.noticeLanguage && this.noticeType) {
            this.noticeContent = this.contents.find(e => e.noticeType === this.noticeType)
                .messages.find(m => m.language === this.noticeLanguage)
                .body.find(eachBody => eachBody.type === this.messageTo.type).contents;

            console.log(this.noticeContent);
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
                    "message": this.noticeContent
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
                    "html": this.noticeContent
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
                    "mediaUrl": this.noticeContent,
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