import { Component, OnInit, ViewChild } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from '../../../../environments/environment';
import { GlobalService } from '../../../services/global.service';
import { User } from '../../../classes/user';
import { AlertType } from '../../../classes/alert-type';
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

  fullDisplayMode = false;

  stats = {
    checkedInUsers: []
  };
  user: User;
  isUserAdmin = false;
  isUserAssignedTimekeepingRoutine = false;
  isUserCheckedIn = false;
  showUsersOnline = false;
  timekeepingId;

  constructor(private _api: ApiService, private _global: GlobalService) {
    this.user = this._global.user;
  }

  async ngOnInit() {
    await this.populateRoutines();
    await this.populateRoutineInstances();
    await this.populateStats();
    this.findUserCheckinStatus();
  }

  async populateRoutines() {
    const routines = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: "routine",
      query: {
        assignees: this.user.username
      },
      projection: {}
    }, 2000);
    const [timekeepingRoutine] = routines.filter(r => r.name === 'Timekeeping');
    if (timekeepingRoutine) {
      this.isUserAssignedTimekeepingRoutine = true;
    }
    this.routines = routines.sort((r1, r2) => new Date(r1.createdAt).valueOf() - new Date(r2.createdAt).valueOf());
  }

  async populateRoutineInstances() {
    const routineInstances = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: "routine-instance",
      query: {
        assignee: this.user.username
      },
      projection: {},
      limit: 100000,
      sort: { _id: -1 }
    }).toPromise();
    this.routineInstances = routineInstances.filter(r => !r.disabled).sort((a, b) => a.name > b.name ? 1 : -1);
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
      this.routineInstances = [instance, ...this.routineInstances];
      return _id;
    } catch (err) {
      this._global.publishAlert(
        AlertType.Danger,
        'Error Submitting Report'
      );
    }
  }

  findUserCheckinStatus() {
    return this.stats.checkedInUsers.includes(this.user.username);
  }

  async checkIn() {
    const [timekeepingRoutine] = this.routines.filter(r => r.name === 'Timekeeping');
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
    const latestEntry = this.routineInstances.filter(inst => inst._id === this.timekeepingId)[0];
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
          old: { _id: this.timekeepingId },
          new: latestEntry
        }]).toPromise();
      this._global.publishAlert(
        AlertType.Success,
        'Check-Out Succeeded'
      );
      // 
      this.routineInstances[this.routineInstances.findIndex(inst => inst._id === this.timekeepingId)] = latestEntry;
      this.routineInstances = JSON.parse(JSON.stringify(this.routineInstances));
      this.isUserCheckedIn = false;
      this.timekeepingId = null;
    } catch (err) {
      this._global.publishAlert(
        AlertType.Danger,
        'Check-Out Failed'
      );
    }
  }

  async populateStats() {
    // begin populating list of checked-in users
    const [timekeepingRoutine] = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: "routine",
      query: { name: "Timekeeping" },
      projection: { _id: 1 },
    }, 1);

    const timekeepingInstances = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: "routine-instance",
      query: { routineId: timekeepingRoutine._id, },
      projection: {},
    }, 5000);
    this.stats.checkedInUsers = timekeepingInstances.filter(inst => inst.results.length === 1).map(inst => inst.assignee).sort((a, b) => a.localeCompare(b));
    // finish populating list of checked-in users
  }
}
