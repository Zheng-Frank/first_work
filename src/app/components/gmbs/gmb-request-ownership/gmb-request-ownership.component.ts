
import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-gmb-request-ownership',
  templateUrl: './gmb-request-ownership.component.html',
  styleUrls: ['./gmb-request-ownership.component.css']
})
export class GmbRequestOwnershipComponent implements OnInit {
  @Output() onDone = new EventEmitter();
  @Output() onCancel = new EventEmitter();

  email = 'qmenucsr@gmail.com';
  password;

  restaurantName = 'Peking Chinese Restaurant';
  zipcode = '30019';
  pop3Email = 'info@qmenu.us';
  pop3Password = '';
  pop3Host = 'mail.qmenu.us';

  submitClicked = false;
  apiResult = '';

  apiRequesting = false;

  constructor(private _api: ApiService) { }

  ngOnInit() {
  }

  isEmailValid(email) {
    return email && email.match(/\S+@\S+\.\S+/);
  }

  cancel() {
    this.onCancel.emit();
  }

  done() {
    this.apiResult = '';

    this.submitClicked = true;
    // trim
    this.email = (this.email || '').trim();

    if (this.isEmailValid(this.email) && this.isEmailValid(this.pop3Email) && this.password && this.pop3Password && this.restaurantName && this.zipcode && this.pop3Host) {
      this.apiRequesting = true;
      this._api
        .post('http://localhost:3000/requestOwnership', {
          pop3Host: this.pop3Host,
          pop3Email: this.pop3Email,
          pop3Password: this.pop3Password,
          zipcode: this.zipcode,
          businessName: this.restaurantName,
          email: this.email,
          password: this.password
        })
        .subscribe(
          result => {
            this.apiResult = result;
            console.log(result);
            this.apiRequesting = false;
          },
          error => {
            this.apiResult = error._body;
            console.log(error);
            this.apiRequesting = false;
          });
    }
  }
}
