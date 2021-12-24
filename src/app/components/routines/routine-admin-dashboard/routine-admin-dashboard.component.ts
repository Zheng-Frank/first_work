import { Component, OnInit, ViewChild } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from '../../../../environments/environment';
import { GlobalService } from '../../../services/global.service';
import { User } from '../../../classes/user';
import { TaskService } from '../../../services/task.service';
import { AlertType } from '../../../classes/alert-type';
import { FormEvent, Helper } from '@qmenu/ui';
import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';

enum routineViewTypes {
  Routine = 'View by Routine',
  Agent = 'View by Agent'
}

@Component({
  selector: 'app-routine-admin-dashboard',
  templateUrl: './routine-admin-dashboard.component.html',
  styleUrls: ['./routine-admin-dashboard.component.css']
})

export class RoutineAdminDashboardComponent implements OnInit {

  @ViewChild('routineEditingModal') routineEditingModal: ModalComponent;

  routines: any[] = [];
  routineInstances: any[] = [];

  allRoutines: any[] = [];
  allInstances: any[] = [];
  selectedRoutine;
  selectedInstanceList = [];
  stats = {
    checkedInUsers: []
  };
  user: User;

  isUserCheckedIn = false;
  timekeepingId;

  // routing editing related variables
  routineInEditing = {} as any;
  routineFieldDescriptors = [];
  metric = {} as any;
  metricValues = '';
  // two logs' filter types, one is by routine, the other is by agent
  agents = [];
  routineNames = [];
  selectedRoutineName = 'All';
  selectedAgent = 'All';
  routineViewBys = [routineViewTypes.Routine, routineViewTypes.Agent];
  routineViewBy = routineViewTypes.Routine;
  routinesOfAgents = [];
  constructor(private _api: ApiService, private _global: GlobalService, private _task: TaskService) {
    this.user = this._global.user;
  }

  async ngOnInit() {
    // need enabled users to populate possible assingees
    const enabledUsers = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: "user",
      query: { disabled: { $ne: true } },
      projection: {
        "username": 1,
        "roles": 1
      },
      limit: 1000000
    }).toPromise();
    enabledUsers.sort((a, b) => a.username.toLowerCase().localeCompare(b.username.toLowerCase()));

    // describes what's needed for q-form-builder
    this.routineFieldDescriptors = [
      {
        field: "name",
        label: "Name",
        required: true,
        placeholder: 'Enter name of the routine',
        inputType: "text"
      },
      {
        field: "description",
        label: "Description",
        required: false,
        placeholder: 'Enter description',
        inputType: "textarea"
      },
      {
        field: "assignees",
        label: "Assignees",
        required: false,
        inputType: "multi-select",
        items: enabledUsers.map(user => ({
          object: user.username,
          text: user.username,
          selected: false
        }))
      },
      {
        field: "supervisors",
        label: "Supervisors",
        required: false,
        inputType: "multi-select",
        items: enabledUsers.map(user => ({
          object: user.username,
          text: user.username,
          selected: false
        }))
      },
      {
        field: "startDate", //
        label: "Start Date",
        required: true,
        inputType: "date"
      },
      {
        field: "recurrence", //
        label: "Recurrence (milliseconds)",
        required: false,
        inputType: "number"
      },
      // ... metrics is created inside tempalte (see HTML markups)
    ];

    // retrieve ALL data. in future, we should only retrieve what are needed
    await this.populateRoutines();
    await this.populateRoutineInstances();
    this.filterRoutinesAndInstances();
    this.populateAgents();
    this.getRoutineNames();
    this.filterRoutineLogs();
    await this.populateStats();
    this.pupulateRoutineOfAgent();
  }
  // routine list view by agent 
  pupulateRoutineOfAgent() {
    let agents = JSON.parse(JSON.stringify(this.agents));
    agents.shift();// remove 'All'
    (agents || []).forEach(agent => {
      let routinesOfAgent = {
        agentName: agent,
        numTask: 0,
        tasksList: []
      }
      // count numTask
      this.routines.forEach(routine => {
        if ((routine.assignees || []).includes(agent)) {
          routinesOfAgent.numTask++;
        }
      });
      // populate routine instances which agent has completed.
      let myRoutines = this.routines.filter(routine => (routine.assignees || []).includes(agent));
      myRoutines.forEach(routine => {
        let myRoutineInstances = this.routineInstances.filter(routineInstance => routineInstance.routineId === routine._id && routineInstance.assignee === agent);
        let taskCompleted = routine.name + " (" + myRoutineInstances.length + ")";
        routinesOfAgent.tasksList.push(taskCompleted);
      });
      this.routinesOfAgents.push(routinesOfAgent);
    });
  }

  get routineViewTypes() {
    return routineViewTypes;
  }

  async populateStats() {
    // begin populating list of checked-in user
    const timekeepingInstances = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "routine-instance",
      query: {
        routineId: this.timekeepingId,
        "results.name": { $ne: "Check-Out" }
      },
      projection: {
        assignee: 1
      },
      limit: 5000
    }).toPromise();

    this.stats.checkedInUsers = timekeepingInstances.map(inst => inst.assignee).sort((a, b) => a.localeCompare(b));
    // finish populating list of checked-in users
  }
  addMetric() {
    this.routineInEditing.metrics = this.routineInEditing.metrics || [];
    this.routineInEditing.metrics.push({
      name: this.metric.name,
      type: this.metric.type,
      // convert comma separated string into values (possible make it correct type)
      values: (this.metricValues || '').split(',').map(t => t.trim()).filter(t => t.length > 0).map(t => this.metric.type === 'number' ? +t : t)
    });
    this.metric = {};
    this.metricValues = '';
  }

  removeMetric(m) {
    this.routineInEditing.metrics.splice(this.routineInEditing.metrics.indexOf(m), 1);
  }

  async submitRoutine(formEvent: FormEvent) {
    const routine = formEvent.object;
    try {
      if (routine._id) {
        // updating old
        const index = this.allRoutines.findIndex(r => r._id === routine._id);
        const oldRoutine = this.allRoutines[index];
        routine.version = (routine.version || 0) + 1;
        await this.patchDiff(routine, oldRoutine);
        // directly replace without doing DB refresh
        this.allRoutines[index] = routine;
        this._global.publishAlert(AlertType.Success, "Successfuly updated");
      } else {
        // creating new
        const [newRoutineId] = await this._api.post(environment.qmenuApiUrl + 'generic?resource=routine', [routine]).toPromise();

        // skip refresh by inserting this directly but we need to add _id and createdAt
        routine._id = newRoutineId;
        routine.createdAt = new Date();
        this.allRoutines.push(routine);
      }
      // acknowledge it's done and no error
      formEvent.acknowledge(null);
      this.routineEditingModal.hide();
      this.filterRoutinesAndInstances();
    } catch (error) {
      formEvent.acknowledge('API error');
    }
  }

  async removeRoutine(formEvent: FormEvent) {
    const routine = formEvent.object;
    if (this.hasInstances(routine)) {
      formEvent.acknowledge('Routines with instance history cannot be deleted');
    } else {
      await this._api.delete(
        environment.qmenuApiUrl + "generic",
        {
          resource: 'routine',
          ids: [routine._id]
        }
      ).toPromise();
      this.routineEditingModal.hide();
      formEvent.acknowledge(null);

      // directly mremove it without refresh from DB
      this.allRoutines.splice(this.allRoutines.findIndex(r => r._id === routine._id), 1);
      this.filterRoutinesAndInstances();
    }
  }

  async populateRoutines() {
    const routines = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: "routine",
      query: {},
      projection: {}
    }, 2000);
    this.timekeepingId = routines.filter(r => r.name === 'Timekeeping')[0]._id;
    this.allRoutines = routines.sort((r1, r2) => new Date(r1.createdAt).valueOf() - new Date(r2.createdAt).valueOf());
  }

  async populateRoutineInstances() {
    // in future, we should only need to load relevant ones!
    const routineInstances = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: "routine-instance",
      query: {},
      projection: {},
      limit: 100000,
      sort: { _id: -1 }
    }).toPromise();
    this.allInstances = routineInstances;
  }

  // need agent filter type to filter logs
  populateAgents() {
    this.allInstances.forEach(instance => {
      if (this.agents.indexOf(instance.assignee) === -1 && instance.assignee) {
        this.agents.push(instance.assignee);
      }
    });
    this.agents.sort((a1, a2) => a1.localeCompare(a2));
    this.agents.unshift('All');
    this.selectedAgent = this.agents[0];
  }

  filterRoutinesAndInstances() {
    this.routines = this.allRoutines.slice().sort((a, b) => a.name > b.name ? 1 : -1);
    this.routineInstances = this.allInstances.slice();
    // routine instances of some agents may change
    this.pupulateRoutineOfAgent();
  }

  hasInstances(routine) {
    return (this.allInstances || []).some(inst => inst.routineId === routine._id)
  }

  async patchDiff(newRoutine, oldRoutine) {
    if (Helper.areObjectsEqual(newRoutine, oldRoutine)) {
      this._global.publishAlert(
        AlertType.Info,
        'Not changed'
      );
    } else {
      // lazy way of patching
      await this._api
        .patch(environment.qmenuApiUrl + 'generic?resource=routine', [{
          old: {
            _id: newRoutine._id
          },
          new: newRoutine
        }]).toPromise();
    }
  }

  clickNew() {
    const newRoutine =
    {
      "createdAt": new Date(),
      "name": "",
      "description": "",
      "assignees": [],
      "version": 1,
      "recurrence": 86400000,
      "disabled": false,
      "metrics": []
    };
    this.routineInEditing = newRoutine;
    this.routineEditingModal.show();
  }

  edit(routine) {
    // edit a copy of the routine
    this.routineInEditing = JSON.parse(JSON.stringify(routine));
    this.routineEditingModal.show();
  }

  async postNewInstance(instance, successMessage?) {
    try {
      const [_id] = await this._api.post(environment.qmenuApiUrl + 'generic?resource=routine-instance', [instance]).toPromise();
      this._global.publishAlert(
        AlertType.Success,
        successMessage || 'Report Saved Successfully'
      );

      // skip refresh and directly add the instance to list, but we need to insert _id and createdAt
      instance._id = _id;
      instance.createdAt = new Date();
      this.allInstances.unshift(instance);
      this.filterRoutinesAndInstances();
      return _id;
    } catch (err) {
      this._global.publishAlert(
        AlertType.Danger,
        'Error Submitting Report'
      );
    }
  }

  filterRoutineLogs() {
    this.onSelectRoutine();
    this.onSelectAgent();
  }

  onSelectRoutine() {
    if (this.selectedRoutineName === 'All') {
      this.selectedRoutine = this.routines;
      this.selectedInstanceList = this.allInstances;
    } else {
      this.selectedRoutine = this.routines.filter(r => r.name === this.selectedRoutineName);
      this.selectedInstanceList = this.allInstances.filter(inst => inst.routineId === this.selectedRoutine[0]._id);
    }

  }

  onSelectAgent() {
    if (this.selectedAgent !== 'All') {
      this.selectedInstanceList = this.selectedInstanceList.filter(inst => inst.assignee === this.selectedAgent);
    }
  }

  getRoutineNames() {
    this.routineNames = this.routines.map(r => r.name);
    this.routineNames.unshift('All');
    this.selectedRoutineName = this.routineNames[1];
  }

}
