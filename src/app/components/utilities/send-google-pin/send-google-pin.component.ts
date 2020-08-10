import { Component, OnInit, Input, ViewChild, OnChanges, SimpleChanges, OnDestroy, Output, EventEmitter } from '@angular/core';
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
    @Output() sendToLog = new EventEmitter();


    lanugages = ['Chinese', 'English', 'English/Chinese'];
    noticeLanguage;

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
    noticeType;

    contactList = [];
    messageInfoList;

    constructor(private _api: ApiService, private _global: GlobalService) { }

    async ngOnChanges(changes: SimpleChanges) {
        if (this.restaurantId) {
            const restaurant = await this.getRestaurantById(this.restaurantId);
            this.contactList = this.getContactList(restaurant);
        }
    }

    private async getRestaurantById(restaurantId) {
        const restaurants = await this._api.get(environment.qmenuApiUrl + "generic", {
            resource: "restaurant",
            query: {
                _id: { $oid: restaurantId }
            },
            projection:{
                channels: 1
            },
        }).toPromise();
        return restaurants[0];
    }

    private getContactList(restaurant) {
        const contactListRaw = (restaurant.channels || []).map(c => {
            if (c.type === 'SMS' && c.notifications && c.notifications.includes('Order')) {
                return { type: "sms", value: c.value }
            }
            else if (c.type === 'Email' && c.notifications && c.notifications.includes('Order')) {
                return { type: "email", value: c.value }
            }
        });
        const contactList = Array.from(new Set(contactListRaw)).filter(item => item);
        return contactList;
    }

    onChange() {
        this.messageInfoList = this.getMessageInfoList(this.contactList, this.noticeLanguage, this.noticeType);
    }

    private getMessageInfoList(contactList, noticeLanguage, noticeType) {
        const messageInfoList = contactList.map(messageTo => ({
            messageTo: messageTo,
            noticeContent: this.getNoticeContent(messageTo, noticeLanguage, noticeType)
        }));
        return messageInfoList;
    }

    private getNoticeContent(messageTo, noticeLanguage, noticeType) {
        if (messageTo && noticeLanguage && noticeType) {
            const noticeContent = this.contents.find(e => e.noticeType === noticeType)
                .messages.find(m => m.language === noticeLanguage)
                .body.find(eachBody => eachBody.type === messageTo.type).contents;

            return noticeContent;
        }
    }

    sendMessages() {
        if (this.messageInfoList && this.messageInfoList.length) {
            const jobs = this.messageInfoList.map(messageInfo => {
                if (messageInfo.messageTo.type === 'sms') {
                    return {
                        "name": "send-sms",
                        "params": {
                            "to": messageInfo.messageTo.value,
                            "from": "8447935942",
                            "providerName": "plivo",
                            "message": messageInfo.noticeContent
                        }
                    };
                } else if (messageInfo.messageTo.type === 'email') {
                    return {
                        "name": "send-email",
                        "params": {
                            "to": messageInfo.messageTo.value,
                            "subject": "QMenu Google PIN",
                            "html": messageInfo.noticeContent
                        }
                    };
                }
                else {
                    return undefined;
                }
            }).filter(each => each);

            if (jobs.length) {
                this._api.post(environment.qmenuApiUrl + 'events/add-jobs', jobs)
                    .subscribe(
                        result => {
                            const message = "Message(s) sent successfully."
                            this._global.publishAlert(AlertType.Success, message);
                            this.sendToLog.emit({ channels: this.contactList, comments: message })
                        },
                        error => {
                            const message = "Error sending message(s)."
                            this._global.publishAlert(AlertType.Danger, message);
                            this.sendToLog.emit({ channels: this.contactList, comments: message })
                        }
                    );
            }
        }
    }
}