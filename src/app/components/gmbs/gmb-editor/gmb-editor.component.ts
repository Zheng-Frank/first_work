import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Gmb } from '../../../classes/gmb';

@Component({
  selector: 'app-gmb-editor',
  templateUrl: './gmb-editor.component.html',
  styleUrls: ['./gmb-editor.component.css']
})
export class GmbEditorComponent implements OnInit {
  @Output() onDone = new EventEmitter();
  @Output() onDelete = new EventEmitter();
  @Output() onCancel = new EventEmitter();
  @Input() gmb: Gmb;

  newPassword: string = null;

  submitClicked = false;

  constructor() { }

  ngOnInit() {
  }

  isEmailValid() {
    return this.gmb.email && this.gmb.email.match(/\S+@\S+\.\S+/);
  }

  cancel() {
    this.onCancel.emit();
  }

  delete() {
    this.onDelete.emit(this.gmb);
  }

  done() {
    this.submitClicked = true;
    // trim
    this.gmb.email = (this.gmb.email || '').trim();

    // case of update
    if (this.gmb.id && this.newPassword) {
      this.gmb.password = this.newPassword;
    }
    if (this.isEmailValid() && (this.gmb.id && this.newPassword || (!this.gmb.id && this.gmb.password))) {
      this.onDone.emit(this.gmb);
    }
  }
}
