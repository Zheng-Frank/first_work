import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { environment } from 'src/environments/environment';
import { GlobalService } from 'src/app/services/global.service';
import { AlertType } from 'src/app/classes/alert-type';
@Component({
  selector: 'app-event-dashboard',
  templateUrl: './event-dashboard.component.html',
  styleUrls: ['./event-dashboard.component.css']
})
export class EventDashboardComponent implements OnInit {

  listeners = [];
  apiRequesting = false;

  currentAction;
  eventJsonString = JSON.stringify(
    {
      queueUrl: `https://sqs.us-east-1.amazonaws.com/449043523134/events-v3`,
      event: { name: "test", params: { a: 1 }, scheduledAt: new Date().valueOf() }
    }
  );
  now = new Date();
  constructor(private _api: ApiService, private _global: GlobalService) {
    this.reload();
  }

  ngOnInit() {
  }

  async emitEvent() {
    this.apiRequesting = true;
    try {
      const event = JSON.parse(this.eventJsonString);
      if (!event.queueUrl || !event.event || !event.event.name) {
        throw "Bad payload";
      }
      const result = await this._api.post(environment.appApiUrl + 'events', [event]).toPromise();
      this._global.publishAlert(AlertType.Success, "Success");
    } catch (error) {
      this._global.publishAlert(AlertType.Danger, JSON.stringify(error));
    }
    this.apiRequesting = false;
    this.now = new Date();
  }

  async reload() {
    this.listeners = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "event-listener",
      projection: {

      },
      limit: 100000000
    }).toPromise();

    this.listeners.map(listener => {
      listener.createdAt = listener.createdAt || parseInt(listener._id.substring(0, 8), 16) * 1000;
    });

    // fill up executions
    const executions = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: "execution",
      projection: {
        listenerId: 1,
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
        const subscriberString = JSON.stringify(subscriber);

        const succeededExecutions = [];
        const failedExecutions = [];
        executions.map(exe => {
          const exeSubscriberString = JSON.stringify(exe.subscriber);
          if (exe.listenerId === listener._id && subscriberString === exeSubscriberString) {
            if (exe.error) {
              failedExecutions.push(exe);
            } else {
              succeededExecutions.push(exe);
            }
          }
        });

        subscriber.succeededExecutions = succeededExecutions;
        subscriber.failedExecutions = failedExecutions;
        subscriber.lastRunTime = (succeededExecutions.slice(-1)[0] || {}).startedAt;
      });


    });

    this.now = new Date();
  }

  consoleOut(executions) {
    console.log(executions);
    // console.log('last 20:');
    // console.log(executions.slice(-20).map(exe => (exe.params || {}).name));
    alert("Check console for executions");
  }

}
