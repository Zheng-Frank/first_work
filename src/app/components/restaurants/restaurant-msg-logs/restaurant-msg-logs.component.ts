import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { GlobalService } from '../../../services/global.service';
import { environment } from '../../../../environments/environment';
import { DomSanitizer } from '@angular/platform-browser';

enum msgViewOptionTypes {
  All = 'All',
  Inbound = 'Inbound',
  Outbound = 'Outbound'
}

@Component({
  selector: 'app-restaurant-msg-logs',
  templateUrl: './restaurant-msg-logs.component.html',
  styleUrls: ['./restaurant-msg-logs.component.css']
})
export class RestaurantMsgLogsComponent implements OnInit {

  constructor(private _api: ApiService, private _global: GlobalService, private sanitizer: DomSanitizer) { }

  @ViewChild('detailModal') detailModal;
  @ViewChild('emailHtmlModal') emailHtmlModal;
  @ViewChild('emailPreviewModal') emailPreviewModal;
  @Input() restaurant;

  messages = [];
  filteredMessages = [];
  current;
  msgViewOptions = [msgViewOptionTypes.All, msgViewOptionTypes.Inbound, msgViewOptionTypes.Outbound];
  msgViewOption = msgViewOptionTypes.Outbound;

  ngOnInit() {
    this.query();
  }

  get msgViewOptionTypes() {
    return msgViewOptionTypes;
  }

  getStatus(logs) {
    let latest = logs.sort((b, a) => new Date(a.time).valueOf() - new Date(b.time).valueOf())[0]
    return latest ? latest.status : ''
  }


  sanitized(origin) {
    return this.sanitizer.bypassSecurityTrustHtml(origin);
  }

  showEmailHtml(msgCotent) {
    this.current = msgCotent;
    this.emailHtmlModal.show();
  }

  showEmailPreview(msgCotent) {
    this.current = msgCotent;
    this.emailPreviewModal.show();
  }

  showJson(msgCotent) {
    this.current = msgCotent;
    this.detailModal.show();
  }

  async query() {
    const qmenuGMBPhone = '8557592648';
    let { channels } = this.restaurant;
    let phones = channels.filter(({ type }) => type === 'SMS').map(({ value }) => value);
    let emails = channels.filter(({ type }) => type === 'Email').map(({ value }) => value);
    // Outbound
    const jobs = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "job",
      aggregate: [
        {
          $match: {
            $or: [
              { name: 'send-sms', 'params.to': { $in: phones } },
              { name: 'send-email', 'params.to': { $in: emails } },
            ]
          }
        },
        { $sort: { _id: -1 } }
      ],
      limit: 100000
    }).toPromise();
    // Inbound
    //Retrieve Google PIn which got from SMS reply
    let googlePins = [];
    const googlePinEvents = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'event',
      aggregate: [
        {
          $match: {
            "name": "google-pin",
            "params.body.From": { $in: phones.map(phone => `1${phone}`) },
            "params.body.To": `1${qmenuGMBPhone}` // Us phone number starts with 1
          }
        },
        {
          $project: {
            _id: 1,
            "params.body.From": 1,
            "params.body.To": 1,
            "params.body.Text": 1,
            logs: { $slice: ["$logs", -1] },
            createdAt: 1
          }
        },
        { $sort: { _id: -1 } }
      ],
      limit: 100000
    }).toPromise();
    //Populatge Google PIN from rt logs with google-pin type
    (this.restaurant.logs || []).map(eachLog => {
      if (eachLog.type === 'google-pin') {
        let pin = eachLog.response || eachLog.response.trim() || '';
        let item = {
          from: 'Call Log',
          to: qmenuGMBPhone,
          text: eachLog.response,
          time: new Date(eachLog.time),
          logs: ['triggered']
        };
        if (pin.startsWith('[biz]')) {
          item.text = pin.replace('[biz]', '');
          item.from = 'Customer Input';
        }
        googlePins.push(item);
      }
    });
    //Populatge Google PIN from SMS reply
    googlePins = googlePins.concat(googlePinEvents.map(each => {
      return {
        id: each['_id'],
        from: (each.params.body.From || "").length == 11 ? each.params.body.From.toString().substring(1) : each.params.body.From,
        to: (each.params.body.To || "").length == 11 ? each.params.body.To.toString().substring(1) : each.params.body.To,
        text: (each.params.body.Text || "").replace(/\+/g, ' ').trim(),
        time: new Date(each.createdAt),
        logs: each.logs || []
      }
    }));
    this.messages = [...new Set((jobs || []).map(job => ({
      type: msgViewOptionTypes.Outbound,
      content: job
    }))), ...new Set((googlePins || []).map(googlePin => ({
      type: msgViewOptionTypes.Inbound,
      content: {
        name: 'reply-sms',
        params: {
          from: googlePin.from,
          to: googlePin.to,
          message: googlePin.text,
        },
        createdAt: googlePin.time,
        logs: googlePin.logs
      }
    })))];
    this.filterMsg();
  }

  filterMsg() {
    this.filteredMessages = this.messages;
    if (this.msgViewOption !== msgViewOptionTypes.All) {
      if (this.msgViewOption === msgViewOptionTypes.Inbound) {
        this.filteredMessages = this.filteredMessages.filter(msg => msg.type === msgViewOptionTypes.Inbound);
      } else if (this.msgViewOption === msgViewOptionTypes.Outbound) {
        this.filteredMessages = this.filteredMessages.filter(msg => msg.type === msgViewOptionTypes.Outbound);
      }
    }
  }

}
