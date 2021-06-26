import { AlertType } from './../../../classes/alert-type';
import { environment } from 'src/environments/environment';
import { GlobalService } from './../../../services/global.service';
import { ApiService } from 'src/app/services/api.service';
import { Component, OnInit, ViewChild } from '@angular/core';
const EMPTY_INDICATOR = "#>!$!%(@^";
@Component({
  selector: 'app-api-logs-dashboard',
  templateUrl: './api-logs-dashboard.component.html',
  styleUrls: ['./api-logs-dashboard.component.css']
})
export class ApiLogsDashboardComponent implements OnInit {
  @ViewChild('logDetailsModal') logDetailsModal;
  users = [];
  user = '';
  timeTypes = ['Last 24 hours', 'Last 48 hours', 'Last 7 days', 'Custom range','All'];
  timeType = 'Last 24 hours';
  apiLogsRows = [];
  recordNumber = 15;
  columnDescriptors = [
    {
      label: 'ID'
    },
    {
      label: 'Username'
    },
    {
      label: 'Updated At'
    },
    {
      label: 'Resource'
    },
    {
      label: 'Actions'
    },

  ];
  courseLogs = [];
  selectedLog;
  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
    this.loadLogs();
  }
  async showDetails(log) {
    this.selectedLog = log;
    this.logDetailsModal.show();
    const logs = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "apilog",
      query: { _id: { $oid: log.id } },
      limit: 1
    }).toPromise();
    this.selectedLog = logs[0];
  }
 
  async loadLogs() {
    // get all users
    this.users = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'user',
      query: {
        disabled: {
          $ne: true
        },
        username: {
          $ne: ''
        }
      },
      projection: {
        _id: 1,
        username: 1,
      },
      limit: 1000
    }, 500);
    this.users = this.users.map(u => {
      return u.username
    });
    this.user = this.users[0];
    this.courseLogs = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: "apilog",
      query: {
      },
      projection: {
        _id: 1,
        "token.user.username": 1,
        time: 1,
        "queryStringParameters.resource": 1,
        "body.old": 1,
        "body.new": 1
      },
      limit: this.recordNumber
    }, 15);
    this.courseLogs.sort((a, b) => a.time > b.time ? -1 : 1);

    // sort out the results;
    this.apiLogsRows = [];
    for (let log of this.courseLogs) {
      const actions = [];
      this.loadActions(log.body[0].old, log.body[0].new, "", actions);
      this.apiLogsRows.push({
        id: log._id,
        name: log.token.user.username,
        time: log.time,
        resource: log.queryStringParameters.resource,
        actions: actions,
      });
    }
  }
  loadActions(oldO, newO, prefix, actions) {
    // if old is empty, new is not, then it's an adding action
    if (oldO == EMPTY_INDICATOR && newO != EMPTY_INDICATOR) {
      actions.push({
        type: "Add",
        target: prefix,
        old: "Nothing",
        new: JSON.stringify(newO)
      });
      return;
    }

    // if old is not empty, new is, then it's an deleting action
    if (oldO != EMPTY_INDICATOR && newO == EMPTY_INDICATOR) {
      actions.push({
        type: "Remove",
        target: prefix,
        old: JSON.stringify(oldO),
        new: "Nothing"
      });
      return;
    }

    // Check that they have the same type, if not, it's an update
    if (typeof oldO !== typeof newO) {
      actions.push({
        type: "Update",
        target: prefix,
        old: JSON.stringify(oldO),
        new: JSON.stringify(newO)
      });
      return;
    }

    // 1. If type is value: Compare them directly, it's an update(unless empty objects in array)
    if (typeof oldO !== 'object') {
      if (oldO !== newO) {
        actions.push({
          type: "Update",
          target: prefix,
          old: JSON.stringify(oldO),
          new: JSON.stringify(newO)
        });
      }
    }
    // 2. If type is array:  
    else if (Array.isArray(oldO)) {
      // for elements both array has
      for (let i = 0; i < Math.min(oldO.length, newO.length); i++) {
        this.loadActions(oldO[i], newO[i], `${prefix}[${i}]`, actions);
      }

      // if one is longer than another, fill the empty spots with empty indicators
      if (oldO.length > newO.length) {
        for (let i = newO.length; i < oldO.length; i++) {
          this.loadActions(oldO[i], EMPTY_INDICATOR, `${prefix}[${i}]`, actions);
        }
      } else if (oldO.length < newO.length) {
        for (let i = oldO.length; i < newO.length; i++) {
          this.loadActions(EMPTY_INDICATOR, newO[i], `${prefix}[${i}]`, actions);
        }
      }
    }
    // 3. If type is object:
    else {
      let prop;
      // iterate through the property of the oldO
      for (prop in oldO) {
        // if newObject doesn't own that property, set EMPTY_INDICATOR
        if (!newO.hasOwnProperty(prop)) {
          this.loadActions(oldO[prop], EMPTY_INDICATOR, `${prefix}.${prop}`, actions);
        } else {  // must be an update if both has the property
          this.loadActions(oldO[prop], newO[prop], `${prefix}.${prop}`, actions);
        }
      }
      // if there are unique properties in new object, set EMPTY_INDICATOR to old object
      for (prop in newO) {
        if (!oldO.hasOwnProperty(prop)) {
          this.loadActions(EMPTY_INDICATOR, newO[prop], `${prefix}.${prop}`, actions);
        }
      }
    }
  }

  async filterByUserAndTime() {
    let query = {
    } as any;
    //  timeTypes = ['Last 24 hours', 'Last 48 hours', 'Last 7 days', 'Custom range'];
    if (this.timeType !== 'Custom range') {
      if(this.timeType === 'All'){
        query = {
          "token.user.username": this.user
        }
      }else if (this.timeType === 'Last 24 hours') {
        query = {
          "token.user.username": this.user,
          $and: [
            {
              time: {
                $gte: new Date(new Date().valueOf() - 24 * 3600 * 1000).valueOf()
              }
            },
            {
              time: {
                $lte: new Date().valueOf()
              }
            }
          ]
        }
      } else if (this.timeType === 'Last 48 hours') {
        query = {
          "token.user.username": this.user,
          $and: [
            {
              time: {
                $gte: new Date(new Date().valueOf() - 48 * 3600 * 1000).valueOf()
              }
            },
            {
              time: {
                $lte: new Date().valueOf()
              }
            }
          ]
        }
      } else if (this.timeType === 'Last 7 days') {
        query = {
          "token.user.username": this.user,
          $and: [
            {
              time: {
                $gte: new Date(new Date().valueOf() - 7 * 24 * 3600 * 1000).valueOf()
              }
            },
            {
              time: {
                $lte: new Date().valueOf()
              }
            }
          ]
        }
      }
      console.log(JSON.stringify(query));
      this.courseLogs = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
        resource: "apilog",
        query: query,
        projection: {
          _id: 1,
          "token.user.username": 1,
          time: 1,
          "queryStringParameters.resource": 1,
          "body.old": 1,
          "body.new": 1
        }
      }, 15);
      this.courseLogs.sort((a, b) => a.time > b.time ? -1 : 1);

      // sort out the results;
      this.apiLogsRows = [];
      for (let log of this.courseLogs) {
        const actions = [];
        this.loadActions(log.body[0].old, log.body[0].new, "", actions);
        this.apiLogsRows.push({
          id: log._id,
          name: log.token.user.username,
          time: log.time,
          resource: log.queryStringParameters.resource,
          actions: actions,
        });
      }
    }
  }

  cancelDoSearchLogsByCustomTime() {
    this.user = this.users[0];
    this.timeType = 'Last 24 hours';
    this.filterByUserAndTime();
  }

  async doSearchLogsByCustomTime(from, to) {
    if (from == undefined) {
      return alert("please input a correct from time date format!");
    }
    if (to == undefined) {
      return alert("please input a correct to time date format !");
    }
    if (new Date(from).valueOf() - new Date(to).valueOf() > 0) {
      return this._global.publishAlert(AlertType.Danger, "please input a correct date format,from time is less than or equals to time!");
    }
    console.log(this.user);
    const query = {
      "token.user.username": this.user,
      $and: [{
        time: {
          $gte: new Date(from + "T00:00:00.000Z").valueOf()
        } // less than and greater than
      }, {
        time: {
          $lte: new Date(to +"T00:00:00.000Z").valueOf()
        }
      }
      ]
    } as any;
    console.log(JSON.stringify(query));
    this.courseLogs = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: "apilog",
      query: query,
      projection: {
        _id: 1,
        "token.user.username": 1,
        time: 1,
        "queryStringParameters.resource": 1,
        "body.old": 1,
        "body.new": 1
      }
    }, 15);
    this.courseLogs.sort((a, b) => a.time > b.time ? -1 : 1);

    // sort out the results;
    this.apiLogsRows = [];
    for (let log of this.courseLogs) {
      const actions = [];
      this.loadActions(log.body[0].old, log.body[0].new, "", actions);
      this.apiLogsRows.push({
        id: log._id,
        name: log.token.user.username,
        time: log.time,
        resource: log.queryStringParameters.resource,
        actions: actions,
      });
    }
  }



}
