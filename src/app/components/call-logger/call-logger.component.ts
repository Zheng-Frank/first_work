import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Lead } from '../../classes/lead';

@Component({
  selector: 'app-call-logger',
  templateUrl: './call-logger.component.html',
  styleUrls: ['./call-logger.component.scss']
})
export class CallLoggerComponent implements OnInit {
  @Input() lead: Lead;
  @Output() cancel = new EventEmitter();
  @Output() submit = new EventEmitter();

  constructor() { }

  ngOnInit() {
  }

  cancelClicked() {
    this.cancel.emit();
  }

  submitClicked() {
    this.submit.emit();
  }
}
