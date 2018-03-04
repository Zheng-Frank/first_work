import { Component, OnInit, Input } from '@angular/core';
import { Lead } from '../../classes/lead';
import { CallLog } from '../../classes/call-log';

@Component({
  selector: 'app-lead-call-log',
  templateUrl: './lead-call-log.component.html',
  styleUrls: ['./lead-call-log.component.scss']
})
export class LeadCallLogComponent implements OnInit {
  @Input() callLog: CallLog;
  constructor() { }

  ngOnInit() {
  }

}
