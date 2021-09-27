import { Component, OnInit, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { ApiService } from 'src/app/services/api.service';
import { GlobalService } from 'src/app/services/global.service';
import { AlertType } from 'src/app/classes/alert-type';
import { environment } from 'src/environments/environment';
import { Task } from 'src/app/classes/tasks/task';
import { GmbTaskDetailComponent } from '../../gmbs2/gmb-task-detail/gmb-task-detail.component';
import { ModalComponent } from "@qmenu/ui/bundles/qmenu-ui.umd";

@Component({
  selector: 'app-restaurant-tasks',
  templateUrl: './restaurant-tasks.component.html',
  styleUrls: ['./restaurant-tasks.component.css']
})
export class RestaurantTasksComponent implements OnInit, OnChanges {
  @ViewChild('taskDetailModal') taskDetailModal: ModalComponent;
  @ViewChild('taskDetail') taskDetail: GmbTaskDetailComponent;
  @Input() restaurant: Restaurant;

  tasks: Task[] = [];
  constructor(private _api: ApiService, private _global: GlobalService) {}

  refreshing = false;
  qmenuDomains = new Set();
  publishedCids = new Set();
  ngOnInit() {
  }

  private async populateQMDomains() {
    this.qmenuDomains = await this._global.getCachedDomains();
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

  async handleAssignComplete() {
    await this.reloadTasks();
  }

  async handleRefreshSingleTask(taskId) {
    await this.reloadTasks();
    await this.showDetails(taskId);
  }

  async showDetails(taskId) {
    if (this.taskDetail.modalTask && this.taskDetail.modalTask._id !== taskId) {
      // dismiss first the pop the new one up
      this.taskDetailModal.hide();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    await this.taskDetail.init(taskId);
    this.taskDetailModal.show();
  }

  private async populatePublishedCids() {
    const allPublished = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "gmbAccount",
      query: {},
      limit: 100000,
      projection: {
        _id: 0,
        "locations.cid": 1,
        "locations.status": 1,
        "locations.role": 1
      }
    }).toPromise();
    allPublished.forEach(acct => (acct.locations || []).forEach(loc => {
      if (loc.status === "Published" && ["PRIMARY_OWNER", 'OWNER', 'CO_OWNER', 'MANAGER'].find(r => r === loc.role)) this.publishedCids.add(loc.cid)
    }));
  }

  async ngOnChanges(changes: SimpleChanges) {
    if (this.restaurant) {
      await this.populateQMDomains();
      await this.populatePublishedCids();
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
