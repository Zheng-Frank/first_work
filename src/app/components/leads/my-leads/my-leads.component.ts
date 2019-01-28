import { Component, OnInit, ViewChild } from "@angular/core";
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { Lead } from "../../../classes/lead";
import { AlertType } from "../../../classes/alert-type";
import { ModalComponent } from "@qmenu/ui/bundles/qmenu-ui.umd";
import { CallLog } from "../../../classes/call-log";
import { User } from "../../../classes/user";
import { Helper } from "../../../classes/helper";

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
  allLeads = [];
  myLeads = [];
  users: User[];
  marketingUsers = [];

  leadsInProgress = [];
  agentList = [];
  selectAgents = [];
  selectedAgents = [];

  selectedLead = new Lead();

  newCallLog = new CallLog();
  editingNewCallLog = false;

  // for editing existing call log
  selectedCallLog;

  constructor(private _api: ApiService, private _global: GlobalService) {}

  ngOnInit() {
    this._api
      .get(environment.adminApiUrl + "generic", {
        resource: "user",
        limit: 1000
      })
      .subscribe(
        result => {
          this.users = result.map(u => new User(u));

          // make form selector here
          this.marketingUsers = result
            .map(u => new User(u))
            .filter(
              u =>
                u.manager == this._global.user.username &&
                (u.roles || []).some(
                  r => ["MARKETER", "MARKETING_DIRECTOR"].indexOf(r) >= 0
                )
            );
          this.marketingUsers.push(this._global.user);
          this.populateMyLeads();

          this.marketingUsers.map(each => {
            this.selectAgents.push({ text: each.username });
          });
        },
        error => {
          this._global.publishAlert(
            AlertType.Danger,
            "Error pulling users from API"
          );
        }
      );
  }

  agentFilter(event) {
    this.selectedAgents = [];
    event.map(each => {
      if (each.selected) {
        this.selectedAgents.push(each.text);
      }
    });

    //Show all the leads by default, if no agent selected
    if (this.selectedAgents.length == 0) {
      this.myLeads = this.allLeads;
    } else {
      this.myLeads = this.allLeads.filter(
        each => this.selectedAgents.indexOf(each.assignee) >= 0
      );
    }

  }

  populateMyLeads() {
    const queryOrClause = [];

    this.marketingUsers.map(each => {
      queryOrClause.push({ assignee: each.username });
    });
    const query = {
      $or: queryOrClause
    };

    this._api
      .get(environment.adminApiUrl + "generic", {
        resource: "lead",
        limit: 6000,
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
          this.allLeads = this.myLeads;
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
            ["rejected", "interested", "success", "qmenuCustomer"].indexOf(
              outcome
            ) < 0
          );
        });
      case "Need Callback":
        return this.myLeads.filter(
          lead =>
            lead.callLogs &&
            lead.callLogs.length > 0 &&
            lead.callLogs[lead.callLogs.length - 1].callbackTime
        );
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
      .get(environment.adminApiUrl + "utils/scan-gmb", {
        q: lead.name + " " + lead.address.route + " " + lead.address.postal_code
      })
      .subscribe(
        result => {
          const gmbInfo = result;
          const clonedLead = new Lead(JSON.parse(JSON.stringify(lead)));

          if (gmbInfo.name && gmbInfo.name !== clonedLead.name) {
            clonedLead.oldName = clonedLead.name;
          } else {
            // to make sure carry the name
            gmbInfo.name = clonedLead.name;
          }

          // currently we don't want to lose address in original lead
          if (!gmbInfo.address || !gmbInfo.address["place_id"]) {
            gmbInfo.address = clonedLead.address;
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
    if (Helper.areObjectsEqual(originalLead, newLead)) {
      this._global.publishAlert(AlertType.Info, "Nothing to update");
    } else {
      // api update here...
      this._api
        .patch(environment.adminApiUrl + "generic?resource=lead", [{old: originalLead, new: newLead}])
        .subscribe(
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
    if (
      this.selectedCallLog &&
      this.selectedCallLog.time &&
      this.selectedCallLog.hasSameTimeAs(log)
    ) {
      this.selectedCallLog = new CallLog();
    } else {
      this.selectedCallLog = new CallLog(log);
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
      if (leadClone.callLogs[i].hasSameTimeAs(event.object)) {
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
      log => !log.hasSameTimeAs(event.object)
    );

    event.acknowledge(null);
    this.selectedCallLog = null;
    this.patchDiff(this.selectedLead, leadClone);
  }

  getShortenedTimeZone(tz) {
    return (tz || "").replace("America/", "");
  }

  setActiveTab(tab) {
    setTimeout(() => {
      this.activeTab = tab;
    }, 0);
  }
}
