import { Component, OnInit, ViewChild } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from '../../../../environments/environment';
import { GlobalService } from '../../../services/global.service';
import { User } from '../../../classes/user';
import { TaskService } from '../../../services/task.service';
import { AlertType } from '../../../classes/alert-type';
import { FormEvent, Helper } from '@qmenu/ui';
import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
@Component({
  selector: 'app-routine-dashboard',
  templateUrl: './routine-dashboard.component.html',
  styleUrls: ['./routine-dashboard.component.css']
})

export class RoutineDashboardComponent implements OnInit {

  @ViewChild('routineEditingModal') routineEditingModal: ModalComponent;

  routines: any[] = [];
  routineInstances: any[] = [];

  allRoutines: any[] = [];
  allInstances: any[] = [];

  fullDisplayMode = false;

  user: User;
  isUserAdmin = false;
  isUserCheckedIn = false;
  timekeepingId;

  // routing editing related variables
  routineInEditing = {} as any;
  routineFieldDescriptors = [];
  metric = {} as any
  metricValues = '';

  constructor(private _api: ApiService, private _global: GlobalService, private _task: TaskService) {
    this.user = this._global.user;
    this.isUserAdmin = (this.user.roles || []).includes('ADMIN');
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
        inputType: "text"
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
    this.findUserCheckinStatus();
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

  filterRoutinesAndInstances() {
    // filter or make shallow copies and sort by name
    if (this.fullDisplayMode) {
      this.routines = this.allRoutines.slice().sort((a, b) => a.name > b.name ? 1 : -1);
      this.routineInstances = this.allInstances.slice();
    } else {
      this.routines = this.allRoutines.filter(r => !r.disabled && r.assignees.indexOf(this.user.username) > -1).sort((a, b) => a.name > b.name ? 1 : -1);
      this.routineInstances = this.allInstances.filter(ri => ri.assignee === this.user.username);
    }
  }

  hasInstances(routine) {
    return (this.allInstances || []).some(inst => inst.routineId === routine._id)
  }

  toggleFullDisplayMode() {
    this.fullDisplayMode = !this.fullDisplayMode;
    this.filterRoutinesAndInstances();
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

  findUserCheckinStatus() {
    const [timekeepingRoutine] = this.allRoutines.filter(r => r.name === 'Timekeeping');
    const userTimekeepingHistory = this.routineInstances
      .filter(inst => inst.routineId === timekeepingRoutine._id)
      .sort((a, b) => new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf());
    if (!userTimekeepingHistory.length) {
      this.isUserCheckedIn = false;
      return;
    }
    const latestEntry = userTimekeepingHistory[0];
    if (latestEntry.results.length === 1) { // one entry means a check-in entry exists without a corresponding check-out
      this.isUserCheckedIn = true;
      this.timekeepingId = latestEntry._id;
    } else {
      this.isUserCheckedIn = false;
    }
  }

  async checkIn() {
    const [timekeepingRoutine] = this.allRoutines.filter(r => r.name === 'Timekeeping');
    const routineInstance = {
      routineId: timekeepingRoutine._id,
      assignee: this.user.username,
      results: [{
        name: "Check-In",
        result: new Date()
      }]
    }
    try {
      this.timekeepingId = await this.postNewInstance(routineInstance, 'Check-In Successful')
      this.isUserCheckedIn = true;
    } catch (err) {
      this._global.publishAlert(
        AlertType.Danger,
        'Check-In Failed'
      );
    }
  }

  async checkOut() {
    const latestEntry = this.allInstances.filter(inst => inst._id === this.timekeepingId)[0];
    const rightNow = new Date();
    const duration = rightNow.valueOf() - new Date(latestEntry.results[0].result).valueOf(); // shift duration in ms
    const durationInHours = duration / 3.6e+6

    latestEntry.results.push({
      name: "Check-Out",
      result: rightNow
    }, 
    {
      name: "Duration",
      result: durationInHours.toFixed(2)
    })
    try {
      await this._api
      .patch(environment.qmenuApiUrl + 'generic?resource=routine-instance', [{
        old: {
          _id: this.timekeepingId
        },
        new: latestEntry
      }]).toPromise();
      this._global.publishAlert(
        AlertType.Success,
        'Check-Out Succeeded'
      );
      // 
      this.allInstances[this.allInstances.findIndex(inst => inst._id === this.timekeepingId)] = latestEntry;
      this.isUserCheckedIn = false;
      this.timekeepingId = null;
      this.filterRoutinesAndInstances();
    } catch (err) {
      this._global.publishAlert(
        AlertType.Danger,
        'Check-Out Failed'
      );
    }
    
  }
}
