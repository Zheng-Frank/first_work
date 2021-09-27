import { GmbTaskDetailComponent } from './../gmb-task-detail/gmb-task-detail.component';
import { Component, OnInit, ViewChild, OnDestroy, SimpleChanges } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { environment } from '../../../../environments/environment';
import { GlobalService } from 'src/app/services/global.service';
import { AlertType } from 'src/app/classes/alert-type';
import { Task } from 'src/app/classes/tasks/task';
import { ModalComponent } from "@qmenu/ui/bundles/qmenu-ui.umd";
import { Helper } from "src/app/classes/helper";

@Component({
    selector: 'app-gmb-tasks',
    templateUrl: './gmb-tasks.component.html',
    styleUrls: ['./gmb-tasks.component.css']
})
export class GmbTasksComponent implements OnInit, OnDestroy {

    private async populateTasks() {
        const myRoles = this.myUserRoles;
        const myUsername = this.myUsername;
        console.log(myRoles);
        console.log(myUsername);
        console.log(myRoles.indexOf("MARKETER_INTERNAL") >= 0 ? { assignee: myUsername } : {});
        // this.setQueryOr();
        const dbTasks = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
            resource: "task",
            query: {
                result: null,
                name: "GMB Request",
                ...myRoles.indexOf("MARKETER_INTERNAL") >= 0 ? { assignee: myUsername } : {},
                // "relatedMap.restaurantId": "58a34a2be1ddb61100f9e49c"
            },
            projection: {
                "assignee": 1,
                "ownerDeclined": 1,
                "scheduledAt": 1,
                "comments": 1,
                "createdAt": 1,
                "relatedMap.restaurantId": 1,
                "relatedMap.restaurantName": 1,
                "relatedMap.cid": 1,
                "request.appealId": 1,
                "request.refreshedAt": 1,
                "request.ownerDeclined": 1,
                "request.statusHistory": { $slice: 1 },
                "request.verificationHistory": { $slice: 1 },
                "request.voHistory": { $slice: 2 },
                "notification_status": 1,
            }
        }, 10000);

        this.tasks = dbTasks.map(t => new Task(t));
        this.tasks.sort((t1, t2) => t1.scheduledAt.valueOf() - t2.scheduledAt.valueOf());
        // this.tasks.filter(t => !this.restaurantDict[t.relatedMap.restaurantId])
        //     .forEach(function (task) { console.log(`ERROR bad restaurant id ${task.relatedMap.restaurantId}! Task ID = ${task._id.toString()}`) });

        this.tasks = this.tasks.filter(t => this.restaurantDict[t.relatedMap.restaurantId]); //remove invalid restaruant IDs, should not happen
        this.filteredTasks = this.tasks;
        this.filter();
    }

    @ViewChild('rowModal') rowModal: ModalComponent;
    @ViewChild('taskDetail') taskDetail: GmbTaskDetailComponent;
    apiLoading = false;
    activeTabLabel = 'Mine';
    currentAction;
    tasks = [];
    hideClosedOldTasksDays = 15;


    qmenuDomains = new Set();
    publishedCids = new Set();

    restaurantDict = {};

    now = new Date();
    user;
    myUsername;
    myUserRoles;
    //tasks query criteria based on user roles
    query_or;

    // comments = '';
    // pin;
    // verifyingOption;
    pagination = true;
    //manual error fixes
    manualFixes = ["UPDATE_INFO_REQUIRED"];

    tabs = [
        { label: 'Mine', rows: [] },
        { label: 'Non-claimed', rows: [] },
        { label: 'My Closed', rows: [] },
        { label: 'All Open', rows: [] },
        { label: 'All Closed', rows: [] },
        { label: 'Errors', rows: [] },
        { label: 'VO Changed', rows: [] },
        { label: 'Manual Fixes', rows: [] },

    ];

    myColumnDescriptors = [
        {
            label: 'Number'
        },
        {
            label: "Scheduled At",
            paths: ['scheduledAt'],
            sort: (a, b) => a.valueOf() - b.valueOf()
        },
        {
            label: "Restaurant",
            paths: ['relatedMap', 'restaurantName'],
            sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
        },
        {
            label: "Time Zone",
            paths: ['timezoneCell'],
            sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
        },
        {
            label: "Score",
            paths: ['score'],
            sort: (a, b) => (a || 0) > (b || 0) ? 1 : ((a || 0) < (b || 0) ? -1 : 0)
        },
        {
            label: "Current GMB",
            paths: ['gmbOwner'],
            sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
        },
        {
            label: "Options"
        },
        {
            label: "Assignee",
            paths: ['assignee'],
            sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
        },
        {
            label: "Actions"
        },
        {
            label: "Created",
            paths: ['createdAt'],
            sort: (a, b) => a.valueOf() - b.valueOf()
        },
        {
            label: "Refreshed At",
            paths: ['request', 'refreshedAt'],
            sort: (a, b) => new Date(a || 0).valueOf() - new Date(b || 0).valueOf()
        },
        {
            label: "Comments"
        },
    ];
    timer;


    constructor(private _api: ApiService, private _global: GlobalService) {
        this.timer = setInterval(_ => this.now = new Date(), 60000);
    }

    ngOnDestroy() {
        if (this.timer) {
            clearInterval(this.timer);
        }
    }

    async ngOnInit() {

        this.user = this._global.user;
        this.myUsername = this.user.username;
        this.myUserRoles = this.user.roles || [];

        this.setActiveTab(this.tabs[0]);

        await this.populate();

        this.ownerList = this.filteredTasks.map(t => ((this.restaurantDict[t.relatedMap.restaurantId] || {}).googleListing || {}).gmbOwner);
        this.ownerList = Array.from(new Set(this.ownerList)).sort().filter(e => e != null);

        this.now = new Date();
        this.filter();
    }

    async handleAssignComplete() {
        await this.populateTasks();
    }

    setActiveTab(tab) {
        this.activeTabLabel = tab.label;
    }

    async showDetails(taskId) {
        if (this.taskDetail.modalTask && this.taskDetail.modalTask._id !== taskId) {
            // dismiss first the pop the new one up
            this.rowModal.hide();
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        await this.taskDetail.init(taskId);
        this.rowModal.show();
    }

    async populate() {
        this.apiLoading = true;
        try {
            // populate RTs first because tasks will do filter about them
            await this.populateRTs();
            await Promise.all([
                this.populateTasks(),
                this.populateQMDomains(),
                this.populatePublishedCids(),
                this.populateManualFixes()
            ]);

        } catch (error) {
            this._global.publishAlert(AlertType.Danger, 'Error on loading data. Please contact technical support');
        }
        this.apiLoading = false;
        this.filter();
    }

    isNonQmenuEmail(verificationOption) {
        return verificationOption.verificationMethod === 'EMAIL' && verificationOption.emailData && !this.qmenuDomains.has(verificationOption.emailData.domainName);
    }

    async handleRefreshSingleTask(taskId) {
        const tasks = await this._api.get(environment.qmenuApiUrl + "generic", {
            resource: "task",
            query: { _id: { $oid: taskId } }
        }).toPromise();
        const task = new Task(tasks[0]);
        if (this.taskDetail.modalTask._id === task._id) {
            await this.showDetails(taskId);
        }
        this.tabs.map(tab => {
            const index = tab.rows.findIndex(row => row.task._id === task._id);
            if (index >= 0) {
                tab.rows[index] = this.generateRow(index + 1, task);
            }
        });
    }

    private generateRow(rowNumber, task) {
        // console.log(task);
        // console.log(((task.request.voHistory || [])[0] || { options: [] }).options);
        const timezoneR = (this.restaurantDict[task.relatedMap.restaurantId].googleAddress || {}).timezone;
        const formatedAddr = (this.restaurantDict[task.relatedMap.restaurantId].googleAddress || {}).formatted_address || '';
        const verificationOptions = (((task.request.voHistory || [])[0] || { options: [] }).options || []).filter(vo => vo.verificationMethod !== 'SMS').map(vo => ({
            ...vo,
            verification: ((task.request.verificationHistory || [])[0] || { verifications: [] }).verifications.filter(verification => verification.state === 'PENDING' && verification.method === vo.verificationMethod)[0]
        }));
        return {
            timezoneCell: Helper.getTimeZone(formatedAddr),
            localTimeString: new Date().toLocaleString('en-US', { timeZone: timezoneR, hour: '2-digit', minute: '2-digit' }), // toLocaleTimeString toooo slow, use to localeString instead!!!!
            statusClass: this.getStatusClass(task),
            address: (formatedAddr.split(', USA'))[0],
            score: this.restaurantDict[task.relatedMap.restaurantId].score,
            courier: (this.restaurantDict[task.relatedMap.restaurantId].courier || {}).name,
            rowNumber: rowNumber,
            gmbOwner: (this.restaurantDict[task.relatedMap.restaurantId].googleListing || {}).gmbOwner,
            task: task,
            ...task, // also spread everything in task to row for convenience
            verificationOptions: verificationOptions,
            pendingVerification: (((task.request.verificationHistory || [])[0] || {}).verifications || []).filter(v => v.state === "PENDING")[0],
            assignee: task.assignee
        }
    }

    private getStatusClass(task) {
        const day = 24 * 3600 * 1000;
        const diff = this.now.valueOf() - (new Date(task.scheduledAt || 0)).valueOf();
        if (diff > day) {
            return 'danger';
        }

        if (diff > 0) {
            return 'warning';
        }

        if (diff > -1 * day) {
            return 'info';
        }
        return 'success';
    };

    parseTopDomain(url) {
        if (!url) {
            return;
        }

        // remove things before / and after /
        if (!url.startsWith('http:') && !url.startsWith('https:')) {
            url = 'http://' + url;
        }
        try {
            let host = new URL(url).host;
            // keep ONLY last two (NOT GOOD for other country's domain)
            return host.split('.').slice(-2).join('.');
        } catch (error) {
            return;
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

    private async populateQMDomains() {
        this.qmenuDomains = await this._global.getCachedDomains();
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

    private async populateManualFixes() {
        const [result] = await this._api.get(environment.qmenuApiUrl + "generic", {
            resource: "config",
            query: { key: "GMB_TASK_MANUAL_FIX_REQUIRED" },
            limit: 1,
            projection: {
                _id: 0,
                "value": 1
            }
        }).toPromise();
        this.manualFixes = result.value;
    }


    ngOnChanges(changes: SimpleChanges) {

    }

    //filters
    assignee: string;
    filteredTasks = [];
    timeZone = "All";
    timeZoneList = ["PDT", "MDT", "CDT", "EDT", "HST", "AKDT"].sort();
    owner = "All";
    ownerList = [];

    verified = "No";
    shouldCall = false;
    hasPhone = false;
    hasCourier = false;
    // hasPostcard = false; // NOT sent
    // hasPendingPostcard = false;
    postcardFilter = "Any";
    ownerDeclined = "Any";

    filter() {
        const start = new Date();
        this.filteredTasks = this.tasks;

        if (this.verified !== "Any") {
            this.filteredTasks = this.filteredTasks.filter(t => (this.verified === 'Yes') === (this.publishedCids.has(t.relatedMap.cid)));
        }

        if (this.assignee === "NON-CLAIMED") {
            this.filteredTasks = this.filteredTasks.filter(t => !t.assignee);
        } else if (this.assignee && this.assignee !== "All") {
            this.filteredTasks = this.filteredTasks.filter(t => t.assignee === this.assignee);
        };

        if (this.timeZone && this.timeZone !== "All") {
            this.filteredTasks = this.filteredTasks.filter(t =>
                Helper.getTimeZone((this.restaurantDict[t.relatedMap.restaurantId].googleAddress || {}).formatted_address) === this.timeZone)
        };

        if (this.owner && this.owner !== "All") {
            this.filteredTasks = this.filteredTasks.filter(t => {
                const gmb = ((this.restaurantDict[t.relatedMap.restaurantId] || {}).googleListing || {}).gmbOwner;
                switch (this.owner) {
                    case ("NON-QMENU"):
                        return gmb !== 'qmenu';
                    default:
                        return gmb === this.owner;
                }
            })
        };

        this.filteredTasks = this.filteredTasks.filter(t => {
            return this.ownerDeclined === "Any" || (t.request.ownerDeclined && this.ownerDeclined === "Yes") || (!t.request.ownerDeclined && this.ownerDeclined === "No");
        });

        if (this.shouldCall) {
            // No qMenu emails and having phone call options
            this.filteredTasks = this.filteredTasks.filter(t => {
                // const gmb = ((this.restaurantDict[t.relatedMap.restaurantId] || {}).googleListing || {}).gmbOwner;
                const published = this.publishedCids.has(t.relatedMap.cid);
                const ownerDeclined = t.request.ownerDeclined;
                const lastVos = ((((t.request || {}).voHistory || [])[0] || {}).options) || [];
                const hasQmenuEmailVo = lastVos.some(vo => vo.emailData && this.qmenuDomains.has(vo.emailData.domainName));
                const hasPhoneVo = lastVos.some(vo => vo.verificationMethod === "PHONE_CALL");
                // return gmb !== "qmenu" && !ownerDeclined && !hasQmenuEmailVo && hasPhoneVo;
                return !published && !ownerDeclined && !hasQmenuEmailVo && hasPhoneVo;
            });
        }

        //filter verification options
        if (this.hasPhone) {
            this.filteredTasks = this.filteredTasks.filter(t => {
                const lastVos = ((((t.request || {}).voHistory || [])[0] || {}).options) || [];
                const availableVos = lastVos.map(op => op.verificationMethod);
                return availableVos.includes('PHONE_CALL');
            })
        };

        //filter verification options
        if (this.postcardFilter === 'Not Sent') {
            this.filteredTasks = this.filteredTasks.filter(t => {
                const lastVos = ((((t.request || {}).voHistory || [])[0] || {}).options) || [];
                const availableVos = lastVos.map(op => op.verificationMethod);
                const verifications = ((t.request.verificationHistory || [])[0] || { verifications: [] }).verifications;
                const pendingAddressVerification = verifications.filter(v => v.state === 'PENDING')[0];
                return !pendingAddressVerification && availableVos.includes('ADDRESS');
            })
        };

        //filter pending address
        if (this.postcardFilter === 'Sent') {
            this.filteredTasks = this.filteredTasks.filter(t => {
                const verifications = ((t.request.verificationHistory || [])[0] || { verifications: [] }).verifications;
                const pendingAddressVerification = verifications.filter(v => v.method === 'ADDRESS' && v.state === 'PENDING')[0];
                return pendingAddressVerification;
            });
        };

        //filter courier
        if (this.hasCourier) {
            this.filteredTasks = this.filteredTasks.filter(t => (this.restaurantDict[t.relatedMap.restaurantId] || {}).courier);
        }

        this.tabs.map(tab => {
            const filterMap = {
                "Mine": t => t.assignee === this.user.username && !t.result,
                "Non-claimed": t => !t.assignee && !t.result && t.request && t.request.statusHistory && t.request.statusHistory[0] && !t.request.statusHistory[0].isError,
                "My Closed": t => t.assignee === this.user.username && t.result,
                "All Open": t => !t.result && t.request && t.request.statusHistory && t.request.statusHistory[0] && !t.request.statusHistory[0].isError,
                "All Closed": t => t.result,
                "Errors": t => !t.result && t.request && t.request.statusHistory && t.request.statusHistory[0]
                    && t.request.statusHistory[0].isError,
                "VO Changed": t => !t.result && t.request && t.request.voHistory && t.request.voHistory[0] && t.request.voHistory[0].time
                    && ((this.now.getTime() - new Date(t.request.voHistory[0].time).getTime()) / 86400000) < 1,
                "Manual Fixes": t => !t.result && t.request && t.request.statusHistory && t.request.statusHistory[0]
                    && t.request.statusHistory[0].isError
                    && t.request.statusHistory[0].status
                    && this.manualFixes.some(msg => t.request.statusHistory[0].status.indexOf(msg) >= 0)
            };
            tab.rows = this.filteredTasks.filter(filterMap[tab.label]).map((task, index) => this.generateRow(index + 1, task));
        });
        console.log("filter", new Date().valueOf() - start.valueOf());
    }

    isPinExpired(pinObj) {
        const timeSpanDict = {
            PHONE_CALL: 30 * 60 * 1000, // 30 minutes
            EMAIL: 7 * 24 * 3600000 + 4 * 3600000,    // 7 days 4 hours
            ADDRESS: 30 * 24 * 3600000
        };
        if (pinObj.pin) {
            const verification = pinObj.verification;
            if (verification && verification.method && verification.createTime && timeSpanDict[verification.method]) {
                const createTime = (new Date(verification.createTime)).getTime();
                return (new Date()).getTime() - createTime > timeSpanDict[verification.method];
            }
        }
    }

}
