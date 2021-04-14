import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-notification-editor',
  templateUrl: './notification-editor.component.html',
  styleUrls: ['./notification-editor.component.css']
})
export class NotificationEditorComponent implements OnInit {

  @Input() notification; 
  
  @Output() onDone = new EventEmitter();
  @Output() onCancel = new EventEmitter();

  constructor() { }

  ngOnInit() {
  }

  saveNotification() {
    // ensure that type is always set to SMS. 
    this.onDone.emit(this.notification);
  }

  cancelEditing() {
    this.onCancel.emit(this.notification);
  }

}
