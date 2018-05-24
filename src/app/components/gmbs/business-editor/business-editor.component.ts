import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Business } from '../../../classes/business';
import { Observable } from 'rxjs';
@Component({
  selector: 'app-business-editor',
  templateUrl: './business-editor.component.html',
  styleUrls: ['./business-editor.component.css']
})
export class BusinessEditorComponent implements OnInit {

  @Input() business: Business = new Business;
  @Output() onDone = new EventEmitter();
  @Output() onCancel = new EventEmitter();

  submitClicked = false;

  constructor() { }

  ngOnInit() {
  }

  isEmailValid() {
    return this.business.pop3Email && this.business.pop3Email.match(/\S+@\S+\.\S+/);
  }

  cancel() {
    this.onCancel.emit();
  }

  done() {

    this.submitClicked = true;
    // trim
    this.business.pop3Email = (this.business.pop3Email || '').trim();
    this.business.zipcode = (this.business.zipcode || '').trim();
    if (this.isEmailValid() && this.business.pop3Host && this.business.pop3Password && this.business.zipcode) {
      this.onDone.emit(this.business);
    }
  }
}

