import { Component, OnInit, OnChanges, SimpleChanges, Input, } from '@angular/core';
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
@Component({
  selector: 'app-gmb-ownership-transfer',
  templateUrl: './gmb-ownership-transfer.component.html',
  styleUrls: ['./gmb-ownership-transfer.component.css']
})
export class GmbOwnershipTransferComponent implements OnInit, OnChanges {

  @Input() transfer: GmbTransfer;
  // because transfer object is part of a gmb task and we need to pass task in for updating
  @Input() task: Task;

  gmbRequesting = false;
  gmbRejecting = false;
  gmbAppealing = false;
  retrievingCode = false;
  verifyingCode = false;
  completing = false;

  now = new Date();

  accounts: any[] = [];

  constructor(private _api: ApiService, private _global: GlobalService) {

    // let's retrieve gmb accounts and gmb biz (to count how many):
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
            accountMap[a.email.split('@')[0]] = a;
          });
          results[0].map(biz => {
            const accountName = new GmbBiz(biz).getAccount();
            if (accountMap[accountName]) {
              accountMap[accountName].bizCount = (accountMap[accountName].bizCount || 0) + 1;
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


  getAccountName(email) {
    return (email || '').split('@')[0];
  }

  getFilteredAccounts() {
    if (this.transfer) {
      return this.accounts.filter(a => a.email !== this.transfer.fromEmail);
    }
    return this.accounts;
  }

  ngOnChanges(changes: SimpleChanges) {
    this.now = new Date();
  }


  /**
   * 
   * @param name = select | request | reject | appeal | retrieve | verify | failed | succeeded
   * @param loadingVariableName 
   * @param timestampVariableName 
   */
  handleUpdate(name, timestampVariableName, loadingVariableName) {

    console.log(name, timestampVariableName, loadingVariableName)
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

          case 'retrieve':
            this.transfer.code = result;
            newBareTask.transfer.code = result;
            break;

          case 'failed':
            this.transfer.result = 'Failed';
            newBareTask.transfer.result = 'Failed';
            break;
          case 'succeeded':
            this.transfer.result = 'Succeeded';
            newBareTask.transfer.result = 'Succeeded';
            break;
          default:
            break;
        }

        // update definition of now
        this.now = new Date();

        console.log(newBareTask);
        // save to database now!
        this._api
          .patch(environment.adminApiUrl + "generic?resource=task", [{ old: oldTask, new: newBareTask }])
          .subscribe(
            result => {
              this._global.publishAlert(AlertType.Success, 'Updated Task');
            },
            error => {
              this._global.publishAlert(AlertType.Danger, 'Error Updating Task :(');
            }
          );
      })
      .catch(error => {
        if (loadingVariableName) {
          this[loadingVariableName] = false;
        }
        this._global.publishAlert(AlertType.Danger, error);
      }
      );
  }


}
