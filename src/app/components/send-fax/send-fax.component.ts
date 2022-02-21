import { Component, OnInit } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AlertType } from '../../classes/alert-type';
import { ApiService } from '../../services/api.service';
import { GlobalService } from '../../services/global.service';
import { HttpClient } from '@angular/common/http';
import { PDFDocument } from 'pdf-lib';

@Component({
  selector: 'app-send-fax',
  templateUrl: './send-fax.component.html',
  styleUrls: ['./send-fax.component.css']
})
export class SendFaxComponent implements OnInit {

  faxNumber = '';
  showFaxTips = false;
  faxHTML = '';
  faxFiles = null;
  sendingFax = false;

  constructor(private _api: ApiService, private _global: GlobalService, private _http: HttpClient) {
  }
  ngOnInit() {
  }

  upload(event) {
    this.faxFiles = event.target.files;
  }

  sendFaxReady() {
    return (this.faxHTML.length > 0 || (this.faxFiles || []).length > 0) && this.faxNumber
      && this.faxNumber.replace(/\D+/g, '').length === 10

  }

  async sendFax() {
    this.sendingFax = true;
    const faxNumber = this.faxNumber.replace(/\D+/g, '');
    // populate an array of fax jobs to all be sent at once. html content, if it exists, will be its own fax job
    // each file will be its own fax job. 
    const faxJobs = [];

    // HTML render 
    if (this.faxHTML.length > 0) {
      const loadParameters = {
        'content-type': 'text/html; charset=utf-8',
        body: this.faxHTML,
      };

      const faxHtmlUrl = `${environment.appApiUrl}events/echo?${Object.keys(loadParameters).map(k => `${k}=${encodeURIComponent(loadParameters[k])}`).join('&')}`;
      let faxHtmlMediaUrl = `${environment.utilsApiUrl}render-url?url=${encodeURIComponent(faxHtmlUrl)}&format=pdf`;

      faxJobs.push({
        name: "send-fax",
        params: {
          to: faxNumber,
          mediaUrl: faxHtmlMediaUrl,
          providerName: "telnyx",
          trigger: {
            "id": this._global.user._id,
            "name": this._global.user.username,
            "source": "CSR",
            "module": "Send Fax"
          }
        }
      });
    }

    for (let i = 0; i < (this.faxFiles || []).length; i += 1) {
      let mediaUrl;
      const currentFile = this.faxFiles[i];
      const apiPath = `utils/qmenu-uploads-s3-signed-url?file=${encodeURIComponent(currentFile.name)}`;

      // Get presigned url
      const response = await this._api.get(environment.appApiUrl + apiPath).toPromise();
      const presignedUrl = response['url'];
      const fileLocation = presignedUrl.slice(0, presignedUrl.indexOf('?'));

      await this._http.put(presignedUrl, currentFile).toPromise();
      // if it's already PDF, then we can directly send it to fax service.
      // otherwise we need to get a PDF version of the uploaded file (fileLocation) from our renderer service
      // please upload an image or text or html file for the following test
      if (fileLocation.toLowerCase().endsWith('pdf')) {
        mediaUrl = fileLocation;
      } else {
        mediaUrl = `${environment.utilsApiUrl}render-url?url=${encodeURIComponent(fileLocation)}&format=pdf`;
      }
      faxJobs.push({
        name: "send-fax",
        params: {
          to: faxNumber,
          mediaUrl,
          providerName: "telnyx",
          trigger: {
            "id": this._global.user._id,
            "name": this._global.user.username,
            "source": "CSR",
            "module": "Send Fax"
          }
        }
      })
    }

    try {
      await this._api.post(environment.qmenuApiUrl + 'events/add-jobs', faxJobs).toPromise();
      this._global.publishAlert(AlertType.Success, 'Fax sent success');
    } catch (err) {
      this._global.publishAlert(AlertType.Danger, 'Fax send failure');
      console.log(err);
    }

    this.clearFiles();
    this.sendingFax = false;
  }

  clearFiles() {
    this.faxFiles = null;
    const input = document.getElementById('faxFiles') as HTMLInputElement;
    input.value = '';
  }
}
