import { Component, OnInit, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { ApiService } from 'src/app/services/api.service';
import { GlobalService } from 'src/app/services/global.service';
import { AlertType } from 'src/app/classes/alert-type';
import { environment } from 'src/environments/environment';
import { Task } from 'src/app/classes/tasks/task';

@Component({
  selector: 'app-restaurant-tasks',
  templateUrl: './restaurant-tasks.component.html',
  styleUrls: ['./restaurant-tasks.component.css']
})
export class RestaurantTasksComponent implements OnInit, OnChanges {
  @ViewChild('taskDetailsModal') taskDetailsModal;
  @Input() restaurant: Restaurant;

  tasks: Task[] = [];
  selectedTask;
  constructor(private _api: ApiService, private _global: GlobalService) { }

  refreshing = false;
  ngOnInit() {
  }

  async createGmbRequestTask() {
    if (!confirm("Create a new GMB Request task?")) {
      return;
    }
    this.refreshing = true;
    try {
      await this._api.post(environment.qmenuApiUrl + 'generic?resource=task', [{
        name: 'GMB Request',
        assignee: this._global.user.username,
        roles: [
          "GMB",
          "ADMIN"
        ],
        relatedMap: {
          restaurantId: this.restaurant._id,
          cid: this.restaurant.googleListing.cid,
          place_id: this.restaurant.googleListing.place_id,
          restaurantName: this.restaurant.name
        },
        conditionAtCreation: "sales from tasks tab",
        request: {},
        processorVersion: "v5"
      }]).toPromise();
      this._global.publishAlert(AlertType.Success, "Success! Please check your list!");

    } catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, "Failed to create a GMB task!");
    }
    this.refreshing = false;
    await this.reloadTasks();
  }

  async showDetails(task) {
    this.selectedTask = task;
    this.taskDetailsModal.show();
    const tasks = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "task",
      query: { _id: { $oid: task._id } },
      limit: 1
    }).toPromise();
    this.selectedTask = tasks[0];
  }

  async ngOnChanges(changes: SimpleChanges) {
    console.log('changes')
    if (this.restaurant) {
      console.log('changes2')
      // refresh tasks for the restaurant
      await this.reloadTasks();
    }
  }

  async reloadTasks() {
    console.log('called')
    this.tasks = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "task",
      query: {
        $or: [
          {
            "relatedMap.restaurantId": this.restaurant._id
          },
          {
            "relatedMap.qmenuId": this.restaurant._id
          }
        ]
      },
      limit: 10000000
    }).toPromise();
    this.tasks.sort((a, b) => a.createdAt > b.createdAt ? 1 : -1);
  }


  async refreshGmbTasks() {
    this.refreshing = true;

    const openTasks = this.tasks.filter(t => t.name === 'GMB Request' && !t.result);
    try {
      for (let task of openTasks) {
        await this._api.post(environment.appApiUrl + "gmb/generic", {
          name: "process-one-task",
          payload: {
            taskId: task._id,
            forceRefresh: true
          }
        }).toPromise();
      }

      this._global.publishAlert(AlertType.Success, 'Scanned Successfully');
      await this.reloadTasks();
    } catch (error) {
      console.log(error);
      const result = error.error || error.message || error;
      this._global.publishAlert(AlertType.Danger, JSON.stringify(result));
    }
    this.refreshing = false;
  }

}
