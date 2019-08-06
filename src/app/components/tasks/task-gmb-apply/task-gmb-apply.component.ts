import { Component, OnInit, OnChanges, SimpleChanges, Input, Output, EventEmitter } from '@angular/core';
import { GmbTransfer } from '../../../classes/gmb/gmb-transfer';
import { Task } from '../../../classes/tasks/task';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { GlobalService } from '../../../services/global.service';
import { AlertType } from '../../../classes/alert-type';
import { zip } from 'rxjs';
import { GmbBiz } from '../../../classes/gmb/gmb-biz';
import { Restaurant } from '@qmenu/ui';

@Component({
  selector: 'app-task-gmb-apply',
  templateUrl: './task-gmb-apply.component.html',
  styleUrls: ['./task-gmb-apply.component.css']
})
export class TaskGmbApplyComponent implements OnInit, OnChanges {

  @Output() ok = new EventEmitter();
  @Output() cancel = new EventEmitter();

  @Input() task: Task;


  transfer: GmbTransfer;
  gmbBiz: GmbBiz;
  restaurant: Restaurant;

  gmbRequesting = false;
  gmbRejecting = false;
  gmbAppealing = false;
  savingCode = false;
  verifyingCode = false;
  updatingWebsite = false;
  completing = false;

  now = new Date();

  accounts: any[] = []; // account with bizCount

  assignees = [];

  taskScheduledAt = new Date();

  comments: string;

  toggleManualAppeal = false;

  dropdownVisible = false;

  withinDays = 30;
  requestLimitPerDay = 5;
  requestLimitPerMonth = 20;

  constructor(private _api: ApiService, private _global: GlobalService) {

    const within1Day = new Date();
    within1Day.setDate(within1Day.getDate() - 1);

    // let's retrieve gmb accounts and gmb biz (to count how many biz for each account):
    zip(
      this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "gmbAccount",
        projection: {
          email: 1,
          type: 1,
          allLocations: 1
        },
        limit: 7000
      }),
      this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "task",
        query: {
          "transfer.toEmail": {
            "$exists": true
          }
        },
        projection: {
          'transfer.toEmail': 1,
          'transfer.requestedAt': 1
        },
        limit: 7000
      })

    )
      .subscribe(
      results => {
        const accountMap = {};
        results[0].map(a => {
          accountMap[a.email] = a;
        });



        //console.log('accountMap', accountMap);

        this.accounts = results[0].sort((a, b) => a.email.toLowerCase() > b.email.toLowerCase() ? 1 : -1);
                
        console.log('Apply GMB Per Day', this.accounts.reduce((sum, a) => sum + (a.requestCountPerDay || 0), 0));
        console.log(' this.accounts', this.accounts);
      },
      error => {
        this._global.publishAlert(AlertType.Danger, error);
      }
      );

    // to refresh 'now' every minute
    setInterval(() => {
      this.now = new Date();
    }, 60000);
  }

  ngOnInit() {
  }

  getFilteredAccounts() {
    if (this.transfer) {
      return this.accounts.filter(a => a.email !== this.transfer.fromEmail && (a.allLocations || 0) < 80);
    }
    return this.accounts
  }

  ngOnChanges(changes: SimpleChanges) {
    this.now = new Date();
    if (this.task) {
      this.taskScheduledAt = this.task.scheduledAt;
      this.transfer = this.task.transfer;
      this.comments = this.task.comments;
      this.populateGmbBiz();

      this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'user',
        projection: {
          username: 1,
          roles: 1
        },
        limit: 5000
      }).subscribe(users => {
        this.assignees = users.filter(u => u.roles.some(r => this.task.roles.indexOf(r) >= 0)).sort((r1, r2) => r1.username > r2.username ? 1 : -1);
      });
    }
  }

  populateGmbBiz() {
    // query gmbBiz
    if (this.task.relatedMap['gmbBizId']) {
      this._api.get(environment.qmenuApiUrl + "generic", {
        resource: 'gmbBiz',
        query: {
          _id: { $oid: this.task.relatedMap['gmbBizId'] }
        },
        limit: 1
      }).subscribe(results => {
        this.gmbBiz = results[0];
        this.populateRestaurant();
      });
    }
  }

  populateRestaurant() {
    if (this.gmbBiz) {
      this._api.get(environment.qmenuApiUrl + "generic", {
        resource: 'restaurant',
        query: {
          $or: [{
            _id: { $oid: this.gmbBiz.qmenuId }
          }, {
            "googleListing.cid": this.gmbBiz.cid
          }],
          disabled: { $ne: true }
        },
        projection: {
          people: 1,
          channels: 1,
          offsetToEST: 1,
          web: 1
        },
        limit: 1
      }).subscribe(results => {
        this.restaurant = results[0];
      });
    }
  }


  /**
 * 
 * @param name = select | request | reject | appeal | retrieve | verify | failed | succeeded | canceled | reopen |
 * @param loadingVariableName 
 * @param timestampVariableName 
 */
  async handleUpdate(name, timestampVariableName, loadingVariableName) {

    if (loadingVariableName) {
      this[loadingVariableName] = true;
    }

    try {
      let toGmbAccount, toPassword;
      if (this.transfer.toEmail) {
        toGmbAccount = (await this._api.get(environment.qmenuApiUrl + "generic",
          {
            resource: "gmbAccount",
            query: {
              email: this.transfer.toEmail,
            },
            projection: {
              email: 1,
              password: 1
            },
            limit: 1
          }
        ).toPromise())[0];

        if (!toGmbAccount) {
          throw 'To Account  not found';
        }

        toPassword = toGmbAccount.password;
        if (toPassword.length > 20) {
          toPassword = await this._api.post(environment.qmenuApiUrl + 'utils/crypto', { salt: toGmbAccount.email, phrase: toPassword }).toPromise();
        }
      }
      

      if (!this.gmbBiz || !this.gmbBiz.place_id) {
        throw 'No place_id found';
      }

      let result = '';
      switch (name) {
        case 'request':

          result = await this._api.post(
            environment.autoGmbUrl + 'requestOwnership', {
              email: toGmbAccount.email,
              password: toPassword,
              place_id: this.gmbBiz.place_id
            }
          ).toPromise();
          break;

        case 'appeal':

          result = await this._api.post(
            environment.autoGmbUrl + 'appealGmbRequest', {
              email: toGmbAccount.email,
              password: toPassword,
              arci: this.transfer.request.arci,
              place_id: this.gmbBiz.place_id
            }
          ).toPromise();
          break;

        case 'verify':
          result = await this._api.post(
            environment.autoGmbUrl + 'verify', {
              email: toGmbAccount.email,
              password: toPassword,
              code: this.transfer.code,
              appealId: this.transfer.appealId || this.task.transfer.appealId
            }
          ).toPromise();
          break;
        case 'failed':
        case 'canceled':
        case 'succeeded':
          // we need to finish the task also!
          const taskResult = 'CLOSED';
          const resultAt = new Date();
          result = await this._api.patch(environment.qmenuApiUrl + "generic?resource=task",
            [{ old: { _id: this.task._id }, new: { _id: this.task._id, result: taskResult, resultAt: { $date: resultAt } } }]).toPromise();
          break;
        default:
          break;
      }


      const oldTask = {
        _id: this.task._id,
        result: this.task.result,
        resultAt: this.task.resultAt,
        transfer: new GmbTransfer(this.transfer)
      } as any;

      const newBareTask = {
        _id: this.task._id,
        result: this.task.result,
        resultAt: this.task.resultAt,
        transfer: new GmbTransfer(this.transfer)
      } as any;

      if (timestampVariableName) {
        this.transfer[timestampVariableName] = new Date();
        newBareTask.transfer[timestampVariableName] = { $date: new Date() };
      }

      switch (name) {
        case 'select':
          // because selected toEmail's already in toEmail, we actually need to delete it
          delete oldTask.transfer.toEmail;
          newBareTask.transfer = {
            fromEmail: this.transfer.fromEmail,
            toEmail: this.transfer.toEmail
          };
          // delete all keys
          const protectedFields = ['fromEmail', 'toEmail'];
          Object.keys(this.transfer).map(k => { if (protectedFields.indexOf(k) < 0) { delete this.transfer[k]; } });
          break;

        case 'request':
          this.transfer.request = result;
          newBareTask.transfer.request = result;
          break;

        case 'appeal':
          this.transfer.appealId = result['appealId'];
          newBareTask.transfer.appealId = result['appealId'];
          break;
        case 'selectVerificationMethod':
          if (this.transfer.verificationMethod) {
            delete oldTask.transfer.verificationMethod;
          } else {
            // assign some random value so after comparison, the field will be deleted in MongoDb
            oldTask.transfer.verificationMethod = 'Email';
          }
          newBareTask.transfer.verificationMethod = this.transfer.verificationMethod;
          break;
        case 'saveCode':
          // because input code is bound to transfer already, we actually need to delete it so
          delete oldTask.transfer.code;
          newBareTask.transfer.code = this.transfer.code;
          break;
        case 'saveAppealId':
          // because input appealId is bound to transfer already, we actually need to delete it so
          delete oldTask.transfer.appealId;
          newBareTask.transfer.appealId = this.transfer.appealId;
          break;
        case 'retrieve':
          this.transfer.code = result;
          newBareTask.transfer.code = result;
          break;
        case 'failed':
        case 'canceled':
        case 'succeeded':
          this.transfer.result = name;
          newBareTask.transfer.result = name;
          break;
        case 'reopen':
          this.transfer.result = undefined;
          this.transfer.completedAt = undefined;
          newBareTask.transfer.result = undefined;
          newBareTask.transfer.completedAt = undefined;
          newBareTask.result = undefined;
          newBareTask.resultAt = undefined;
          break;
        case 'assign':
          // because selected assignee's already in there, we actually need to delete it
          delete oldTask.assignee;
          newBareTask.assignee = this.task.assignee;
          break;
        default:
          break;
      }

      // update definition of now
      this.now = new Date();

      // save to database now!
      this.saveTask(oldTask, newBareTask);
      if (loadingVariableName) {
        this[loadingVariableName] = false;
      }
    } catch (error) {
      console.log(error)
      if (loadingVariableName) {
        this[loadingVariableName] = false;
      }
      let errorMessage = 'Error';
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && error.error) {
        errorMessage = error.error;
      }

      this._global.publishAlert(AlertType.Danger, errorMessage);
    }

  }


  retrieveEmailCode(event) {
    if (event.email === this.transfer.toEmail) {
      this.transfer.code = event.code;
    }
  }

  plusDay(i) {
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + i);
    this.taskScheduledAt = scheduledAt;

    this.scheduledAtUpdated(scheduledAt);
  }

  scheduledAtUpdated(event) {
    // update the task scheduledAt
    const oldTask = {
      _id: this.task._id
    }

    const newTask = {
      _id: this.task._id,
      scheduledAt: { $date: this.taskScheduledAt }
    };
    this.saveTask(oldTask, newTask);
  }

  saveTask(oldTask, newTask) {

    this._api
      .patch(environment.qmenuApiUrl + "generic?resource=task", [{ old: oldTask, new: newTask }])
      .subscribe(
      result => {
        this._global.publishAlert(AlertType.Success, 'Updated Task');
        // let's mutate task, we need to be careful about transfer
        Object.keys(newTask).map(k => {
          if (k === 'transfer') {
            Object.keys(newTask.transfer).map(kt => this.task.transfer[kt] = (newTask.transfer[kt] || {})['$date'] || newTask.transfer[kt]);
          } else {
            this.task[k] = (newTask[k] || {})['$date'] || newTask[k];
          }
        });

      },
      error => {
        this._global.publishAlert(AlertType.Danger, 'Error Updating Task :(');
      }
      );
  }

  clickOk() {
    if (this.comments !== this.task.comments) {
      this.saveTask({ _id: this.task._id }, { _id: this.task._id, comments: this.comments });
    }
    this.ok.emit();
  }

  isTaskExpired() {
    const days60 = 30 * 24 * 3600 * 1000;
    if (this.task.transfer.appealedAt) {
      return this.now.valueOf() - this.task.transfer.appealedAt.valueOf() >= days60;
    }

    return false;
  }
}
