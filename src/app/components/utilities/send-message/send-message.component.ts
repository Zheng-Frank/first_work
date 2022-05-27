import { AlertType } from '../../../classes/alert-type';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { GlobalService } from 'src/app/services/global.service';
import { ApiService } from 'src/app/services/api.service';
import { environment } from '../../../../environments/environment';
import { DomSanitizer } from '@angular/platform-browser';
enum EmailContentModes {
  Origin, Preview
}

interface HtmlRenderParams {
  contentType: string;
  body: string;
  format: string;
}

interface MessageTemplate {
  title: string;
  subject: string;
  smsContent?: string;
  emailContent?: string;
  inputs?: { label: string, type?: string, value: string, canEmpty?: (inputs: any[], label: string) => boolean, apply: (content: string, value: any) => string }[];
  selects?: { label: string, type?: string, value: string, options: any[], apply: (content: string, value: any) => string }[];
  smsPreview?: string;
  uploadHtml?: (body: string) => HtmlRenderParams;
}

const EmptyTemplate = { title: '', smsContent: '', subject: '', emailContent: '' };

@Component({
  selector: 'app-send-message',
  templateUrl: './send-message.component.html',
  styleUrls: ['./send-message.component.css']
})
export class SendMessageComponent {
  @Input() templates;
  @Input() channels;
  @Input() allowCustomTemplate = false;
  @Input() useCustomTarget = false;
  @Output() success = new EventEmitter();
  targets = [];
  phoneNumber = '';
  template: MessageTemplate = { ...EmptyTemplate };
  templateType = '';
  emailContentMode = EmailContentModes.Origin;
  smsContentMode = EmailContentModes.Origin;
  customTemplate: MessageTemplate = { title: 'Custom', smsContent: '', subject: '', emailContent: '' };
  disabledSendBtn = false;

  constructor(private _api: ApiService, private _global: GlobalService, private sanitizer: DomSanitizer) {
  }

  get templateTypes() {
    let types = Object.keys(this.templates);
    if (this.allowCustomTemplate) {
      types.unshift('Custom');
    }
    return types;
  }

  changeTplType(type) {
    this.templateType = type;
    if (type === 'Custom') {
      this.template = { ...this.customTemplate };
    } else {
      this.template = this.templates[type][0];
      this.refreshTargets();
    }
  }

  refreshTargets() {
    if (!this.template) {
      return;
    }
    if (!this.template.smsContent) {
      this.targets = this.targets.filter(x => x.type !== 'SMS');
    }
    if (!this.template.emailContent) {
      this.targets = this.targets.filter(x => x.type !== 'Email');
    }
  }

  changeTpl(e) {
    this.template = this.templates[this.templateType].find(x => x.title === e.target.value);
    this.refreshTargets();
  }

  cleanup() {
    this.targets = [];
    this.template = { ...EmptyTemplate };
    this.phoneNumber = '';
    if (this.allowCustomTemplate) {
      this.templateType = 'Custom';
      this.template = { ...this.customTemplate };
    }
    this.emailContentMode = EmailContentModes.Origin;
    this.disabledSendBtn = false;
  }

  init() {
    this.cleanup();
    if (!this.allowCustomTemplate && this.templateTypes.length === 1) {
      this.templateType = this.templateTypes[0];
      this.template = this.templates[this.templateType][0];
    }
    if (this.channels && this.channels.length === 1) {
      this.targets.push(this.channels[0]);
    }
  }

  get emailContentModes() {
    return EmailContentModes;
  }

  canEdit() {
    return this.template.title === this.customTemplate.title;
  }

  canEmpty(field) {
    let { inputs } = this.template;
    this.disabledSendBtn = !field.canEmpty(inputs, field.label) ? true : false;
  }

  canSend() {
    if ((this.targets.length <= 0 && !this.isPhoneValid()) || !this.template) {
      return false;
    }
    let { subject, emailContent, smsContent, inputs } = this.template;
    if (this.hasEmail() && (!emailContent || !subject)) {
      return false;
    }
    if (this.hasSMS() && !smsContent) {
      return false;
    }
    // all inputs must have value
    if (inputs) {
      const requiredFields = inputs.filter(field => !!!field.canEmpty);
      if(requiredFields.some(field => !field.value)) {
        return false;
      }
      const canEmptyFields = inputs.filter(field => !!field.canEmpty);
      if(canEmptyFields.length > 0) {
        return !this.disabledSendBtn;
      }
      return true;
    }

    return true;
  }

  channelIcon(type) {
    return ({ 'Email': 'envelope-square' }[type] || type).toLowerCase();
  }

  get sortedChannels() {
    let channels = this.channels;
    if (this.templateType !== 'Custom' && this.template) {
      if (!this.template.smsContent) {
        channels = channels.filter(x => x.type !== 'SMS');
      }
      if (!this.template.emailContent) {
        channels = channels.filter(x => x.type !== 'Email');
      }
    }
    return channels.sort((x, y) => (x.value || '').localeCompare(y.value));
  }

  hasEmail() {
    return this.template && (this.templateType === 'Custom' || this.template.emailContent) && this.targets.some(t => t.type === 'Email');
  }

  isPhoneValid() {
    return /^(\d{3}-?){2}\d{4}$/.test(this.phoneNumber);
  }

  hasSMS() {
    return this.template && (this.templateType === 'Custom' || this.template.smsContent) && (this.targets.some(t => t.type === 'SMS') || this.useCustomTarget);
  }

  selectTarget(e, target) {
    if (e.target.checked) {
      this.targets.push(target);
    } else {
      this.targets = this.targets.filter(x => x !== target);
    }
  }

  sanitized(origin) {
    return this.sanitizer.bypassSecurityTrustHtml(origin);
  }

  async generateFormatHtml(loadParameters, formatParams, htmlContent) {
    try {
      const smsHtmlUrl = `${environment.appApiUrl}events/echo?${Object.keys(loadParameters).map(k => `${k}=${encodeURIComponent(loadParameters[k])}`).join('&')}`;
      let smsHtmlMediaUrl = `${environment.utilsApiUrl}render-url?url=${encodeURIComponent(smsHtmlUrl)}&format=${formatParams}`;
      let shortUrlObj = await this._api.post(environment.appApiUrl + 'utils/shorten-url', { longUrl: smsHtmlMediaUrl }).toPromise();
      smsHtmlMediaUrl = `${environment.shortUrlBase}${shortUrlObj.code}`
      htmlContent = htmlContent.replace(/%%AWS_QMENU_SERVICE_ONLINE_AGREEMENT_LINK_HERE%%/, smsHtmlMediaUrl);
    } catch (error) {
      console.log(error);
      return '';
    }
    return htmlContent;
  }
  // generate a sms html link and copy it to clipboard
  async copySMSContent() {
    let { inputs, smsContent, emailContent, smsPreview, uploadHtml } = this.template;
    if (inputs) {
      inputs.forEach(field => {
        if (smsContent) {
          smsContent = field.apply(smsContent, field.value);
        }
        if (smsPreview) {
          smsPreview = field.apply(smsPreview, field.value);
        }
      });
    }
    let uploadParams = uploadHtml(smsPreview);
    // some rt use sms to receive agreement, and need to generate a mediaUrl using email html content
    if (uploadParams) {
      const loadParameters = {
        'content-type': uploadParams.contentType,
        body: uploadParams.body
      };
      const formatParams = uploadParams.format;
      smsContent = await this.generateFormatHtml(loadParameters, formatParams, smsContent);

      if (!smsContent) {
        return this._global.publishAlert(AlertType.Danger, 'Generate sms content fail due to network error !')
      } else {
        const handleCopy = (e: ClipboardEvent) => {
          // clipboardData 可能是 null
          if (e.clipboardData) {
            e.clipboardData.setData('text/plain', smsContent);
          }
          e.preventDefault();
          // removeEventListener 要传入第二个参数
          document.removeEventListener('copy', handleCopy);
        };
        document.addEventListener('copy', handleCopy);
        document.execCommand('copy');
        this._global.publishAlert(AlertType.Success, 'the data of order has copyed to your clipboard ~', 1000);
      }
    }
  }

  async send() {
    // fill inputs
    let { inputs, selects, smsContent, emailContent, smsPreview, uploadHtml } = this.template;
    if (inputs) {
      inputs.forEach(field => {
        if (smsContent) {
          smsContent = field.apply(smsContent, field.value);
        }
        if (emailContent) {
          emailContent = field.apply(emailContent, field.value);
        }
        if (smsPreview) {
          smsPreview = field.apply(smsPreview, field.value);
        }
      });
    }
    if(selects) {
      selects.forEach(field => {
        if (smsContent) {
          smsContent = field.apply(smsContent, field.value);
        }
        if (emailContent) {
          emailContent = field.apply(emailContent, field.value);
        }
        if (smsPreview) {
          smsPreview = field.apply(smsPreview, field.value);
        }
      });
    }
    
    if (uploadHtml) {
      let uploadParams = uploadHtml(smsPreview);
      // some rt use sms to receive agreement, and need to generate a mediaUrl using email html content
      if (uploadParams) {
        const loadParameters = {
          'content-type': uploadParams.contentType,
          body: uploadParams.body
        };
        const formatParams = uploadParams.format;
        smsContent = await this.generateFormatHtml(loadParameters, formatParams, smsContent);
  
        if (!smsContent) {
          return this._global.publishAlert(AlertType.Danger, 'Generate sms content fail due to network error !')
        }
      }
    }

    let targets = this.useCustomTarget ? [{ value: this.phoneNumber, type: 'SMS' }] : this.targets;

    const jobs = targets.map(target => {
      return {
        'SMS': {
          'name': 'send-sms',
          'params': {
            'to': target.value,
            'from': '8557592648',
            'providerName': 'plivo',
            'message': smsContent,
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
            'html': emailContent,
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
          this.success.emit(this.template);
        },
        error => {
          console.log(error);
          this._global.publishAlert(AlertType.Danger, 'Text message sent failed!');
        }
      );
  }

}
