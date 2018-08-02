import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { GmbAccount } from '../../../classes/gmb/gmb-account';

@Component({
  selector: 'app-gmb-account-editor',
  templateUrl: './gmb-account-editor.component.html',
  styleUrls: ['./gmb-account-editor.component.css']
})
export class GmbAccountEditorComponent implements OnInit {
  @Output() submit = new EventEmitter();
  @Output() remove = new EventEmitter();
  @Output() cancel = new EventEmitter();
  @Input() gmbAccount: GmbAccount;

  newPassword: string = null;

  submitClicked = false;

  constructor() { }

  ngOnInit() {
  }

  isEmailValid() {
    return this.gmbAccount.email && this.gmbAccount.email.match(/\S+@\S+\.\S+/);
  }

  clickCancel() {
    this.cancel.emit();
  }

  clickRemove() {
    this.remove.emit(this.gmbAccount);
  }

  clickSubmit() {
    this.submitClicked = true;
    // trim
    this.gmbAccount.email = (this.gmbAccount.email || '').trim();

    // case of update
    if (this.gmbAccount._id && this.newPassword) {
      this.gmbAccount.password = this.newPassword;
    }
    if (this.isEmailValid() && (this.gmbAccount._id && this.newPassword || (!this.gmbAccount._id && this.gmbAccount.password))) {
      this.submit.emit(this.gmbAccount);
    }
  }
}
