import { Component, OnInit, ViewChild } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from '../../../../environments/environment';
import { GlobalService } from '../../../services/global.service';
import { User } from '../../../classes/user';
import { AlertType } from '../../../classes/alert-type';
@Component({
  selector: 'app-routine-dashboard',
  templateUrl: './routine-dashboard.component.html',
  styleUrls: ['./routine-dashboard.component.css']
})

export class RoutineDashboardComponent implements OnInit {
  routines: any[] = [];
  routineInstances: any[] = [];

  fullDisplayMode = false;

  stats = {
    checkedInUsers: []
  };
  user: User;
  isUserAdmin = false;
  showUsersOnline = false;
  timekeepingId;

  constructor(private _api: ApiService, private _global: GlobalService) {
    this.user = this._global.user;
  }

  async ngOnInit() {
    await this.populateRoutines();
    this.timekeepingId = this.routines.filter(routine => routine.name === 'Timekeeping')[0]._id;
    await this.populateRoutineInstances();
    await this.populateStats();
  }

  async populateRoutines() {
    const routines = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: "routine",
      query: {},
      projection: {},
      limit: 1000000
    }).toPromise();

    this.timekeepingId = routines.filter(r => r.name === 'Timekeeping')[0]._id;
    this.routines = routines.filter(r => r.assignees.indexOf(this.user.username) > -1).sort((r1, r2) => new Date(r1.createdAt).valueOf() - new Date(r2.createdAt).valueOf());
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

  isUserCheckedIn() {
    const checkInInstances = this.routineInstances.filter(inst => inst.routineId === this.timekeepingId && !inst.results.some(res => res.name === 'Check-Out'));
    return checkInInstances.length > 0;
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
      await this.postNewInstance(routineInstance, 'Check-In Successful');
      await this.populateStats();
    } catch (err) {
      this._global.publishAlert(
        AlertType.Danger,
        'Check-In Failed'
      );
    }
  }

  async checkOut() {
    const [latestEntry] = this.routineInstances.filter(inst => inst.routineId === this.timekeepingId && !inst.results.some(res => res.name === 'Check-Out'));
    const rightNow = new Date();
    const duration = rightNow.valueOf() - new Date(latestEntry.results[0].result).valueOf(); // shift duration in ms
    const durationInHours = duration / 3.6e+6
    latestEntry.results.push(
      {
        name: "Check-Out",
        result: rightNow
      },
      {
        name: "Duration",
        result: durationInHours.toFixed(2)
      });
    try {
      await this._api
        .patch(environment.qmenuApiUrl + 'generic?resource=routine-instance', [{
          old: { _id: latestEntry._id },
          new: latestEntry
        }]).toPromise();
      this._global.publishAlert(
        AlertType.Success,
        'Check-Out Succeeded'
      );
      this.routineInstances[this.routineInstances.findIndex(inst => inst._id === this.timekeepingId)] = latestEntry;
      this.routineInstances = JSON.parse(JSON.stringify(this.routineInstances));
      await this.populateStats();

    } catch (err) {
      this._global.publishAlert(
        AlertType.Danger,
        'Check-Out Failed'
      );
    }
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

  hasTimekeeping() {
    return this.routines.some(r => r.name === "Timekeeping");
  }
}
