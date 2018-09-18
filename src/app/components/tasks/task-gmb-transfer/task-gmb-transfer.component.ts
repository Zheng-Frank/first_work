import { Component, OnInit, OnChanges, SimpleChanges, Input, Output, EventEmitter } from '@angular/core';
import { GmbAccount } from '../../../classes/gmb/gmb-account';
import { GmbRequest } from '../../../classes/gmb/gmb-request';
import { GmbTransfer } from '../../../classes/gmb/gmb-transfer';
import { Task } from '../../../classes/tasks/task';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { GlobalService } from '../../../services/global.service';
import { AlertType } from '../../../classes/alert-type';
import { zip } from 'rxjs';
import { GmbBiz } from '../../../classes/gmb/gmb-biz';
import { mergeMap } from 'rxjs/operators';
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
  emailSettings = {} as any;

  accounts: any[] = []; // account with bizCount

  taskScheduledAt = new Date();

  comments: string;

  toggleManualAppeal = false;

  constructor(private _api: ApiService, private _global: GlobalService) {

    // let's retrieve gmb accounts and gmb biz (to count how many biz for each account):
    zip(
      this._api.get(environment.adminApiUrl + "generic", {
        resource: "gmbBiz",
        projection: {
          "gmbOwnerships.email": 1,
          "phone": 1
        },
        limit: 5000
      }),
      this._api.get(environment.adminApiUrl + "generic", {
        resource: "gmbAccount",
        projection: {
          email: 1
        },
        limit: 5000
      })
    )
      .subscribe(
        results => {
          const accountMap = {};
          results[1].map(a => {
            accountMap[a.email] = a;
          });
          results[0].map(biz => {
            if (biz.gmbOwnerships && biz.gmbOwnerships.length > 0) {
              const email = biz.gmbOwnerships[biz.gmbOwnerships.length - 1].email;
              if (accountMap[email]) {
                accountMap[email].bizCount = (accountMap[email].bizCount || 0) + 1;
              }
            }
          });

          this.accounts = results[1].sort((a, b) => a.email.toLowerCase() > b.email.toLowerCase() ? 1 : -1);

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

  gmbRequest;
  gmbAccount;
  restaurantLogs: Log[] = [];
  refreshRelated() {
    this.restaurantLogs = [];
    ['gmbBiz', 'gmbRequest', 'gmbAccount'].forEach(obj => {
      this[obj] = undefined;
      if (this.task.relatedMap[obj + 'Id']) {
        this._api.get(environment.adminApiUrl + "generic", {
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
    if (this.transfer) {
      return this.accounts.filter(a => a.email !== this.transfer.fromEmail);
    }
    return this.accounts;
  }

  getLastAccountEmail() {
    if (this.gmbBiz) {
      return this.gmbBiz.gmbOwnerships[this.gmbBiz.gmbOwnerships.length - 1].email;
    } else {
      return '';
    }
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
      this._api.get(environment.adminApiUrl + "generic", {
        resource: 'gmbBiz',
        query: {
          _id: { $oid: this.task.relatedMap['gmbBizId'] }
        },
        limit: 1
      }).subscribe(results => {
        this.gmbBiz = results[0];
        if (this.gmbBiz) {
          this.emailSettings.email = this.gmbBiz.qmenuPop3Email;
          this.emailSettings.host = this.gmbBiz.qmenuPop3Host;
          this.emailSettings.password = this.gmbBiz.qmenuPop3Password;
        }
        this.populateRestaurant();
      });
    }
  }

  populateRestaurant() {
    // let's also request qmenu database's restaurant obj: logs, contacts etc.
    if (this.gmbBiz && this.gmbBiz.qmenuId) {
      this._api.get(environment.qmenuApiUrl + "generic", {
        resource: 'restaurant',
        query: {
          _id: { $oid: this.gmbBiz.qmenuId }
        },
        projection: {
          people: 1
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
  handleUpdate(name, timestampVariableName, loadingVariableName) {

    if (loadingVariableName) {
      this[loadingVariableName] = true;
    }

    // emulating api calls
    let promise = new Promise((resolve, reject) => {
      switch (name) {
        case 'request':
          zip(this._api.get(environment.adminApiUrl + "generic",
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
            }),
            this._api.get(environment.adminApiUrl + "generic",
              {
                resource: "gmbBiz",
                query: {
                  _id: { $oid: this.task.relatedMap['gmbBizId'] }
                },
                projection: {
                  place_id: 1
                },
                limit: 1
              })
          ).pipe(mergeMap(
            results => {
              if (!results[1][0].place_id) {
                throw 'No place_id found for gmb Biz';
              }
              return this._api.post(
                'http://localhost:3000/requestOwnership', {
                  email: results[0][0].email,
                  password: results[0][0].password,
                  place_id: results[1][0].place_id
                }
              );
            }
          )).subscribe(
            result => {
              resolve(result);
            },
            error => {
              reject(error);
            }
          );
          break;
        case 'reject':
          this._api.get(environment.adminApiUrl + "generic",
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
          ).pipe(mergeMap(
            result => this._api.post(
              'http://localhost:3000/rejectGmbRequest', {
                email: result[0].email,
                password: result[0].password,
                arci: this.transfer.request.arci
              }
            )
          )).subscribe(
            result => {
              resolve(result);
            },
            error => {
              reject(error);
            }
          );
          break;

        case 'appeal':
          zip(this._api.get(environment.adminApiUrl + "generic",
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
          ),
            this._api.get(environment.adminApiUrl + "generic",
              {
                resource: "gmbBiz",
                query: {
                  _id: { $oid: this.task.relatedMap['gmbBizId'] }
                },
                projection: {
                  qmenuWebsite: 1
                },
                limit: 1
              })
          ).pipe(mergeMap(
            results => this._api.post(
              'http://localhost:3000/appealGmbRequest', {
                email: results[0][0].email,
                password: results[0][0].password,
                arci: this.transfer.request.arci,
                qmenuWebsite: results[1][0].qmenuWebsite
              }
            )
          )).subscribe(
            result => {
              resolve(result);
            },
            error => {
              reject(error);
            }
          );
          break;

        case 'verify':
          this._api.get(environment.adminApiUrl + "generic",
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
          ).pipe(mergeMap(
            results => this._api.post(
              'http://localhost:3000/verify', {
                email: results[0].email,
                password: results[0].password,
                code: this.transfer.code,
                appealId: this.transfer.appealId
              }
            )
          )).subscribe(
            result => {
              resolve(result);
            },
            error => {
              reject(error);
            }
          );
          break;

        case 'updateWebsite':
          zip(this._api.get(environment.adminApiUrl + "generic",
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
          ),
            this._api.get(environment.adminApiUrl + "generic",
              {
                resource: "gmbBiz",
                query: {
                  _id: { $oid: this.task.relatedMap['gmbBizId'] }
                },
                projection: {
                  qmenuWebsite: 1
                },
                limit: 1
              })
          ).pipe(mergeMap(
            results => this._api.post(
              'http://localhost:3000/updateWebsite', {
                email: results[0][0].email,
                password: results[0][0].password,
                website: results[1][0].qmenuWebsite,
                appealId: this.transfer.appealId
              }
            )
          )).subscribe(
            result => {
              resolve(result);
            },
            error => {
              reject(error);
            }
          );
          break;
        case 'failed':
        case 'canceled':
        case 'succeeded':
          // we need to finish the task also!
          const result = 'CLOSED';
          const resultAt = new Date();
          this._api.patch(environment.adminApiUrl + "generic?resource=task", [{ old: { _id: this.task._id }, new: { _id: this.task._id, result: result, resultAt: { $date: resultAt } } }]).subscribe(
            ok => {
              this.task.result = result;
              this.task.resultAt = resultAt;
              resolve();
            },
            error => reject(error)
          )
          break;
        default:
          resolve();
          break;
      }
    });

    promise
      .then(result => {

        const oldTask = {
          _id: this.task._id,
          transfer: new GmbTransfer(this.transfer)
        } as any;

        const newBareTask = {
          _id: this.task._id,
          transfer: new GmbTransfer(this.transfer)
        } as any;


        if (loadingVariableName) {
          this[loadingVariableName] = false;
        }

        if (timestampVariableName) {
          this.transfer[timestampVariableName] = new Date();
          newBareTask.transfer[timestampVariableName] = { $date: new Date() };
        }

        switch (name) {
          case 'select':
            // because selected toEmail's already in toEmail, we actually need to delete it
            delete oldTask.transfer.toEmail;
            newBareTask.transfer.toEmail = this.transfer.toEmail;
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
            break;
          default:
            break;
        }

        // update definition of now
        this.now = new Date();

        // save to database now!
        this.saveTask(oldTask, newBareTask);
      })
      .catch(error => {
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
      );
  }

  retrieveEmailCode(event) {
    if (event.email === this.transfer.toEmail) {
      this.transfer.code = event.code;
    }
  }

  plusDay(i) {
    const scheduledAt = new Date(Date.parse(this.taskScheduledAt as any));
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
      .patch(environment.adminApiUrl + "generic?resource=task", [{ old: oldTask, new: newTask }])
      .subscribe(
        result => {
          this._global.publishAlert(AlertType.Success, 'Updated Task');
          // let's mutate task, we need to be careful about transfer
          Object.keys(newTask).map(k => {
            if (k === 'transfer') {
              Object.keys(newTask.transfer).map(kt => this.task.transfer[kt] = newTask.transfer[kt]['$date'] || newTask.transfer[kt]);
            } else {
              this.task[k] = newTask[k]['$date'] || newTask[k];
            }
          });

        },
        error => {
          this._global.publishAlert(AlertType.Danger, 'Error Updating Task :(');
        }
      );
  }

  saveEmailSettings(event) {
    // get hashed password
    if (event.email && event.password && event.password.length < 20) {
      this._api.post(environment.autoGmbUrl + 'encrypt', event).pipe(mergeMap(encryptedPassword => {
        const oldBiz = {
          _id: this.gmbBiz._id
        };

        const newBiz = {
          _id: this.gmbBiz._id,
          qmenuPop3Email: event.email,
          qmenuPop3Host: event.host,
          qmenuPop3Password: encryptedPassword
        };

        return this._api
          .patch(environment.adminApiUrl + "generic?resource=gmbBiz", [{ old: oldBiz, new: newBiz }])
      })).subscribe(
        result => {
          this.emailSettings.email = event.email;
          this.emailSettings.host = event.host;
          this.emailSettings.password = event.password;
          this._global.publishAlert(AlertType.Success, 'Saved email');
        },
        error => {
          this._global.publishAlert(AlertType.Danger, 'Error saving email');
        }
      );
    }
  }

  clickOk() {
    if (this.comments !== this.task.comments) {
      this.saveTask({ _id: this.task._id }, { _id: this.task._id, comments: this.comments });
    }
    this.ok.emit();
  }

  login(email) {
    this._api.get(environment.adminApiUrl + "generic", {
      resource: "gmbAccount",
      query: {
        email: email
      },
      limit: 1
    })
      .pipe(mergeMap(gmbAccounts =>
        this._api.post('http://localhost:3000/retrieveGmbRequests', { email: gmbAccounts[0].email, password: gmbAccounts[0].password, stayAfterScan: true })
      ))
      .subscribe(
        ok => this._global.publishAlert(AlertType.Success, 'Success'),
        error => this._global.publishAlert(AlertType.Danger, 'Failed to login')
      );
  }

  isTaskExpired() {
    const days30 = 30 * 24 * 3600 * 1000;
    if(this.task.transfer.appealedAt) {
      return this.now.valueOf() - this.task.transfer.appealedAt.valueOf() >= days30;
    }

    return false;
  }


}
