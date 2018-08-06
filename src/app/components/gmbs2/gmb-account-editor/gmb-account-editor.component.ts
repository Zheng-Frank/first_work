import { Component, OnInit, OnChanges, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { GmbAccount } from '../../../classes/gmb/gmb-account';
import { FormEvent } from '@qmenu/ui';

@Component({
  selector: 'app-gmb-account-editor',
  templateUrl: './gmb-account-editor.component.html',
  styleUrls: ['./gmb-account-editor.component.css']
})
export class GmbAccountEditorComponent implements OnInit, OnChanges {
  @Output() submit = new EventEmitter<FormEvent>();
  @Output() remove = new EventEmitter<FormEvent>();
  @Output() cancel = new EventEmitter();

  @Input() gmbAccount: GmbAccount;

  fieldDescriptors = [];

  constructor() { }

  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges) {
    this.fieldDescriptors = [
      {
        field: "email", //
        label: "Email",
        required: true,
        inputType: "text",
        items: [],
        disabled: this.gmbAccount && this.gmbAccount._id,
        validate: this.isEmailValid
      },
      {
        field: "password", //
        label: "Password",
        required: true,
        inputType: "password",
        items: []
      }];
  }

  formSubmit(event) {
    // make sure of lowercase of email
    this.gmbAccount.email = this.gmbAccount.email.toLowerCase().trim();
    this.submit.emit(event);
  }

  formCancel() {
    this.cancel.emit();
  }

  formRemove(event) {
    this.remove.emit(event);
  }

  isEmailValid(email) {
    return email && email.match(/\S+@\S+\.\S+/);
  }
}
