import { EventEmitter } from '@angular/core';
import { AlertType } from 'src/app/classes/alert-type';
import { GlobalService } from './../../../services/global.service';
import { ApiService } from './../../../services/api.service';
import { environment } from 'src/environments/environment';
import { Input, Output } from '@angular/core';
import { Component, OnInit } from '@angular/core';
import { Task } from 'src/app/classes/tasks/task';

@Component({
  selector: 'app-gmb-task-detail',
  templateUrl: './gmb-task-detail.component.html',
  styleUrls: ['./gmb-task-detail.component.css']
})
export class GmbTaskDetailComponent implements OnInit {

  @Input()
  qmenuDomains = new Set();
  @Input()
  publishedCids = new Set();
  @Input()
  assignees = [];
  @Output()
  refreshTask = new EventEmitter();
  @Output()
  assignComplete = new EventEmitter();
  @Output()
  showDetailsEvent = new EventEmitter();

  //help display postcardID
  postcardIds = new Map();
  restaurant;
  modalTask;
  relatedTasks;
  preferredVerificationOption;
  verifications = [];
  verificationOptions = [];
  taskScheduledAt;
  showNotifier = false;
  isPublished = false;
  showCompleteNotificationHistory = false;
  comments; // ng model
  taskResult;  // ng model
  pin; // ng model
  verifyingOption;
  // Send Google PIN message.
  sendingGooglePinMessage = false;
  showRTLogs = false;
  showTaskJson = false; // control to show json string
  now = new Date();
  timer;
  
  constructor(private _api: ApiService, private _global: GlobalService) { }

  async ngOnInit() {
    await this.populatePostcardId();
    this.timer = setInterval(_ => this.now = new Date(), 60000);
  }
  
  ngOnDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async populatePostcardId() {
    try {
      const gmbAccounts = await this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "gmbAccount",
        limit: 100000,
        projection: {
          "email": 1,
          "postcardId": 1
        }
      }).toPromise();
      this.postcardIds = new Map(gmbAccounts.map(acct => [acct.email, acct.postcardId]));
    }catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, error.message);
    }
  }

  async init(taskId) {
    const tasks = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "task",
      query: {
          _id: { $oid: taskId }
      }
    }).toPromise();
    this.modalTask = new Task(tasks[0]);
    const theTask = new Task(tasks[0]);
    this.preferredVerificationOption = undefined;
    this.isPublished = this.publishedCids.has(theTask.relatedMap.cid);
    this.taskScheduledAt = theTask.scheduledAt || new Date();
    let verificationOptions;
    if (theTask.request) {
      verificationOptions = (((theTask.request.voHistory || [])[0] || { options: [] }).options || []).filter(vo => vo.verificationMethod !== 'SMS').map(vo => ({
        ...vo,
        verification: ((theTask.request.verificationHistory || [])[0] || { verifications: [] }).verifications.filter(verification => verification.state === 'PENDING' && verification.method === vo.verificationMethod)[0]
      }));

      this.verificationOptions = verificationOptions || [];
      this.verifications = ((theTask.request.verificationHistory || [])[0] || {}).verifications || [];
      // add faClass
      const faMap = {
        EMAIL: 'at',
        ADDRESS: 'address-card',
        PHONE_CALL: 'phone'
      };
      this.verificationOptions.map(vo => {
        vo.faClass = faMap[vo.verificationMethod] || 'question';
      });
      this.verifications.map(v => {
        v.faClass = faMap[v.method] || 'question';
      });

      // preferred:
      const emailOption = this.verificationOptions.filter(vo => vo.verificationMethod === 'EMAIL' && !this.isNonQmenuEmail(vo))[0];
      const phoneOption = this.verificationOptions.filter(vo => vo.verificationMethod === 'PHONE_CALL')[0];
      const addressOption = this.verificationOptions.filter(vo => vo.verificationMethod === 'ADDRESS')[0];
      const pendingAddressVerification = this.verifications.filter(v => v.method === 'ADDRESS' && v.state === 'PENDING')[0];

      if (emailOption) {
        this.preferredVerificationOption = emailOption;
      } else if (!pendingAddressVerification && phoneOption && !this.isPublished) {
        this.preferredVerificationOption = phoneOption;
      } else if (addressOption) {
        this.preferredVerificationOption = addressOption;
      }
    }

    this.restaurant = (
      await this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "restaurant",
        query: { _id: { $oid: theTask.relatedMap.restaurantId } },
        limit: 1,
        projection: {
          "name": 1,
          "googleAddress.formatted_address": 1,
          "googleAddress.timezone": 1,
          "googleListing.gmbOwner": 1,
          "googleListing.phone": 1,
          score: 1,
          people: 1,
          logs: 1,
          channels: 1 // for sending google-pin emails or sms
        }
      }).toPromise()
    )[0];
    (this.restaurant.people || []).map(person => {
      person.channels = (person.channels || []).filter(c => c.type !== 'Email')
    });

    const relatedTasks = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "task",
      query: { "relatedMap.cid": theTask.relatedMap.cid, result: null },
      limit: 100,
      projection: {
        assignee: 1,
        name: 1,
        "request.email": 1,
        "transfer.toEmail": 1,
        createdAt: 1
      }
    }).toPromise();

    this.relatedTasks = relatedTasks.filter(t => t._id !== theTask._id);
  }

  join(values) {
    return (values || []).join(', ')
  }

  async assign(task, assignee) {
    await this.update(task, 'assignee', assignee === 'NON-CLAIMED' ? undefined : assignee);
    this.assignComplete.emit();
  }

  triggerSendGooglePinMessage() {
    this.sendingGooglePinMessage = !this.sendingGooglePinMessage;
  }

  async showDetails(taskId) {
    this.showDetailsEvent.emit(taskId);
  }

  async toggleDecline() {
    const currentlyDeclined = this.modalTask.request.ownerDeclined;
    const message = currentlyDeclined ?
      'The owner has agreed to work with qMenu. Are you sure?'
      : 'The owner has declined to work with qMenu. This will assign the task to another person to handle. Are you sure?';

    if (confirm(message)) {
      await this.addComments(currentlyDeclined ? 'owner agreed to work with qMenu' : 'owner declined to work with qMenu');
      await this.update(this.modalTask, 'request.ownerDeclined', !currentlyDeclined);
      await this.update(this.modalTask, 'scheduledAt', new Date());
      // also update restaurant
      await this._api.patch(environment.qmenuApiUrl + "generic?resource=restaurant", [
        {
          old: {
            _id: { $oid: this.modalTask.relatedMap.restaurantId },
            web: {}
          },
          new: {
            _id: { $oid: this.modalTask.relatedMap.restaurantId },
            web: {
              agreeToCorporate: currentlyDeclined ? 'Yes' : 'No'
            }
          },
        }
      ]).toPromise();
    }
  }

  logSendingGooglePinMessage(event) {
    const notification_status_new = {
      user: this._global.user.username,
      time: new Date(),
      channels: event.channels,
      comments: event.comments
    }
    if (this.modalTask.notification_status) {
      this.modalTask.notification_status.unshift(notification_status_new);
    }
    else {
      this.modalTask.notification_status = [notification_status_new];
    }
    this.update(this.modalTask, "notification_status", this.modalTask.notification_status);
    this.triggerSendGooglePinMessage();
  }

  async closeTask() {
    if (this.taskResult) {
      if (confirm('Are you sure?')) {
        await this.update(this.modalTask, "result", this.taskResult);
        await this.update(this.modalTask, "resultAt", new Date());
        const fullComments = `${new Date().getMonth() + 1}/${new Date().getDate()} ${this._global.user.username}: closed`;

        await this.update(this.modalTask, 'comments', this.modalTask.comments ? `${this.modalTask.comments}\n${fullComments}` : fullComments);
      }
    } else {
      alert('please select a result');
    }
  }

  async completePin(pinHistory) {
    if (confirm('Do not try too many times for this function. Too many failed tries will cause the verification disappear. Are you sure to use this PIN?')) {
      try {
        await this._api.post(environment.appApiUrl + 'gmb/generic', {
          name: "complete-pin",
          payload: {
            taskId: this.modalTask._id,
            email: this.modalTask.request.email,
            locationName: this.modalTask.request.locationName,
            pin: pinHistory.pin
          }
        }).toPromise();

        this._global.publishAlert(AlertType.Success, 'Verified Successfully');

      } catch (error) {
        console.log(error);
        const result = error.error || error.message || error;
        this._global.publishAlert(AlertType.Danger, JSON.stringify(result));
      }

      await this.addComments(`tried PIN`);
      this.refreshTask.emit(this.modalTask._id);
    }
  }

  async resetPin(pinHistory) {
    if (confirm('Are you sure to reset this PIN? This will not erase the PIN history but scanning task will not see it')) {
      try {
        await this._api.post(environment.appApiUrl + 'gmb/generic', {
          name: "reset-pin",
          payload: {
            taskId: this.modalTask._id,
            username: this._global.user.username
          }
        }).toPromise();

        this._global.publishAlert(AlertType.Success, 'PIN reset Successfully, refreshing task');

      } catch (error) {
        console.log(error);
        const result = error.error || error.message || error;
        this._global.publishAlert(AlertType.Danger, JSON.stringify(result));
      }

      await this.addComments(`PIN reset`);
      await this.hardRefresh(this.modalTask);
    }
  }

  async hardRefresh(task) {
    try {
      await this.hardRefreshV5Task(task._id);
      this._global.publishAlert(AlertType.Success, 'Refreshed Successfully');

    } catch (error) {
      console.log(error);
      const result = error.error || error.message || error;
      this._global.publishAlert(AlertType.Danger, JSON.stringify(result));
    }

    this.refreshTask.emit(task._id);
  }

  async hardRefreshV5Task(taskId) {
    await this._api.post(environment.appApiUrl + "gmb/generic", {
      name: "process-one-task",
      payload: {
        taskId: taskId,
        forceRefresh: true
      }
    }).toPromise();
  }

  async trigger(task, vo) {
    if (confirm('Trigger too many times could exhaust existing verification options. Are you sure?')) {
      this.verifyingOption = vo;
      try {

        await this._api.post(environment.appApiUrl + "gmb/generic", {
          name: "verify",
          payload: {
            taskId: task._id,
            email: task.request.email,
            locationName: task.request.locationName,
            verificationOption: vo
          }
        }).toPromise();

        this._global.publishAlert(AlertType.Success, 'triggered successfully, refreshing task');

      } catch (error) {
        console.log(error);
        const result = error.error || error.message || error;
        this._global.publishAlert(AlertType.Danger, JSON.stringify(result));
      }
      this.verifyingOption = undefined;
      await this.addComments(`tried verification`);
      await this.hardRefresh(task);
    }
  }

  async savePin() {
    if (!this.pin) {
      return alert('Bad PIN to save');
    }
    try {
      await this._api.post(environment.appApiUrl + 'gmb/generic', {
        name: "save-pin",
        payload: {
          taskId: this.modalTask._id,
          pin: this.pin,
          username: this._global.user.username
        }
      }).toPromise();
    } catch (error) {
      console.log(error);
      alert('ERROR SAVING PIN');
    }
    this.pin = '';
    this.refreshTask.emit(this.modalTask._id);
  }

  async addComments(comments) {
    if (comments) {
      const fullComments = `${new Date().getMonth() + 1}/${new Date().getDate()} ${this._global.user.username}: ${comments}`;
      await this.update(this.modalTask, 'comments', this.modalTask.comments ? `${this.modalTask.comments}\n${fullComments}` : fullComments);
    }
    this.comments = '';
  }

  triggerCompleteNotificationHistory() {
    this.showCompleteNotificationHistory = !this.showCompleteNotificationHistory;
  }

  isNonQmenuEmail(verificationOption) {
    return verificationOption.verificationMethod === 'EMAIL' && verificationOption.emailData && !this.qmenuDomains.has(verificationOption.emailData.domainName);
  }

  plusDay(i) {
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + i);
    this.taskScheduledAt = scheduledAt;
    this.scheduledAtUpdated(scheduledAt);
  }

  scheduledAtUpdated(event) {
    this.update(this.modalTask, 'scheduledAt', this.taskScheduledAt);
    this.addComments(`rescheduled`);

  }

  async update(task, field, value) {
    try {
      // convert a.b.c ==> {a: {b: {c: xxx}}}
      const oldTask: any = { _id: task._id };
      const paths = field.split('.');
      let obj = oldTask;
      let key = paths.shift();
      while (paths.length > 0) {
        const newObj = {};
        obj[key] = newObj;
        obj = newObj;
        key = paths.shift();
      };

      let newTask;
      if (value === undefined) {
        newTask = JSON.parse(JSON.stringify(oldTask));
        obj[key] = 'random';
      } else {
        obj[key] = value;
        newTask = JSON.parse(JSON.stringify(oldTask));
        delete obj[key];
      }
      await this._api.patch(environment.qmenuApiUrl + "generic?resource=task", [{ old: oldTask, new: newTask }]);
      // refresh single row.
      this.refreshTask.emit(task._id);
    } catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, 'Error updating');
    }
  }

}
