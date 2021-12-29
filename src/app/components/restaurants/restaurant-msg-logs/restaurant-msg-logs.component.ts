import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {ApiService} from '../../../services/api.service';
import {GlobalService} from '../../../services/global.service';
import {environment} from '../../../../environments/environment';
import {DomSanitizer} from '@angular/platform-browser';

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

  jobs = [];
  current;

  ngOnInit() {
    this.query();
  }

  getStatus(logs) {
    let latest = logs.sort((b, a) => new Date(a.time).valueOf() - new Date(b.time).valueOf())[0]
    return latest ? latest.status : ''
  }


  sanitized(origin) {
    return this.sanitizer.bypassSecurityTrustHtml(origin);
  }

  showEmailHtml(job) {
    this.current = job;
    this.emailHtmlModal.show();
  }

  showEmailPreview(job) {
    this.current = job;
    this.emailPreviewModal.show();
  }

  showJson(job) {
    this.current = job
    this.detailModal.show();
  }

  async query() {
    let { channels } = this.restaurant;
    let phones = channels.filter(({type}) => type === 'SMS').map(({value}) => value);
    let emails = channels.filter(({type}) => type === 'Email').map(({value}) => value);

    this.jobs = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "job",
      aggregate: [
        {
          $match: {
            $or: [
              {name: 'send-sms', 'params.to': {$in: phones}},
              {name: 'send-email', 'params.to': {$in: emails}}
            ]
          }
        },
        {$sort: {_id: -1}}
      ],
      limit: 100000
    }).toPromise();

  }

}
