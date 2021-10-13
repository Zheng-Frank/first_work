import { Component, OnInit } from '@angular/core';
import {environment} from '../../../environments/environment';
import {AlertType} from '../../classes/alert-type';
import {ApiService} from '../../services/api.service';
import {GlobalService} from '../../services/global.service';
import {HttpClient} from '@angular/common/http';

@Component({
  selector: 'app-send-fax',
  templateUrl: './send-fax.component.html',
  styleUrls: ['./send-fax.component.css']
})
export class SendFaxComponent implements OnInit {

  faxNumber = '';
  sendFaxType = 'upload';
  faxHTML = '';
  faxFile = null;
  sendingFax = false;

  constructor(private _api: ApiService, private _global: GlobalService, private _http: HttpClient) {
  }
  ngOnInit() {
  }

  upload(event) {
    this.faxFile = event.target.files[0];
  }

  sendFaxReady() {
    return this.sendFaxType && this.faxNumber
      && this.faxNumber.replace(/\D+/g, '').length === 10
      && ({ 'upload': this.faxFile, 'html': this.faxHTML }[this.sendFaxType]);
  }

  async sendFax() {
    this.sendingFax = true;
    // mediaUrl HAS to be a URL of PDF. if we have HTML content, we need to "host" it somewhere
    const loadParameters = {
      'content-type': 'text/html; charset=utf-8',
      body: this.faxHTML,
    };

    const url = `${environment.appApiUrl}events/echo?${Object.keys(loadParameters).map(k => `${k}=${encodeURIComponent(loadParameters[k])}`).join('&')}`;
    let mediaUrl = `${environment.utilsApiUrl}render-url?url=${encodeURIComponent(url)}&format=pdf`;

    if (this.sendFaxType === 'upload') {
      const apiPath = `utils/qmenu-uploads-s3-signed-url?file=${this.faxFile.name}`;
      // Get presigned url
      const response = await this._api.get(environment.appApiUrl + apiPath).toPromise();
      const presignedUrl = response['url'];
      const fileLocation = presignedUrl.slice(0, presignedUrl.indexOf('?'));
      await this._http.put(presignedUrl, this.faxFile).toPromise();
      // if it's already PDF, then we can directly send it to fax service.
      // otherwise we need to get a PDF version of the uploaded file (fileLocation) from our renderer service
      // please upload an image or text or html file for the following test
      if (fileLocation.toLowerCase().endsWith('pdf')) {
        mediaUrl = fileLocation;
      } else {
        mediaUrl = `${environment.utilsApiUrl}render-url?url=${encodeURIComponent(fileLocation)}&format=pdf`;
      }
    }

    let faxNumber = this.faxNumber.replace(/\D+/g, '');
    let job = {
      name: "send-fax",
      params: {
        to: faxNumber,
        mediaUrl,
        providerName: "twilio",
        trigger: {
          "id": this._global.user._id,
          "name": this._global.user.username,
          "source": "CSR",
          "module": "Send Fax"
        }
      }
    };
    await this._api.post(environment.qmenuApiUrl + 'events/add-jobs', [job]).toPromise();
    this._global.publishAlert(AlertType.Success, 'Fax sent success');
    this.sendFaxType = 'upload';
    // do not clear the fax number or content!
    this.faxFile = null;
    this.sendingFax = false;
  }
}
