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
                "request.refreshedAt": 1,
                "request.ownerDeclined": 1,
                "request.statusHistory.status": 1,
                "request.statusHistory.isError": 1,
                "request.statusHistory": { $slice: 1 },
                "request.verificationHistory": { $slice: 1 },
                "request.voHistory": { $slice: 2 },
                "request.voHistory.time": 1,
                "request.voHistory.options.verificationMethod": 1,
                "request.voHistory.options.emailData.domainName": 1,
                "notification_status": 1,
            }
        }, 1000);

        this.tasks = dbTasks.map(t => new Task(t));
        this.tasks.sort((t1, t2) => t1.scheduledAt.valueOf() - t2.scheduledAt.valueOf());
        // this.tasks.filter(t => !this.restaurantDict[t.relatedMap.restaurantId])
        //     .forEach(function (task) { console.log(`ERROR bad restaurant id ${task.relatedMap.restaurantId}! Task ID = ${task._id.toString()}`) });

        this.tasks = this.tasks.filter(t => this.restaurantDict[t.relatedMap.restaurantId]); //remove invalid restaruant IDs, should not happen
        this.filteredTasks = this.tasks;
        this.filter();
    }

    @ViewChild('rowModal') rowModal: ModalComponent;
    apiLoading = false;
    activeTabLabel = 'Mine';
    currentAction;
    tasks = [];
    hideClosedOldTasksDays = 15;

    relatedTasks = [];

    qmenuDomains = new Set();
    publishedCids = new Set();
    modalTask;
    restaurant;
    verificationOptions = [];
    verifications = [];
    preferredVerificationOption;
    showNotifier = false;
    isPublished = false;

    restaurantDict = {};

    now = new Date();
    user;
    myUsername;
    myUserRoles;
    //tasks query criteria based on user roles
    query_or;

    assignees = [];

    taskScheduledAt = new Date();
    comments = '';
    pin;
    verifyingOption;
    pagination = true;
    //help display postcardID
    postcardIds = new Map();

    tabs = [
        { label: 'Mine', rows: [] },
        { label: 'Non-claimed', rows: [] },
        { label: 'My Closed', rows: [] },
        { label: 'All Open', rows: [] },
        { label: 'All Closed', rows: [] },
        { label: 'Errors', rows: [] },
        { label: 'VO Changed', rows: [] },

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

        // either marketer or GMB
        const users = await this._global.getCachedUserList();
        this.assignees = users.filter(u => !u.disabled && u.roles.some(r => ['GMB_SPECIALIST', 'MARKETER'].indexOf(r) >= 0)).map(u => u.username).sort((u1, u2) => u1 > u2 ? 1 : -1);
        this.assignees.unshift('NON-CLAIMED');

        this.setActiveTab(this.tabs[0]);

        await this.populate();

        this.ownerList = this.filteredTasks.map(t => ((this.restaurantDict[t.relatedMap.restaurantId] || {}).googleListing || {}).gmbOwner);
        this.ownerList = Array.from(new Set(this.ownerList)).sort().filter(e => e != null);

        this.now = new Date();
        this.filter();

    }

    taskResult;
    async closeTask() {
        if (this.taskResult) {
            if (confirm('Are you sure?')) {
                await this.update(this.modalTask, "result", this.taskResult);
                await this.update(this.modalTask, "resultAt", new Date());
                const fullComments = `${new Date().getMonth() + 1}/${new Date().getDate()} ${this.user.username}: closed`;

                await this.update(this.modalTask, 'comments', this.modalTask.comments ? `${this.modalTask.comments}\n${fullComments}` : fullComments);

                this.rowModal.hide();
            }
        } else {
            alert('please select a result');
        }
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

        await this.refreshSingleTask(this.modalTask._id);

    }

    async completePin(pinHistory) {
        if (confirm('Do not try too many times for this function. Too many failed tries will cause the verification disappear. Are you sure to use this PIN?')) {
            try {
                // await this._api.post(environment.gmbNgrok + 'task/complete', {
                await this._api.post(environment.appApiUrl + 'gmb/generic', {
                    name: "complete-pin",
                    payload: {
                        taskId: this.modalTask._id,
                        email: this.modalTask.request.email,
                        locationName: this.modalTask.request.locationName,
                        pin: pinHistory.pin
                    }
                }).toPromise();

                this._global.publishAlert(AlertType.Success, 'Verified Successfully');

            } catch (error) {
                console.log(error);
                const result = error.error || error.message || error;
                this._global.publishAlert(AlertType.Danger, JSON.stringify(result));
            }

            await this.addComments(`tried PIN`);
            await this.refreshSingleTask(this.modalTask._id);
        }
    }

    async resetPin(pinHistory) {
        if (confirm('Are you sure to reset this PIN? This will not erase the PIN history but scanning task will not see it')) {
            try {
                // await this._api.post(environment.gmbNgrok + 'task/reset-pin', {
                await this._api.post(environment.appApiUrl + 'gmb/generic', {
                    name: "reset-pin",
                    payload: {
                        taskId: this.modalTask._id,
                        username: this._global.user.username
                    }
                }).toPromise();

                this._global.publishAlert(AlertType.Success, 'PIN reset Successfully, refreshing task');

            } catch (error) {
                console.log(error);
                const result = error.error || error.message || error;
                this._global.publishAlert(AlertType.Danger, JSON.stringify(result));
            }

            await this.addComments(`PIN reset`);
            await this.hardRefresh(this.modalTask);
        }
    }

    async hardRefreshV5Task(taskId) {
        await this._api.post(environment.appApiUrl + "gmb/generic", {
            name: "process-one-task",
            payload: {
                taskId: taskId,
                forceRefresh: true
            }
        }).toPromise();
    }

    async trigger(task, vo) {
        if (confirm('Trigger too many times could exhaust existing verification options. Are you sure?')) {
            this.verifyingOption = vo;
            try {
                // await this._api.post(environment.gmbNgrok + 'task/verify', {
                //     taskId: task._id,
                //     email: task.request.email,
                //     locationName: task.request.locationName,
                //     verificationOption: vo
                // }).toPromise();

                await this._api.post(environment.appApiUrl + "gmb/generic", {
                    name: "verify",
                    payload: {
                        taskId: task._id,
                        email: task.request.email,
                        locationName: task.request.locationName,
                        verificationOption: vo
                    }
                }).toPromise();

                this._global.publishAlert(AlertType.Success, 'triggered successfully, refreshing task');

            } catch (error) {
                console.log(error);
                const result = error.error || error.message || error;
                this._global.publishAlert(AlertType.Danger, JSON.stringify(result));
            }
            this.verifyingOption = undefined;
            await this.addComments(`tried verification`);
            await this.hardRefresh(task);
        }
    }

    // Send Google PIN message.
    sendingGooglePinMessage = false;
    triggerSendGooglePinMessage() {
        this.sendingGooglePinMessage = !this.sendingGooglePinMessage;
    }

    logSendingGooglePinMessage(event) {
        const notification_status_new = {
            user: this._global.user.username,
            time: new Date(),
            channels: event.channels,
            comments: event.comments
        }
        if (this.modalTask.notification_status) {
            this.modalTask.notification_status.unshift(notification_status_new);
        }
        else {
            this.modalTask.notification_status = [notification_status_new];
        }
        this.update(this.modalTask, "notification_status", this.modalTask.notification_status);
        this.triggerSendGooglePinMessage();
    }

    showCompleteNotificationHistory = false;

    triggerCompleteNotificationHistory() {
        this.showCompleteNotificationHistory = !this.showCompleteNotificationHistory;
    }


    join(values) {
        return (values || []).join(', ')
    }

    async toggleDecline() {
        const currentlyDeclined = this.modalTask.request.ownerDeclined;
        const message = currentlyDeclined ?
            'The owner has agreed to work with qMenu. Are you sure?'
            : 'The owner has declined to work with qMenu. This will assign the task to another person to handle. Are you sure?';

        if (confirm(message)) {
            await this.addComments(currentlyDeclined ? 'owner agreed to work with qMenu' : 'owner declined to work with qMenu');
            await this.update(this.modalTask, 'request.ownerDeclined', !currentlyDeclined);
            await this.update(this.modalTask, 'scheduledAt', new Date());
            // also update restaurant
            await this._api.patch(environment.qmenuApiUrl + "generic?resource=restaurant", [
                {
                    old: {
                        _id: { $oid: this.modalTask.relatedMap.restaurantId },
                        web: {}
                    },
                    new: {
                        _id: { $oid: this.modalTask.relatedMap.restaurantId },
                        web: {
                            agreeToCorporate: currentlyDeclined ? 'Yes' : 'No'
                        }
                    },
                }
            ]).toPromise();
        }
    }

    async assign(task, assignee) {
        await this.update(task, 'assignee', assignee === 'NON-CLAIMED' ? undefined : assignee);
        await this.populateTasks();
        this.rowModal.hide();
    }

    plusDay(i) {
        const scheduledAt = new Date();
        scheduledAt.setDate(scheduledAt.getDate() + i);
        this.taskScheduledAt = scheduledAt;
        this.scheduledAtUpdated(scheduledAt);
    }

    scheduledAtUpdated(event) {
        this.update(this.modalTask, 'scheduledAt', this.taskScheduledAt);
        this.addComments(`rescheduled`);

    }

    setActiveTab(tab) {
        this.activeTabLabel = tab.label;
    }

    async showDetails(taskId) {

        const tasks = await this._api.get(environment.qmenuApiUrl + "generic", {
            resource: "task",
            query: {
                _id: { $oid: taskId }
            }
        }).toPromise();

        if (this.modalTask && this.modalTask._id !== taskId) {
            // dismiss first the pop the new one up
            this.rowModal.hide();
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        this.modalTask = tasks[0];
        const theTask = tasks[0];
        this.rowModal.show();

        this.preferredVerificationOption = undefined;
        // const relatedAccounts = await this._api.get(environment.qmenuApiUrl + "generic", {
        //     resource: "gmbAccount",
        //     query: { "locations.cid": theTask.relatedMap.cid },
        //     limit: 100000,
        //     projection: {
        //         "locations.cid": 1,
        //         "locations.status": 1
        //     }
        // }).toPromise();
        // this.isPublished = relatedAccounts.some(acct => acct.locations.some(loc => loc.cid === theTask.relatedMap.cid && loc.status === 'Published'));
        this.isPublished = this.publishedCids.has(theTask.relatedMap.cid);

        this.taskScheduledAt = theTask.scheduledAt || new Date();
        const verificationOptions = (((theTask.request.voHistory || [])[0] || { options: [] }).options || []).filter(vo => vo.verificationMethod !== 'SMS').map(vo => ({
            ...vo,
            verification: ((theTask.request.verificationHistory || [])[0] || { verifications: [] }).verifications.filter(verification => verification.state === 'PENDING' && verification.method === vo.verificationMethod)[0]
        }));

        this.verificationOptions = verificationOptions || [];
        this.verifications = ((theTask.request.verificationHistory || [])[0] || {}).verifications || [];
        // add faClass
        const faMap = {
            EMAIL: 'at',
            ADDRESS: 'address-card',
            PHONE_CALL: 'phone'
        };
        this.verificationOptions.map(vo => {
            vo.faClass = faMap[vo.verificationMethod] || 'question';
        });
        this.verifications.map(v => {
            v.faClass = faMap[v.method] || 'question';
        });

        // preferred:
        const emailOption = this.verificationOptions.filter(vo => vo.verificationMethod === 'EMAIL' && !this.isNonQmenuEmail(vo))[0];
        const phoneOption = this.verificationOptions.filter(vo => vo.verificationMethod === 'PHONE_CALL')[0];
        const addressOption = this.verificationOptions.filter(vo => vo.verificationMethod === 'ADDRESS')[0];
        const pendingAddressVerification = this.verifications.filter(v => v.method === 'ADDRESS' && v.state === 'PENDING')[0];

        if (emailOption) {
            this.preferredVerificationOption = emailOption;
        } else if (!pendingAddressVerification && phoneOption && !this.isPublished) {
            this.preferredVerificationOption = phoneOption;
        } else if (addressOption) {
            this.preferredVerificationOption = addressOption;
        }


        this.restaurant = (
            await this._api.get(environment.qmenuApiUrl + "generic", {
                resource: "restaurant",
                query: { _id: { $oid: theTask.relatedMap.restaurantId } },
                limit: 1,
                projection: {
                    "googleAddress.formatted_address": 1,
                    "googleAddress.timezone": 1,
                    "googleListing.gmbOwner": 1,
                    "googleListing.phone": 1,
                    score: 1,
                    people: 1,
                    logs: 1,
                    channels: 1 // for sending google-pin emails or sms
                }
            }).toPromise()
        )[0];
        (this.restaurant.people || []).map(person => {
            person.channels = (person.channels || []).filter(c => c.type !== 'Email')
        });

        const relatedTasks = await this._api.get(environment.qmenuApiUrl + "generic", {
            resource: "task",
            query: { "relatedMap.cid": theTask.relatedMap.cid, result: null },
            limit: 100,
            projection: {
                assignee: 1,
                name: 1,
                "request.email": 1,
                "transfer.toEmail": 1,
                createdAt: 1
            }
        }).toPromise();

        this.relatedTasks = relatedTasks.filter(t => t._id !== theTask._id);

    }
    async savePin() {
        if (!this.pin) {
            return alert('Bad PIN to save');
        }
        try {
            // await this._api.post(environment.gmbNgrok + 'task/save-pin', {
            await this._api.post(environment.appApiUrl + 'gmb/generic', {
                name: "save-pin",
                payload: {
                    taskId: this.modalTask._id,
                    pin: this.pin,
                    username: this._global.user.username
                }
            }).toPromise();
        } catch (error) {
            console.log(error);
            alert('ERROR SAVING PIN');
        }
        this.pin = '';
        await this.refreshSingleTask(this.modalTask._id);
    }

    async addComments(comments) {
        if (comments) {
            console.log(comments);
            const fullComments = `${new Date().getMonth() + 1}/${new Date().getDate()} ${this.user.username}: ${comments}`;
            console.log(comments);
            console.log(this.modalTask);
            await this.update(this.modalTask, 'comments', this.modalTask.comments ? `${this.modalTask.comments}\n${fullComments}` : fullComments);
        }
        this.comments = '';
    }

    async populate() {
        try {
            // populate RTs first because tasks will do filter about them
            await this.populateRTs();
            await Promise.all([
                this.populateTasks(),
                this.populatePostcardId(),
                this.populateQMDomains(),
                this.populatePublishedCids()
            ]);

        } catch (error) {
            this._global.publishAlert(AlertType.Danger, 'Error on loading data. Please contact technical support');
        }

        this.filter();
    }

    isNonQmenuEmail(verificationOption) {
        return verificationOption.verificationMethod === 'EMAIL' && verificationOption.emailData && !this.qmenuDomains.has(verificationOption.emailData.domainName);
    }

    async update(task, field, value) {
        try {
            // convert a.b.c ==> {a: {b: {c: xxx}}}
            const oldTask: any = { _id: task._id };
            const paths = field.split('.');
            let obj = oldTask;
            let key = paths.shift();
            while (paths.length > 0) {
                const newObj = {};
                obj[key] = newObj;
                obj = newObj;
                key = paths.shift();
            };

            let newTask;
            if (value === undefined) {
                newTask = JSON.parse(JSON.stringify(oldTask));
                obj[key] = 'random';
            } else {
                obj[key] = value;
                newTask = JSON.parse(JSON.stringify(oldTask));
                delete obj[key];
            }
            await this._api.patch(environment.qmenuApiUrl + "generic?resource=task", [{ old: oldTask, new: newTask }]);
            await this.refreshSingleTask(task._id);

        } catch (error) {
            console.log(error);
            this._global.publishAlert(AlertType.Danger, 'Error updating');
        }

    }

    async refreshSingleTask(taskId) {
        const tasks = await this._api.get(environment.qmenuApiUrl + "generic", {
            resource: "task",
            query: { _id: { $oid: taskId } }
        }).toPromise();
        const task = new Task(tasks[0]);
        console.log("refreshed", task);
        if (this.modalTask._id === task._id) {
            await this.showDetails(task._id);
        }
        this.tabs.map(tab => {
            const index = tab.rows.findIndex(row => row.task._id === task._id);
            if (index >= 0) {
                tab.rows[index] = this.generateRow(index + 1, task);
                if (this.modalTask._id === task._id) {
                    this.modalTask = tab.rows[index];
                }
            }
        });
    }

    getAddress(task) {
        if (task) {
            return (this.restaurantDict[task.relatedMap.restaurantId].googleAddress || {}).formatted_address || '';
        }
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
            localTimeString: new Date().toLocaleTimeString('en-US', { timeZone: timezoneR }),
            statusClass: this.getStatusClass(task),
            address: (formatedAddr.split(', USA'))[0],
            score: this.restaurantDict[task.relatedMap.restaurantId].score,
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
                "web.qmenuWebsite": 1 // for qmenu domains
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
                "locations.status": 1
            }
        }).toPromise();
        allPublished.forEach(acct => (acct.locations || []).forEach(loc => { if (loc.status === "Published") this.publishedCids.add(loc.cid) }));
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
    hasPostcard = false; // NOT sent
    hasPendingPostcard = false;
    ownerDeclined = "Any";

    filter() {

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
        if (this.hasPostcard) {
            this.filteredTasks = this.filteredTasks.filter(t => {
                const lastVos = ((((t.request || {}).voHistory || [])[0] || {}).options) || [];
                const availableVos = lastVos.map(op => op.verificationMethod);
                const verifications = ((t.request.verificationHistory || [])[0] || { verifications: [] }).verifications;
                const pendingAddressVerification = verifications.filter(v => v.state === 'PENDING')[0];
                return !pendingAddressVerification && availableVos.includes('ADDRESS');
            })
        };

        //filter pending address
        if (this.hasPendingPostcard) {
            this.filteredTasks = this.filteredTasks.filter(t => {
                const verifications = ((t.request.verificationHistory || [])[0] || { verifications: [] }).verifications;
                const pendingAddressVerification = verifications.filter(v => v.method === 'ADDRESS' && v.state === 'PENDING')[0];
                return pendingAddressVerification;
            });
        };

        this.tabs.map(tab => {
            const filterMap = {
                "Mine": t => t.assignee === this.user.username && !t.result,
                "Non-claimed": t => !t.assignee && !t.result,
                "My Closed": t => t.assignee === this.user.username && t.result,
                "All Open": t => !t.result,
                "All Closed": t => t.result,
                "Errors": t => !t.result && t.request && t.request.statusHistory && t.request.statusHistory[0]
                    && t.request.statusHistory[0].isError,
                "VO Changed": t => !t.result && t.request && t.request.voHistory && t.request.voHistory[0] && t.request.voHistory[0].time
                    && ((this.now.getTime() - new Date(t.request.voHistory[0].time).getTime()) / 86400000) < 1,
            };
            tab.rows = this.filteredTasks.filter(filterMap[tab.label]).map((task, index) => this.generateRow(index + 1, task));
        });
    }

    async populatePostcardId() {
        const gmbAccounts = await this._api.get(environment.qmenuApiUrl + "generic", {
            resource: "gmbAccount",
            limit: 100000,
            projection: {
                "email": 1,
                "postcardId": 1
            }
        }).toPromise();
        this.postcardIds = new Map(gmbAccounts.map(acct => [acct.email, acct.postcardId]));
    }

    getPostcardId(email) {
        return this.postcardIds.get(email);
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
