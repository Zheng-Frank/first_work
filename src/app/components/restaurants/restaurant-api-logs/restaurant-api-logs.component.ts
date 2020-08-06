import { Component, OnInit, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { ApiService } from 'src/app/services/api.service';
import { GlobalService } from 'src/app/services/global.service';
import { AlertType } from 'src/app/classes/alert-type';
import { environment } from 'src/environments/environment';
import { Task } from 'src/app/classes/tasks/task';
import { empty } from 'rxjs';

const EMPTY_INDICATOR = "#>!$!%(@^";

@Component({
  selector: 'app-restaurant-api-logs',
  templateUrl: './restaurant-api-logs.component.html',
  styleUrls: ['./restaurant-api-logs.component.css']
})
export class RestaurantApiLogsComponent implements OnInit, OnChanges {
  @ViewChild('logDetailsModal') logDetailsModal;
  @Input() restaurant: Restaurant;

  courseLogs = [];
  logs = [];
  selectedLog;

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
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

  async ngOnChanges(changes: SimpleChanges) {
    console.log('changes')
    if (this.restaurant) {
      console.log('changes2')
      // refresh logs for the restaurant
      await this.reloadLogs();
    }
  }

  async reloadLogs() {
    console.log('called')
    this.courseLogs = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "apilog",
      query: {
        "body.0.old._id": this.restaurant._id
      },
      projection: {
        _id: 1,
        "token.user.username": 1,
        time: 1,
        "queryStringParameters.resource": 1,
        "body.old": 1,
        "body.new": 1
      },
      sort: {
        time: -1
      },
      limit: 100
    }).toPromise();
    this.courseLogs.sort((a, b) => a.time > b.time ? -1 : 1);

    // sort out the results;
    this.logs = [];
    for(let log of this.courseLogs) {
      const actions = [];
      this.loadActions(log.body[0].old, log.body[0].new, "", actions);
// console.log(actions);
      this.logs.push({
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
// console.log("it's added");
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
// console.log("it's removed");
      actions.push({
        type: "Remove",
        target: prefix,
        old:  JSON.stringify(oldO),
        new: "Nothing"
      });
      return;
    }

    // Check that they have the same type, if not, it's an update
    if (typeof oldO !== typeof newO) {
      // console.log("Different type, it's updated");
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
// console.log("They are different values, it's updated");
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
// console.log("They are arrays");
      // for elements both array has
      for (let i = 0; i < Math.min(oldO.length, newO.length); i++) {
// console.log("Looking at element number " + i);
        this.loadActions(oldO[i], newO[i], `${prefix}[${i}]`, actions);
      }

      // if one is longer than another, fill the empty spots with empty indicators
      if (oldO.length > newO.length) {
        for (let i = newO.length; i < oldO.length; i++) {
// console.log("Looking at element number " + i);
          this.loadActions(oldO[i], EMPTY_INDICATOR, `${prefix}[${i}]`, actions);
        }
      } else if (oldO.length < newO.length) {
        for (let i = oldO.length; i < newO.length; i++) {
// console.log("Looking at element number " + i);
          this.loadActions(EMPTY_INDICATOR, newO[i], `${prefix}[${i}]`, actions);
        }
      }
    }
    // 3. If type is object:
    else {
// console.log("It's an object");
      let prop;
      // iterate through the property of the oldO
      for (prop in oldO) {
// console.log("Looking at property " + prop);
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
}
