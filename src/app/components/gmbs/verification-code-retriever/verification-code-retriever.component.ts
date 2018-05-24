import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-verification-code-retriever',
  templateUrl: './verification-code-retriever.component.html',
  styleUrls: ['./verification-code-retriever.component.css']
})
export class VerificationCodeRetrieverComponent implements OnInit {

  @Output() onDone = new EventEmitter();
  @Output() onCancel = new EventEmitter();

  host = 'mail.qmenu.us';
  email = 'info@qmenu.us';
  password;
  submitClicked = false;
  retrievedCode = '';
  apiRequesting = false;

  constructor(private _api: ApiService) { }

  ngOnInit() {
  }

  isEmailValid() {
    return this.email && this.email.match(/\S+@\S+\.\S+/);
  }

  cancel() {
    this.onCancel.emit();
  }

  done() {
    this.retrievedCode = '';

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
            this.retrievedCode = result;
            console.log(result);
          },
          error => {
            this.apiRequesting = false;
            this.retrievedCode = error._body;
            console.log(error);
          });
    }
  }
}

