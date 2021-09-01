import { Component, OnInit, ViewChild } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { environment } from '../../../../environments/environment';
import { GlobalService } from 'src/app/services/global.service';
import { AlertType } from 'src/app/classes/alert-type';
import { Task } from 'src/app/classes/tasks/task';
import { ModalComponent } from "@qmenu/ui/bundles/qmenu-ui.umd";


@Component({
    selector: 'app-defend-gmb-tasks',
    templateUrl: './defend-gmb-tasks.component.html',
    styleUrls: ['./defend-gmb-tasks.component.css']
})
export class DefendGmbTasksComponent implements OnInit {

    private async populateTasks() {
        const dbTasks = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
            resource: "task",
            query: {
                name: "Defend GMB",
            },
            projection: {
                "assignee": 1,
                "createdAt": 1,
                "relatedMap.restaurantId": 1,
                "relatedMap.restaurantName": 1,
                "relatedMap.place_id": 1,
                "requests": 1
            }
        }, 10000);

        this.tasks = dbTasks.filter(t => this.restaurantDict[t.relatedMap.restaurantId]); //remove invalid restaruant IDs, should not happen
        this.filteredTasks = this.tasks;
        this.filter();
    }

    @ViewChild('taskModal') taskModal: ModalComponent;
    apiLoading = false;
    activeTabLabel = "All";
    currentAction;
    tasks = [];
    filteredTasks = [];

    modalTask;
    restaurant;

    restaurantDict = {};

    now = new Date();
    user;
    myUsername;
    myUserRoles;
    //tasks query criteria based on user roles
    query_or;



    taskScheduledAt = new Date();
    comments = '';
    pin;
    verifyingOption;
    pagination = true;
    //help display postcardID
    postcardIds = new Map();

    tabs = [
        { label: 'All', rows: [] },
        { label: 'Defended', rows: [] },
        { label: 'Errors', rows: [] },
        { label: 'Closed', rows: [] }
    ];

    myColumnDescriptors = [
        {
            label: 'Number',
            paths: ['rowNumber'],
            sort: (a, b) => a - b
        },
        {
            label: "Restaurant",
            paths: ['relatedMap', 'restaurantName'],
            sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
        },
        {
            label: "Score",
            paths: ['score'],
            sort: (a, b) => (a || 0) > (b || 0) ? 1 : ((a || 0) < (b || 0) ? -1 : 0)
        },
        {
            label: "Created",
            paths: ['createdAt'],
            sort: (a, b) => new Date(a).valueOf() - new Date(b).valueOf()
        },
        {
            label: "Updated",
            paths: ['updated'],
            sort: (a, b) => new Date(a).valueOf() - new Date(b).valueOf()
        },
        {
            label: "View Details"
        }
    ];

    constructor(private _api: ApiService, private _global: GlobalService) {
    }

    async ngOnInit() {
        this.setActiveTab(this.tabs[0]);
        await this.populate();
        this.filter();
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

        const taskId = this.modalTask._id;
        this.modalTask = null;
        this.taskModal.hide();
        await this.refreshSingleTask(taskId);

    }

    async hardRefreshV5Task(taskId) {
        await this._api.post(environment.appApiUrl + "gmb/generic", {
            name: "defend-one-gmb",
            payload: {
                taskId: taskId,
                forceRefresh: true
            }
        }).toPromise();
    }

    setActiveTab(tab) {
        this.activeTabLabel = tab.label;
    }

    async showDetails(task) {
        if (this.modalTask && this.modalTask._id !== task._id) { // should not happen, but we check to be safe
            this.taskModal.hide();
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        this.modalTask = task;
        this.taskModal.show();
    }

    async populate() {
        try {
            // populate RTs first because tasks will do filter about them
            await this.populateRTs();
            await Promise.all([
                this.populateTasks(),

            ]);
        } catch (error) {
            this._global.publishAlert(AlertType.Danger, 'Error on loading data. Please contact technical support');
        }
        this.filter();
    }

    async refreshSingleTask(taskId) {
        const tasks = await this._api.get(environment.qmenuApiUrl + "generic", {
            resource: "task",
            query: { _id: { $oid: taskId } }
        }).toPromise();
        const task = new Task(tasks[0]);
        this.tabs.map(tab => {
            const index = tab.rows.findIndex(row => row.task._id === task._id);
            if (index >= 0) {
                tab.rows[index] = this.generateRow(index + 1, task);
            }
        });
    }

    private generateRow(rowNumber, task) {
        const formatedAddr = (this.restaurantDict[task.relatedMap.restaurantId].googleAddress || {}).formatted_address || '';
        return {
            requests: task.requests,
            address: (formatedAddr.split(', USA'))[0],
            score: this.restaurantDict[task.relatedMap.restaurantId].score,
            rowNumber: rowNumber,
            task: task,
            createdAt: task.createdAt,
            updated: this.findTimeOfLatestUpdate(task),
            ...task, // also spread everything in task to row for convenience
        }
    }

    private async populateRTs() {
        const restaurants = await this._api.get(environment.qmenuApiUrl + "generic", {
            resource: "restaurant",
            query: {},
            limit: 100000,
            projection: {
                "googleAddress.formatted_address": 1,
                "googleAddress.timezone": 1,
                "googleListing.gmbOwner": 1,
                "googleListing.phone": 1,
                score: 1,
                "web.qmenuWebsite": 1, // for qmenu domains
                "courier.name": 1
            }
        }).toPromise();
        this.restaurantDict = restaurants.reduce((dict, rt) => (dict[rt._id] = rt, dict), {});
    }

    filter() {
        this.filteredTasks = this.tasks;
        this.tabs.map(tab => {
            const filterMap = {
                "All": t => t,
                "Defended": t => this.isDefenseCompleted(t) && !this.doesTaskHaveError(t),
                "Errors": t => this.doesTaskHaveError(t)
            };
            tab.rows = this.filteredTasks.filter(filterMap[tab.label]).map((task, index) => {

                return this.generateRow(index + 1, task)
            });
            return tab;
        });
    }

    isDefenseCompleted(task) {
        return (task.requests || []).some(req => req.result === "INVALID");
    }

    doesTaskHaveError(task) {
        return task.error || (task.requests || []).some(req => req.result === "ERROR")
    }

    findTimeOfLatestUpdate(row) {
        const sortedRequests = (row.requests || []).sort((b, a) => new Date(a.updatedAt).valueOf() - new Date(b.updatedAt).valueOf());
        if (sortedRequests.length) {
            return sortedRequests[0].updatedAt;
        }
        return row.createdAt;
    }

    closeModal() {
        this.modalTask = null;
        this.taskModal.hide();
    }
}
