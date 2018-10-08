import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from '../../../../environments/environment'
import { GmbBiz } from '../../../classes/gmb/gmb-biz';
import { GlobalService } from '../../../services/global.service';
import { AlertType } from '../../../classes/alert-type';
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
  @Input() gmbBiz: GmbBiz;

  submitClicked = false;
  retrievedObj: any;
  apiRequesting = false;

  now = new Date();
  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
  }

  isEmailValid() {
    return this.email && this.email.match(/\S+@\S+\.\S+/);
  }

  async clickRetrieve() {
    this.retrievedObj = undefined;

    this.submitClicked = true;
    // trim
    this.email = (this.email || '').trim();

    if (this.isEmailValid() && this.host && this.password) {
      this.apiRequesting = true;
      let password = this.password;
      if (password.length > 20) {
        password = await this._api.post(environment.adminApiUrl + 'utils/crypto', { salt: this.email, phrase: password }).toPromise();
      }
      this._api
        .post(environment.autoGmbUrl + 'retrieveGodaddyEmailVerificationCode', { host: this.host, email: this.email, password: password })
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

  async clickSave() {
    if (this.password.length > 20) {
      return alert('Password length must be shorter than 20!');
    };

    if (!this.gmbBiz) {
      return alert('No biz to save!');
    }

    try {
      const encryptedPassword = await this._api.post(environment.adminApiUrl + 'utils/crypto', { salt: this.email, phrase: this.password }).toPromise();
      const oldBiz = {
        _id: this.gmbBiz._id
      };

      const newBiz = {
        _id: this.gmbBiz._id,
        qmenuPop3Email: this.email,
        qmenuPop3Host: this.host,
        qmenuPop3Password: encryptedPassword
      };

      await this._api.patch(environment.adminApiUrl + "generic?resource=gmbBiz", [{ old: oldBiz, new: newBiz }]).toPromise();
      this._global.publishAlert(AlertType.Success, 'Saved email');
    }
    catch (error) {
      this._global.publishAlert(AlertType.Danger, 'Error saving email');
    }

  }
}

