import { Component, OnInit, Input, Output } from "@angular/core";
import { Lead } from "../../../classes/lead";
import { Helper } from "../../../classes/helper";
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";

@Component({
  selector: "app-lead-info",
  templateUrl: "./lead-info.component.html",
  styleUrls: ["./lead-info.component.scss"]
})
export class LeadInfoComponent implements OnInit {
  @Input() lead: Lead;
  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() { }

  editLabelChange(result, field) {
    const value = (result.newValue || "").trim();
    let newLead = new Lead(this.lead);
    switch (field) {
      case "email":
      case "fax":
      case "language":
        if (value) {
          newLead[field] = value;
        } else {
          delete newLead[field];
        }
        break;
      case "phones":
      case "contacts":
        newLead[field] = newLead[field] || [];

        // case to remove this value
        if (!value) {
          newLead[field] = newLead[field].filter(p => p != result.oldValue);
        } else {
          const index = newLead[field].indexOf(result.oldValue);
          if (index < 0) {
            newLead[field].push(value);
          } else {
            newLead[field][index] = value;
          }
        }
        break;
      default:
        break;
    }
    this.patchDiff(this.lead, newLead);
  }

  patchDiff(originalLead, newLead) {
    if (Helper.areObjectsEqual(originalLead, newLead)) {
      this._global.publishAlert(AlertType.Info, "Nothing to update");
    } else {
      // api update here...
      this._api.patch(environment.adminApiUrl + "generic?resource=lead", [{
        old: originalLead,
        new: newLead
      }]).subscribe(
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
