import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { environment } from 'src/environments/environment';
import { GlobalService } from 'src/app/services/global.service';
import { AlertType } from 'src/app/classes/alert-type';
import { TaskGmbAppealSuspendedComponent } from '../../tasks/task-gmb-appeal-suspended/task-gmb-appeal-suspended.component';
@Component({
  selector: 'app-event-dashboard',
  templateUrl: './event-dashboard.component.html',
  styleUrls: ['./event-dashboard.component.css']
})
export class EventDashboardComponent implements OnInit {

  listeners = [];
  apiRequesting = false;

  currentAction;
  eventJsonString = JSON.stringify({ name: 'fake event' });

  constructor(private _api: ApiService, private _global: GlobalService) {
    this.reload();
  }

  ngOnInit() {
  }

  async emitEvent() {
    this.apiRequesting = true;
    try {
      const event = JSON.parse(this.eventJsonString);
      if (!event.name) {
        throw "Name is required"
      }
      const result = await this._api.post(environment.appApiUrl + 'events', [event]).toPromise();
      this._global.publishAlert(AlertType.Success, "Success");
    } catch (error) {
      this._global.publishAlert(AlertType.Danger, JSON.stringify(error));
    }
    this.apiRequesting = false;
  }

  async reload() {
    this.listeners = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "event-listener",
      projection: {

      },
      limit: 100000000
    }).toPromise();

    this.listeners.map(listener => {
      listener.subscribers.map(subscriber => {
        subscriber.succeededLogs = [];
        subscriber.failedLogs = [];
      });
      listener.createdAt = listener.createdAt || parseInt(listener._id.substring(0, 8), 16) * 1000;
    });

    console.log(this.listeners);

    // fill up logs
    const subscriberLogs = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: "subscriber-log",
      projection: {
        "listener._id": 1,
        subscriber: 1,
        startedAt: 1,
        endedAt: 1,
        result: 1,
        params: 1,
        error: 1
      },
      // sort: {
      //   startedAt: -1
      // }
    }, 3000);
    this.listeners.map(listener => {
      listener.subscribers.map(subscriber => {
        subscriberLogs.map(log => {
          if (log.listener._id === listener._id && log.subscriber.type === subscriber.type && log.subscriber.value === subscriber.value) {
            if (log.error) {
              subscriber.failedLogs.push(log);
            } else {
              subscriber.succeededLogs.push(log);
            }
          }
        });
      });
    });

    console.log(subscriberLogs);
  }

  consoleOut(logs) {
    console.log(logs);
    alert("Check console for logs");
  }

}
