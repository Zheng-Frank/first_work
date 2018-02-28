import {
  Component,
  OnInit,
  Input,
  OnChanges,
  SimpleChanges,
  Output,
  EventEmitter
} from "@angular/core";
import { ApiService } from "../../services/api.service";
import { environment } from "../../../environments/environment";
import { GlobalService } from "../../services/global.service";
import { Lead } from "../../classes/lead";
import { CallLog } from "../../classes/call-log";
import { DeepDiff } from "../../classes/deep-diff";
import { AlertType } from "../../classes/alert-type";

@Component({
  selector: "app-call-logger",
  templateUrl: "./call-logger.component.html",
  styleUrls: ["./call-logger.component.scss"]
})
export class CallLoggerComponent implements OnInit, OnChanges {
  @Input() lead: Lead;
  @Input() callLog = new CallLog();
  @Input() showDelete = false;
  @Output() cancel = new EventEmitter();
  @Output() submit = new EventEmitter();
  @Output() remove = new EventEmitter();

  newContactName;

  callLogFieldDescriptors = [
    {
      field: "phone", //
      label: "Phone Number",
      required: true,
      inputType: "single-select",
      items: []
    },
    {
      field: "lineStatus", //
      label: "Line Status",
      required: true,
      inputType: "single-select",
      items: [
        { object: "busy", text: "Busy", selected: false },
        { object: "connected", text: "Connected", selected: false },
        { object: "voicemail", text: "Voicemail", selected: false },
        { object: "badNumber", text: "Bad Number", selected: false }
      ]
    }
  ];

  contactItems = [];

  salesResultItems = [];

  rejectedReasons = [];
  newRejectedReason;

  othersItems = [];

  constructor(private _api: ApiService, private _global: GlobalService) {}

  ngOnInit() {}

  ngOnChanges(changes: SimpleChanges) {
    // changes.prop contains the old and the new value...
    const phones = this.lead ? this.lead.phones || [] : [];
    this.callLogFieldDescriptors[0] = {
      field: "phone", //
      label: "Phone Number",
      required: true,
      inputType: "single-select",
      items: phones.map(p => ({
        text: p.substring(0, 3) + "-" + p.substring(3, 6) + "-" + p.substr(6),
        object: p,
        selected: false
      }))
    };

    // set contact items
    if (this.callLog && this.lead) {
      this.contactItems = (this.lead.contacts || []).map(contact => ({
        text: contact,
        object: contact,
        selected: (this.callLog.callees || []).indexOf(contact) >= 0
      }));

      this.salesResultItems = [
        {
          text: "Rejected",
          object: "rejected",
          selected: this.callLog.salesOutcome === "rejected"
        },
        {
          text: "Interested",
          object: "interested",
          selected: this.callLog.salesOutcome === "interested"
        },
        {
          text: "Success",
          object: "success",
          selected: this.callLog.salesOutcome === "success"
        },
        {
          text: "Existing qMenu Customer",
          object: "qmenuCustomer",
          selected: this.callLog.salesOutcome === "qmenuCustomer"
        }
      ];

      this.othersItems = [
        {
          text: "Hangup Immediately",
          object: "hangupImmediately",
          selected: !!this.callLog.hangupImmediately
        },
        {
          text: "Asked More Info",
          object: "askedMoreInfo",
          selected: !!this.callLog.askedMoreInfo
        },
        {
          text: "Owner Busy",
          object: "ownerIsBusy",
          selected: !!this.callLog.ownerIsBusy
        },
        {
          text: "Owner Not In",
          object: "ownerIsAbsent",
          selected: !!this.callLog.ownerIsAbsent
        },
        {
          text: "Updated Language",
          object: "updatedLanguage",
          selected: !!this.callLog.updatedLanguage
        }
      ];

      this.rejectedReasons = [
        {
          text: "Too Many",
          object: "too many",
          selected:
            (this.callLog.rejectedReasons || []).indexOf("too many") >= 0
        },
        {
          text: "Rate Too High",
          object: "rate too high",
          selected:
            (this.callLog.rejectedReasons || []).indexOf("rate too high") >= 0
        },
        {
          text: "Not Doing Online",
          object: "not doing online",
          selected:
            (this.callLog.rejectedReasons || []).indexOf("Not Doing Online") >=
            0
        },
        {
          text: "Directly Rejected / Not Provided",
          object: "no reason",
          selected:
            (this.callLog.rejectedReasons || []).indexOf("no reason") >= 0
        }
      ];

      (this.callLog.rejectedReasons || []).map(reason => {
        if (
          [
            "too many",
            "rate too high",
            "no reason",
            "not doing online"
          ].indexOf(reason) < 0
        ) {
          this.rejectedReasons.push({
            text: reason,
            object: reason,
            selected: true
          });
        }
      });
    }
  }

  getContactItems() {
    // if (this.contactItems.length === 0) {
    //   this.contactItems = (this.lead.contacts || []).map(contact => ({
    //     text: contact,
    //     object: contact,
    //     selected: false
    //   }));
    // }
    return this.contactItems;
  }

  selectContact(event) {
    // event is the contact list
    this.callLog.callees = event.filter(i => i.selected).map(i => i.object);
  }

  selectSalesResult(event) {
    delete this.callLog["salesOutcome"];
    this.salesResultItems.map(i => {
      if (i.selected) {
        this.callLog["salesOutcome"] = i.object;
      }
    });
  }

  selectRejectedReason(event) {
    this.callLog.rejectedReasons = [];
    this.rejectedReasons.map(i => {
      if (i.selected) {
        this.callLog.rejectedReasons.push(i.object);
      }
    });
  }

  addNewRejectedReason() {
    if (this.newRejectedReason && this.newRejectedReason.trim()) {
      this.rejectedReasons.push({
        text: this.newRejectedReason.trim(),
        object: this.newRejectedReason.trim(),
        selected: true
      });
    }
    this.newRejectedReason = undefined;
    this.selectRejectedReason(this.rejectedReasons);
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
    return this.salesResultItems.some(
      sr => sr.text === "Rejected" && sr.selected
    );
  }

  callLogSubmit(event) {
    // we need to maintain integrity: connected --> salesStatus --> rejected reasons
    let log = event.object;
    if (log.lineStatus !== "connected") {
      log.salesOutcome = undefined;
      log.rejectedReasons = undefined;
      log.callbackTime = undefined;
      log.hangupImmediately = undefined;
      log.askedMoreInfo = undefined;
      log.ownerIsBusy = undefined;
      log.updatedLanguage = undefined;
      log.ownerIsAbsent = undefined;
      log.comments = undefined;
    } else if (
      log.lineStatus === "connected" &&
      log.salesOutcome !== "rejected"
    ) {
      log.rejectedReasons = undefined;
    }
    this.submit.emit(event);
  }
  callLogCancel() {
    this.cancel.emit();
  }
  callLogDelete(event) {
    this.remove.emit(event);
  }

  addNewContact() {
    this.lead.contacts = this.lead.contacts || [];
    if (
      this.newContactName &&
      this.newContactName.trim() &&
      this.lead.contacts.indexOf(this.newContactName.trim()) < 0
    ) {
      const newLead = new Lead(this.lead);
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
    const diffs = DeepDiff.getDiff(originalLead._id, originalLead, newLead);
    if (diffs.length === 0) {
      this._global.publishAlert(AlertType.Info, "Nothing to update");
    } else {
      // api update here...
      this._api.patch(environment.adminApiUrl + "leads", diffs).subscribe(
        result => {
          // let's update original, assuming everything successful
          Object.assign(originalLead, newLead);
          for (let key in originalLead) {
            if (!newLead.hasOwnProperty(key)) {
              delete originalLead[key];
            }
          }
          this._global.publishAlert(
            AlertType.Success,
            originalLead.name + " was updated"
          );
        },
        error => {
          this._global.publishAlert(AlertType.Danger, "Error updating to DB");
        }
      );
    }
  }
}
