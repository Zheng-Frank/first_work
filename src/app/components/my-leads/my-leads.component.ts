import { Component, OnInit, ViewChild } from "@angular/core";
import { ApiService } from "../../services/api.service";
import { environment } from "../../../environments/environment";
import { GlobalService } from "../../services/global.service";
import { Lead } from "../../classes/lead";
import { AlertType } from "../../classes/alert-type";
import { GmbInfo } from "../../classes/gmb-info";
import { DeepDiff } from "../../classes/deep-diff";
import { ModalComponent } from "@qmenu/ui/bundles/qmenu-ui.umd";
import { CallLog } from "../../classes/call-log";

@Component({
  selector: "app-my-leads",
  templateUrl: "./my-leads.component.html",
  styleUrls: ["./my-leads.component.scss"]
})
export class MyLeadsComponent implements OnInit {
  @ViewChild("leadModal") leadModal: ModalComponent;

  tabs = [
    "All",
    "Ongoing",
    "Need Callback",
    "Interested",
    "Failed",
    "Successful"
  ];
  activeTab = "All";

  apiRequesting = false;
  myLeads = [];

  leadsInProgress = [];

  selectedLead = new Lead();

  newCallLog = new CallLog();
  editingNewCallLog = false;

  // for editing existing call log
  selectedCallLog;

  constructor(private _api: ApiService, private _global: GlobalService) {
    this.populateMyLeads();
  }

  ngOnInit() {}

  populateMyLeads() {
    const query = {
      assignee: this._global.user.username
    };
    this._api
      .get(environment.adminApiUrl + "leads", {
        ids: [],
        limit: 4000,
        query: query
      })
      .subscribe(
        result => {
          this.myLeads = result.map(u => new Lead(u));
          this.myLeads.sort((u1, u2) =>
            (
              (u1.address || {}).administrative_area_level_1 + u1.name
            ).localeCompare(
              (u2.address || {}).administrative_area_level_1 + u2.name
            )
          );
          if (this.myLeads.length === 0) {
            this._global.publishAlert(AlertType.Info, "No lead found");
          }
        },
        error => {
          this._global.publishAlert(
            AlertType.Danger,
            "Error pulling leads from API"
          );
        }
      );
  }

  getLeadsForTab(tab) {
    switch (tab) {
      case "Ongoing":
        return this.myLeads.filter(lead => {
          const outcome = lead.getSalesOutcome();
          return (
            lead.callLogs &&
            lead.callLogs.length > 0 &&
            ["rejected", "interested", 'success', "qmenuCustomer"].indexOf(outcome) < 0
          );
        });
      case "Need Callback":
        return this.myLeads.filter(lead => lead.callLogs && lead.callLogs.length > 0 && lead.callLogs[lead.callLogs.length - 1].callbackTime );
      case "Failed":
        return this.myLeads.filter(
          lead => lead.getSalesOutcome() === "rejected"
        );
      case "Interested":
        return this.myLeads.filter(
          lead => lead.getSalesOutcome() === "interested"
        );
      case "Successful":
        return this.myLeads.filter(lead => {
          const outcome = lead.getSalesOutcome();
          return outcome === "qmenuCustomer" || outcome === "success";
        });
      default:
        return this.myLeads;
    }
  }

  scanLead(event) {
    const lead = event.lead;

    this.apiRequesting = true;
    this.leadsInProgress.push(lead);
    this._api
      .get(environment.internalApiUrl + "lead-info", {
        q: lead.name + " " + lead.address.route + " " + lead.address.postal_code
      })
      .subscribe(
        result => {
          const gmbInfo = result as GmbInfo;
          const clonedLead = new Lead(JSON.parse(JSON.stringify(lead)));

          if (gmbInfo.name && gmbInfo.name !== clonedLead.name) {
            clonedLead.oldName = clonedLead.name;
          } else {
            // to make sure carry the name
            gmbInfo.name = clonedLead.name;
          }

          Object.assign(clonedLead, gmbInfo);
          clonedLead.phones = clonedLead.phones || [];
          if (gmbInfo.phone && clonedLead.phones.indexOf(gmbInfo.phone) < 0) {
            clonedLead.phones.push(gmbInfo.phone);
            delete clonedLead["phone"];
          }
          clonedLead.gmbScanned = true;
          this.patchDiff(lead, clonedLead);
          this.apiRequesting = false;
          this.leadsInProgress = this.leadsInProgress.filter(l => l != lead);
          // notify done!
          event.acknowledge && event.acknowledge(null);
        },
        error => {
          this.apiRequesting = false;
          this.leadsInProgress = this.leadsInProgress.filter(l => l != lead);
          this._global.publishAlert(AlertType.Danger, "Failed to crawl");
          event.acknowledge && event.acknowledge("Error scanning GMB info");
        }
      );
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

  selectLead(lead) {
    this.selectedLead = lead;
    this.leadModal.show();
  }

  selectCallLog(log) {
    console.log("selecting call log");
    if (
      this.selectedCallLog &&
      this.selectedCallLog.time &&
      this.selectedCallLog.time.toString() === log.time.toString()
    ) {
      this.selectedCallLog = new CallLog();
    } else {
      this.selectedCallLog = new CallLog(log);
      console.log("a");
      console.log(this.selectedCallLog);
      console.log(log);
      console.log(this.selectedCallLog.time.toString() === log.time.toString());
    }
  }

  toggleNewCallLog() {
    this.editingNewCallLog = !this.editingNewCallLog;
    if (this.editingNewCallLog) {
      this.newCallLog = new CallLog();
      this.newCallLog.time = new Date();
      this.newCallLog.caller = this._global.user.username;
      if (this.selectedLead.phones && this.selectedLead.phones.length === 1) {
        this.newCallLog.phone = this.selectedLead.phones[0];
      }
    }
  }

  getLastCallLog(lead) {
    return lead.getLastCallLog() || {};
  }

  sumbitCallLog(event) {
    const leadClone = new Lead(this.selectedLead);
    leadClone.callLogs = leadClone.callLogs || [];
    if (event.object === this.newCallLog) {
      leadClone.callLogs.push(event.object);
    }

    // replace edited callLog, we can only use time as key to find it
    for (let i = 0; i < leadClone.callLogs.length; i++) {
      if (
        leadClone.callLogs[i].time.toString() === event.object.time.toString()
      ) {
        leadClone.callLogs[i] = event.object;
      }
    }
    event.acknowledge(null);

    this.editingNewCallLog = false;
    this.selectedCallLog = null;
    this.patchDiff(this.selectedLead, leadClone);
  }

  removeCallLog(event) {
    const leadClone = new Lead(this.selectedLead);
    leadClone.callLogs = (this.selectedLead.callLogs || []).filter(
      log => log !== event.object
    );

    event.acknowledge(null);
    this.selectedCallLog = null;
    this.patchDiff(this.selectedLead, leadClone);
  }

  getShortenedTimeZone(tz) {
    return (tz || "").replace("America/", "");
  }

  setActiveTab(tab) {
    this.activeTab = tab;
  }
}
