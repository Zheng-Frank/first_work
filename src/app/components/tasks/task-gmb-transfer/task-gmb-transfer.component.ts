import { Component, OnInit, OnChanges, SimpleChanges, Input, Output, EventEmitter } from '@angular/core';
import { GmbTransfer } from '../../../classes/gmb/gmb-transfer';
import { Task } from '../../../classes/tasks/task';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { GlobalService } from '../../../services/global.service';
import { AlertType } from '../../../classes/alert-type';
import { GmbBiz } from '../../../classes/gmb/gmb-biz';
import { Restaurant } from '@qmenu/ui';
import { Log } from '../../../classes/log';

@Component({
  selector: 'app-task-gmb-transfer',
  templateUrl: './task-gmb-transfer.component.html',
  styleUrls: ['./task-gmb-transfer.component.css']
})
export class TaskGmbTransferComponent implements OnInit, OnChanges {

  @Output() ok = new EventEmitter();
  @Output() cancel = new EventEmitter();

  @Input() task: Task;


  showDetails = false;

  transfer: GmbTransfer;
  gmbBiz: GmbBiz;
  restaurant: Restaurant;

  gmbRequesting = false;
  gmbRejecting = false;
  gmbAppealing = false;
  savingCode = false;
  savingAppealId = false;
  verifyingCode = false;
  updatingWebsite = false;
  completing = false;

  now = new Date();

  accounts: any[] = []; // 

  assignees = [];

  taskScheduledAt = new Date();

  comments: string;

  toggleManualAppeal = false;

  dropdownVisible = false;

  constructor(private _api: ApiService, private _global: GlobalService) {
    this.populate();
    // to refresh 'now' every minute
    setInterval(() => {
      this.now = new Date();
    }, 60000);
  }

  ngOnInit() {

  }

  gmbRequest;
  gmbAccount;
  restaurantLogs: Log[] = [];
  newCompetitorsRequests = [];

  async populate() { // let's retrieve gmb accounts and gmb biz (to count how many biz for each account):

    const gmbAccounts = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "gmbAccount",
      projection: {
        email: 1,
        allLocations: 1,
        published: 1,
        type: 1
      },
      limit: 7000
    }).toPromise();


    const accountMap = {};
    gmbAccounts.map(a => {
      accountMap[a.email] = a;
    });

    this.accounts = gmbAccounts.sort((a, b) => a.email.toLowerCase() > b.email.toLowerCase() ? 1 : -1);

    // find the lastest request against this:

    const requests = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbRequest',
      query: {
        date: {
          $gt: { $date: new Date(this.task.createdAt) }
        },
        gmbAccountId: this.task.relatedMap.gmbAccountId,
        gmbBizId: this.task.relatedMap.gmbBizId
      },
      projection: {
        email: 1,
        gmbAccountId: 1,
        gmbBizId: 1,
        date: 1
      },

      limit: 100
    }).toPromise();

    this.newCompetitorsRequests = requests.filter(request => !gmbAccounts.some(account => account.email === request.email));
    this.newCompetitorsRequests.map(r => r.date = new Date(r.date));
    this.newCompetitorsRequests.sort((a, b) => a.date.valueOf() - b.date.valueOf());
  }
  refreshRelated() {
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
    this.restaurantLogs = [];
    ['gmbBiz', 'gmbRequest', 'gmbAccount'].forEach(obj => {
      this[obj] = undefined;
      if (this.task.relatedMap && this.task.relatedMap[obj + 'Id']) {
        this._api.get(environment.qmenuApiUrl + "generic", {
          resource: obj,
          query: {
            _id: { $oid: this.task.relatedMap[obj + 'Id'] }
          },
          limit: 1
        }).subscribe(results => {
          this[obj] = results[0];
          if (obj === 'gmbBiz' && results[0] && results[0].qmenuId) {
            this.refreshLogs();
          }
        });
      }
    });
  }

  refreshLogs() {
    this.restaurantLogs = [];
    this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query: {
        _id: { $oid: this.gmbBiz.qmenuId }
      },
      projection: {
        logs: 1
      },
      limit: 1
    }).subscribe(
      results => {
        if (results[0] && results[0].logs) {
          this.restaurantLogs = results[0].logs.map(log => new Log(log));
          // sort DESC
          this.restaurantLogs = this.restaurantLogs.sort((a, b) => b.time.valueOf() - b.time.valueOf());
        }
      });
  }

  getFilteredAccounts() {
    console.log(this.accounts);
    if (this.transfer) {
      return this.accounts.filter(a => a.type === "Transfer GMB" && a.email !== this.transfer.fromEmail && (a.allLocations || 0) < 80);
    }
    return this.accounts.filter(a => a.type === "Transfer GMB");
  }

  ngOnChanges(changes: SimpleChanges) {
    this.now = new Date();

    if (this.task) {
      this.taskScheduledAt = this.task.scheduledAt;
      this.transfer = this.task.transfer;
      this.comments = this.task.comments;
      this.populateGmbBiz();
      if (this.task) {
        this.refreshRelated();
      }
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
    // let's also request qmenu database's restaurant obj: logs, contacts etc.
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
      const fromGmbAccount = (await this._api.get(environment.qmenuApiUrl + "generic",
        {
          resource: "gmbAccount",
          query: {
            email: this.transfer.fromEmail,
          },
          projection: {
            email: 1,
            password: 1
          },
          limit: 1
        }
      ).toPromise())[0];

      if (!fromGmbAccount) {
        throw 'From account  not found';
      }

      let fromPassword = fromGmbAccount.password;
      if (fromPassword.length > 20) {
        fromPassword = await this._api.post(environment.qmenuApiUrl + 'utils/crypto', { salt: fromGmbAccount.email, phrase: fromPassword }).toPromise();
      }

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

        case 'reject':
          result = await this._api.post(
            environment.autoGmbUrl + 'rejectGmbRequest', {
              email: fromGmbAccount.email,
              password: fromPassword,
              arci: this.transfer.request.arci
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

  getTaskDate() {
    return new Date(this.task.createdAt);
  }

  getInvalidReason() {

    if (!this.transfer.code && this.newCompetitorsRequests.length === 0 && this.now.valueOf() - this.getTaskDate().valueOf() > 30 * 24 * 3600000) {
      return 'No new attackers and task is too old';
    }

    if (!this.transfer.code && this.newCompetitorsRequests.length > 0 && this.now.valueOf() - this.newCompetitorsRequests[this.newCompetitorsRequests.length - 1].date.valueOf() > 30 * 24 * 3600000) {
      return 'Latest attack is more than 30 days and task is too old';
    }

  }


}
