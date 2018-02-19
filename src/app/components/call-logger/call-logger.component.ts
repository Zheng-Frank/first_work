import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { environment } from '../../../environments/environment';
import { GlobalService } from '../../services/global.service';
import { Lead } from '../../classes/lead';
import { CallLog } from '../../classes/call-log';
import { DeepDiff } from '../../classes/deep-diff';
import { AlertType } from '../../classes/alert-type';

@Component({
  selector: 'app-call-logger',
  templateUrl: './call-logger.component.html',
  styleUrls: ['./call-logger.component.scss']
})
export class CallLoggerComponent implements OnInit {
  @Input() lead: Lead;
  @Input() callLog = new CallLog();
  @Output() cancel = new EventEmitter();
  @Output() submit = new EventEmitter();

  newContactName;

  callLogFieldDescriptors = [
    {
      field: 'lineStatus', // 
      label: 'Line Status',
      required: true,
      inputType: 'single-select',
      items: [
        { object: 'busy', text: 'Busy', selected: false },
        { object: 'connected', text: 'Connected', selected: false },
        { object: 'voicemail', text: 'Voicemail', selected: false },
      ]
    }
  ];

  contactItems = [];

  salesResultItems = [
    {
      text: 'Rejected',
      object: 'rejected',
      selected: false
    },
    {
      text: 'Interested',
      object: 'interested',
      selected: false
    },
    {
      text: 'Success',
      object: 'success',
      selected: false
    },
    {
      text: 'Existing qMenu Customer',
      object: 'qmenuCustomer',
      selected: false
    }
  ];

  rejectedReasons = [
    {
      text: 'Too Many',
      object: 'too many',
      selected: false
    },
    {
      text: 'Rate Too High',
      object: 'rate too high',
      selected: false
    },
    {
      text: 'Not Provided',
      object: 'not provided',
      selected: false
    }
  ];
  newRejectedReason;

  othersItems = [
    {
      text: 'Asked More Info',
      object: 'askedMoreInfo',
      selected: false
    },
    {
      text: 'Owner Busy',
      object: 'ownerIsBusy',
      selected: false
    },
    {
      text: 'Owner Not In',
      object: 'ownerIsAbsent',
      selected: false
    }
  ];

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
  }


  getContactItems() {
    if (this.contactItems.length === 0) {
      this.contactItems = (this.lead.contacts || []).map(contact => ({
        text: contact,
        object: contact,
        selected: false
      }));
    }
    return this.contactItems;
  }

  selectContact(event) {
    // event is the contact list
    this.callLog.callees = event.filter(i => i.selected).map(i => i.object);
  }

  selectSalesResult(event) {
    delete this.callLog['salesOutcome'];
    this.salesResultItems.map(i => {
      if (i.selected) {
        this.callLog['salesOutcome'] = i.object;
      }
    });
  }

  selectRejectedReason(event) {

  }

  selectOthers(event) {
    this.othersItems.map(i => {
      if (i.selected) {
        this.callLog[i.object] = true;
      } else {
        delete this.callLog[i.object];
      }
    });
  }

  isRejected() {
    return this.salesResultItems.some(sr => sr.text === 'Rejected' && sr.selected);
  }

  addNewRejectedReason() { }

  cancelClicked() {
    this.cancel.emit();
  }

  submitClicked() {
    this.submit.emit();
  }

  callLogSubmit(event) {
    this.submit.emit(event);
  }
  callLogCancel() {
    this.cancel.emit();
  }

  addNewContact() {
    this.lead.contacts = this.lead.contacts || [];
    if (this.newContactName && this.newContactName.trim() && this.lead.contacts.indexOf(this.newContactName.trim()) < 0) {
      const newLead = JSON.parse(JSON.stringify(this.lead));
      newLead.contacts.push(this.newContactName.trim());
      this.patchDiff(this.lead, newLead);

      this.contactItems.push({
        text: this.newContactName.trim(),
        object: this.newContactName.trim(),
        selected: true
      });

      this.newContactName = undefined;
    }

    // also trigger selectContact event
    this.selectContact(this.getContactItems());
  }

  patchDiff(originalLead, newLead) {
    console.log('patch')
    const diffs = DeepDiff.getDiff(originalLead._id, originalLead, newLead);
    if (diffs.length === 0) {
      this._global.publishAlert(AlertType.Info, 'Nothing to update');
    } else {
      // api update here...
      this._api.patch(environment.lambdaUrl + 'leads', diffs).subscribe(result => {
        // let's update original, assuming everything successful
        Object.assign(originalLead, newLead);
        for (let key in originalLead) {
          if (!newLead.hasOwnProperty(key)) {
            delete originalLead[key];
          }
        }
        this._global.publishAlert(AlertType.Success, originalLead.name + ' was updated');
      }, error => {
        this._global.publishAlert(AlertType.Danger, 'Error updating to DB');
      });
    }
  }

}
