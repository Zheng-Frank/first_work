import {AlertType} from '../../../classes/alert-type';
import {Component, EventEmitter, Input, Output, ViewChild} from '@angular/core';
import {GlobalService} from 'src/app/services/global.service';
import {ApiService} from 'src/app/services/api.service';
import {environment} from '../../../../environments/environment';
import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';

enum EmailContentModes {
  Editing, Preview
}

@Component({
  selector: 'app-send-message',
  templateUrl: './send-message.component.html',
  styleUrls: ['./send-message.component.css']
})
export class SendMessageComponent {
  @ViewChild('sendMsgModal') sendMsgModal: ModalComponent;
  @Input() templates;
  @Input() channels;
  @Input() allowCustomTemplate = false;
  @Output() success = new EventEmitter();
  targets = [];
  template = {title: "", smsContent: "", subject: "", emailContent: ""};
  emailContentMode = EmailContentModes.Editing;
  customTemplate = {title: "Custom", smsContent: '', subject: '', emailContent: ''};

  constructor(private _api: ApiService, private _global: GlobalService) {
  }

  cleanup() {
    this.targets = [];
    this.template = {title: "", smsContent: "", subject: "", emailContent: ""};
    this.emailContentMode = EmailContentModes.Editing;
  }

  onShow() {
    this.cleanup();
    let flatted = (this.allowCustomTemplate ? [this.customTemplate] : []).concat(...this.templates);
    if (flatted.length === 1) {
      this.template = flatted[0];
    }
    if (this.channels.length === 1) {
      this.targets.push(this.channels[0]);
    }
  }

  show() {
    this.sendMsgModal.show();
  }

  get emailContentModes() {
    return EmailContentModes;
  }

  canEdit() {
    return this.template.title === this.customTemplate.title;
  }

  canSend() {
    if (this.targets.length <= 0) {
      return false;
    }
    if (this.hasEmail()) {
      return !!this.template.emailContent && !!this.template.subject;
    }
    if (this.hasSMS()) {
      return !!this.template.smsContent;
    }
    return true;
  }

  channelIcon(type) {
    return ({"Email": "envelope-square"}[type] || type).toLowerCase();
  }

  get sortedChannels() {
    return this.channels.sort((x, y) => (x.value || '').localeCompare(y.value));
  }

  changeTpl(e) {
    this.template = (this.allowCustomTemplate ? [this.customTemplate] : [])
      .concat(...this.templates).find(x => x.title === e.target.value);
  }

  hasEmail() {
    return this.targets.some(t => t.type === 'Email');
  }

  hasSMS() {
    return this.targets.some(t => t.type === 'SMS');
  }

  selectTarget(e, target) {
    if (e.target.checked) {
      this.targets.push(target);
    } else {
      this.targets = this.targets.filter(x => x !== target);
    }
  }


  send() {
    const jobs = this.targets.map(target => {
      return {
        'SMS': {
          'name': 'send-sms',
          'params': {
            'to': target.value,
            'from': '8557592648',
            'providerName': 'plivo',
            'message': this.template.smsContent,
            'trigger': {
              'id': this._global.user._id,
              'name': this._global.user.username,
              'source': 'CSR',
              'module': 'Send Message'
            }
          }
        },
        'Email': {
          'name': 'send-email',
          'params': {
            'to': target.value,
            'subject': this.template.subject,
            'html': this.template.emailContent,
            'trigger': {
              'id': this._global.user._id,
              'name': this._global.user.username,
              'source': 'CSR',
              'module': 'Send Message'
            }
          }
        }
      }[target.type];
    });

    this._api.post(environment.qmenuApiUrl + 'events/add-jobs', jobs)
      .subscribe(
        () => {
          this._global.publishAlert(AlertType.Success, 'Text message sent success');
          this.sendMsgModal.hide();
          this.success.emit(this.template);
        },
        error => {
          console.log(error);
          this._global.publishAlert(AlertType.Danger, 'Text message sent failed!');
        }
      );
  }

}
