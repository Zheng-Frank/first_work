import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-email-code-reader',
  templateUrl: './email-code-reader.component.html',
  styleUrls: ['./email-code-reader.component.css']
})

export class EmailCodeReaderComponent implements OnInit {

  @Output() retrieve = new EventEmitter();
  @Output() save = new EventEmitter();

  @Input() host = 'mail.qmenu.us';
  @Input() email = 'info@qmenu.us';
  @Input() password;
  @Input() requesterEmail;
  
  submitClicked = false;
  retrievedObj: any;
  apiRequesting = false;

  now = new Date();
  constructor(private _api: ApiService) { }

  ngOnInit() {
  }

  isEmailValid() {
    return this.email && this.email.match(/\S+@\S+\.\S+/);
  }

  clickRetrieve() {
    this.retrievedObj = undefined;

    this.submitClicked = true;
    // trim
    this.email = (this.email || '').trim();

    if (this.isEmailValid() && this.host && this.password) {
      this.apiRequesting = true;
      this._api
        .post('http://localhost:3000/retrieveGodaddyEmailVerificationCode', { host: this.host, email: this.email, password: this.password })
        .subscribe(
          result => {
            this.apiRequesting = false;
            this.retrievedObj = result;
            this.retrievedObj.time = new Date(Date.parse(this.retrievedObj.time));
            this.now = new Date();
            this.retrieve.emit(this.retrievedObj);
          },
          error => {
            this.apiRequesting = false;
            alert('Error retrieving email');
          });
    }
  }

  clickSave() {
    this.save.emit({
      host: this.host.toLocaleLowerCase().trim(),
      email: this.email.toLocaleLowerCase().trim(),
      password: this.password.trim()
    })
  }
}

