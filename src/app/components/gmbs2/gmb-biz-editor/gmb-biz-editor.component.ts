import { Component, OnInit, OnChanges, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { GmbBiz } from '../../../classes/gmb/gmb-biz';
import { FormEvent } from '@qmenu/ui';

@Component({
  selector: 'app-gmb-biz-editor',
  templateUrl: './gmb-biz-editor.component.html',
  styleUrls: ['./gmb-biz-editor.component.css']
})
export class GmbBizEditorComponent implements OnInit, OnChanges {
  @Output() submit = new EventEmitter<FormEvent>();
  @Output() remove = new EventEmitter<FormEvent>();
  @Output() cancel = new EventEmitter();

  @Input() gmbBiz: GmbBiz;

  fieldDescriptors = [];

  constructor() { }

  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges) {
    this.fieldDescriptors = [
      {
        field: "gmbWebsite",
        label: "Current GMB Website",
        disabled: true,
        required: false
      },
      {
        field: "qmenuWebsite",
        label: "qMenu Managed Website",
        required: false
      },
      {
        field: "qmenuPop3Host",
        label: "Godaddy Email Pop3 Host",
        required: false
      },
      {
        field: "qmenuPop3Email",
        label: "Pop3 Email",
        required: false,
        validate: this.isEmailValid,
      },

      {
        field: "qmenuPop3Password",
        label: "Pop3 Password (leave blank, unless updating)",
        inputType: "password",
        required: false,
        autocomplete: "new-password" // this will disable password autocomplete!
      },
      {
        field: "ignoreGmbOwnershipRequest",
        label: "Ignore GMB Requests",
        inputType: "checkbox",
        required: false
      },
      {
        field: "bizManagedWebsite",
        label: "Restaurant Insisted Website",
        required: false
      },
      {
        field: "comments",
        label: "Comments",
        inputType: "textarea",
        required: false
      }];

  }

  formSubmit(event) {
    // make sure of lowercase of email
    this.gmbBiz.qmenuPop3Email = this.gmbBiz.qmenuPop3Email ? this.gmbBiz.qmenuPop3Email.toLowerCase().trim() : undefined;

    this.submit.emit(event);
  }

  formCancel() {
    this.cancel.emit();
  }

  formRemove(event) {
    this.remove.emit(event);
  }

  isEmailValid(email) {
    return !email || (email && email.match(/\S+@\S+\.\S+/));
  }
}
