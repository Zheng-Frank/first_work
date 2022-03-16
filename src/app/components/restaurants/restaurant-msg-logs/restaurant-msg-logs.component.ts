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

  get msgViewOptionTypes(){
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
    let { channels } = this.restaurant;
    let phones = channels.filter(({ type }) => type === 'SMS').map(({ value }) => value);
    let emails = channels.filter(({ type }) => type === 'Email').map(({ value }) => value);
    // Inbound
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
    // Outbound
    const SMSes = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "sms",
      aggregate: [
        {
          $match: {
            $or: [
              {
                '$from': { $in: phones }
              }
            ]
          }
        },
        { $sort: { _id: -1 } }
      ],
      limit: 100000
    }).toPromise();
    this.messages = [...new Set((jobs || []).map(job => ({
      type: msgViewOptionTypes.Outbound,
      content: job
    }))), ...new Set((SMSes || []).map(SMS => ({
      type: msgViewOptionTypes.Inbound,
      content: {
        params: {
          from: SMS.from,
          to: SMS.to,
          message: (SMS.row || {}).Body || (SMS.text || ''),
        }
      }
    })))];
    this.messages = jobs;
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
