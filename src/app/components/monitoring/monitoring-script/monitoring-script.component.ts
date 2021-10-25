import { Component, OnInit, ViewChild } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
@Component({
  selector: 'app-monitoring-script',
  templateUrl: './monitoring-script.component.html',
  styleUrls: ['./monitoring-script.component.css']
})
export class MonitoringScriptComponent implements OnInit {
  @ViewChild('editModal') editModal;
  items = [];
  apiLoading = false;
  now = new Date();
  scriptInEditing: any = {};

  routineScripts = [];
  filteredRoutineScripts = [];
  selectedScript;
  errorsOnly;
  showDisabled = false;
  editingFields = ["_id", "name", "description", "waitSecondsBetweenRuns", "waitSecondsBetweenUows", "parallelProcessors", "unitOfWorksGeneratorName", "disabled"];

  constructor(private _api: ApiService, private _global: GlobalService) {
  }

  async ngOnInit() {
    this.populate();
  }

  toggleDisabled(event) {
    this.showDisabled = !this.showDisabled;
    this.filter();
  }

  canSuspendAll() {
    return this.routineScripts.length > 0 && this.routineScripts.some(s => !s.disabled);
  }

  canResumeAll() {
    return this.routineScripts.length > 0 && this.routineScripts.some(s => s.disabledBackup === false);
  }

  async suspendAll() {
    this.apiLoading = true;
    for (let script of this.routineScripts.filter(s => !s.disabled)) {
      await this._api.patch(environment.qmenuApiUrl + "generic?resource=routine-script", [
        {
          old: { _id: script._id },
          new: { _id: script._id, disabled: true, disabledBackup: false }
        }]);
    }
    await this.populate();
    this.apiLoading = false;
  }

  async resumeAll() {
    this.apiLoading = true;
    for (let script of this.routineScripts.filter(s => s.disabledBackup === false)) {
      await this._api.patch(environment.qmenuApiUrl + "generic?resource=routine-script", [
        {
          old: { _id: script._id, disabled: true, disabledBackup: false },
          new: { _id: script._id }
        }]);
    }
    await this.populate();
    this.apiLoading = false;
  }

  async toggleSelected(script, errorsOnly?) {
    this.errorsOnly = errorsOnly;
    if (this.selectedScript === script) {
      this.selectedScript = undefined;
    } else {
      this.selectedScript = script;
      await this.populateDetails(script._id);
    }
  }

  getScriptContent() {
    if (this.errorsOnly) {
      console.log(this.selectedScript.uowsHistory[0].uows);
      return this.selectedScript.uowsHistory[0].uows.filter(uow => uow.error);
    }
    return this.selectedScript;
  }

  async populate() {
    this.apiLoading = true;
    const scripts = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'routine-script',
      query: {},
      projection: {
        name: 1,
        description: 1,
        waitSecondsBetweenRuns: 1,
        unitOfWorksGeneratorName: 1,
        parallelProcessors: 1,
        disabled: 1,
        disabledBackup: 1,
        "uowsHistory.time": 1,
        // "uowsHistory.uows.assignedId": 1,
        "uowsHistory.uows.startedAt": 1,
        "uowsHistory.uows.endedAt": 1,
        // "uowsHistory.uows.result.body": 1,
        "uowsHistory.uows.error": 1,
      },
      sort: { name: 1 }
    }, 20);
    this.apiLoading = false;

    let fixedThings = false;
    // fix uowsHistory, 5/13/2020, induced by premature termination of running lambdas!
    for (let script of scripts) {
      if (script.uowsHistory && !Array.isArray(script.uowsHistory)) {
        await this._api.patch(environment.qmenuApiUrl + "generic?resource=routine-script", [{ old: { _id: script._id, uowsHistory: [] }, new: { _id: script._id } }]);
        script.uowsHistory = [];
        fixedThings = true;
      }
    }

    if (fixedThings) {
      alert('corrupted data detected. please reload.')
    }

    // compute stats of each uowsHistory
    scripts.map(script => (script.uowsHistory || []).map(uh => {
      const stats = {
        total: uh.uows.length,
        succeeded: 0,
        failed: 0,
        inProgress: 0,
        notStarted: 0,
        minStartedAt: Number.MAX_VALUE,
        maxEndedAt: Number.MIN_VALUE,
        duration: 0
      };
      uh.uows.map(uow => {
        if (uow.endedAt && !uow.error) {
          stats.succeeded = stats.succeeded + 1;
        }

        if (uow.endedAt && uow.error) {
          stats.failed = stats.failed + 1;
        }

        if (uow.startedAt && !uow.endedAt) {
          stats.inProgress = stats.inProgress + 1;
        }

        if (!uow.startedAt) {
          stats.notStarted = stats.notStarted + 1;
        }

        if (uow.startedAt && uow.startedAt < stats.minStartedAt) {
          stats.minStartedAt = uow.startedAt;
        }

        if (uow.endedAt && uow.endedAt > stats.maxEndedAt) {
          stats.maxEndedAt = uow.endedAt;
        }
      });
      stats.duration = Math.ceil((stats.maxEndedAt - stats.minStartedAt) / 1000);
      // just dump all fields to uh
      Object.assign(uh, stats);

    }));

    // make a static uowsHistory0 to each 
    scripts.map(script => script.uowsHistory0 = (script.uowsHistory || [])[0] || {});

    this.now = new Date();
    const currentTime = this.now.getTime();
    //overdue if late more than 3 minutes
    scripts.map(script => script.overDue = script.uowsHistory0.time && currentTime - script.uowsHistory0.time > script.waitSecondsBetweenRuns * 1000 + 180000);

    this.routineScripts = scripts;

    this.filter();
  }

  filter() {
    this.filteredRoutineScripts = this.routineScripts.filter(s => !s.disabled || this.showDisabled);

    console.log(this.showDisabled);
    console.log(this.routineScripts);
    console.log(this.filteredRoutineScripts)
  }

  async populateDetails(routineScriptId) {
    const scripts = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'routine-script',
      query: {
        _id: { $oid: routineScriptId }
      },
      // projection: {
      //   name: 1,
      //   description: 1,
      //   waitSecondsBetweenRuns: 1,
      //   unitOfWorksGeneratorName: 1,
      //   parallelProcessors: 1,
      //   disabled: 1,
      //   "uowsHistory.time": 1,
      //   "uowsHistory.uows.startedAt": 1,
      //   "uowsHistory.uows.endedAt": 1,
      //   // "uowsHistory.uows.result.body": 1,
      //   "uowsHistory.uows.error.message": 1,
      // },
      limit: 1
    }).toPromise();

    if (this.selectedScript && this.selectedScript._id === scripts[0]._id) {
      Object.assign(this.selectedScript, scripts[0]);
    }
  }

  addNew() {
    this.scriptInEditing = {};
    this.editModal.show();
  }

  edit(script) {
    this.scriptInEditing = {};
    for (let field of this.editingFields) {
      this.scriptInEditing[field] = script[field];
    };
    this.editModal.show();
  }

  async okEdit() {

    if (this.scriptInEditing._id) {
      const script = this.routineScripts.filter(s => s._id === this.scriptInEditing._id)[0];
      const oldScript = {};
      for (let field of this.editingFields) {
        oldScript[field] = script[field];
      };
      await this._api.patch(environment.qmenuApiUrl + "generic?resource=routine-script", [{ old: oldScript, new: this.scriptInEditing }]);
    } else {
      await this._api.post(environment.qmenuApiUrl + 'generic?resource=routine-script', [this.scriptInEditing]).toPromise();
    }
    await this.populate();
    this.editModal.hide();
  }

  async deleteEdit() {
    if (confirm("Are you sure")) {
      await this._api.delete(environment.qmenuApiUrl + 'generic', {
        resource: 'routine-script',
        ids: [this.scriptInEditing._id]
      }).toPromise();
      await this.populate();
      this.editModal.hide();
    }
  }

  cancelEdit() {
    this.editModal.hide();
  }

  printConsole(script) {
    console.log(script);
  }

  async resetUows(script) {
    // we can wipe out all uowsHistory of the script!
    await this._api.patch(environment.qmenuApiUrl + "generic?resource=routine-script", [{ old: { _id: script._id, uowsHistory: [] }, new: { _id: script._id } }]);
    await this.populate();
  }

}
