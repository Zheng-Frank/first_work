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
  @ViewChild('rowModal') rowModal: ModalComponent;
  apiLoading = false;
  activeTabLabel = 'Mine';
  currentAction;
  tasks = [];
  tasks_mine = [];
  tasks_nonclaimed = [];
  tasks_myclosed = [];
  tasks_allopen = [];
  tasks_allclosed = [];
  hideClosedOldTasksDays = 15;

  qmenuDomains = new Set();
  modalRow;
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

  tabs = [
    { label: 'Mine', rows: [] },
    { label: 'Non-claimed', rows: [] },
    { label: 'My Closed', rows: [] },
    { label: 'All Open', rows: [] },
    { label: 'All Closed', rows: [] }
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
      label: "Closed At",
      paths: ['resultAt'],
      sort: (a, b) => (a || new Date(0)).valueOf() - (b || new Date(0)).valueOf()
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

    this.setQueryOr();
    await this.populate();

    // this.tabs.map(tab => {
    //   const filterMap = {
    //     "Mine": t => t.assignee === this.user.username && !t.result,
    //     "Non-claimed": t => !t.assignee && !t.result,
    //     "My Closed": t => t.assignee === this.user.username && t.result,
    //     "All Open": t => !t.result,
    //     "All Closed": t => t.result,
    //   };
    //   tab.rows = this.filteredTasks.filter(filterMap[tab.label]).map((task, index) => this.generateRow(index + 1, task));
    // });

    this.ownerList = this.filteredTasks.map(t => ((this.restaurantDict[t.relatedMap.restaurantId] || {}).googleListing || {}).gmbOwner);
    this.ownerList = Array.from(new Set(this.ownerList)).sort().filter(e => e != null);

    this.now = new Date();
  }

  taskResult;
  async closeTask() {
    if (this.taskResult) {
      if (confirm('Are you sure?')) {
        await this.update(this.modalRow.task, "result", this.taskResult);
        await this.update(this.modalRow.task, "resultAt", new Date());
        const fullComments = `${new Date().getMonth() + 1}/${new Date().getDate()} ${this.user.username}: closed`;

        await this.update(this.modalRow.task, 'comments', this.modalRow.comments ? `${this.modalRow.comments}\n${fullComments}` : fullComments);

        this.rowModal.hide();
      }
    } else {
      alert('please select a result');
    }
  }

  async hardRefresh() {
    try {
      await this._api.post(environment.gmbNgrok + 'task/refresh', {
        taskId: this.modalRow._id
      }).toPromise();

      this._global.publishAlert(AlertType.Success, 'Refreshed Successfully');

    } catch (error) {
      console.log(error);
      const result = error.error || error.message || error;
      this._global.publishAlert(AlertType.Danger, JSON.stringify(result));
    }

    await this.refreshSingleTask(this.modalRow._id);

  }

  async completePin(pinHistory) {
    if (confirm('Do not try too many times for this function. Too many failed tries will cause the verification disappear. Are you sure to use this PIN?')) {
      try {
        await this._api.post(environment.gmbNgrok + 'task/complete', {
          taskId: this.modalRow._id,
          email: this.modalRow.request.email,
          locationName: this.modalRow.request.locationName,
          pin: pinHistory.pin
        }).toPromise();

        this._global.publishAlert(AlertType.Success, 'Verified Successfully');

      } catch (error) {
        console.log(error);
        const result = error.error || error.message || error;
        this._global.publishAlert(AlertType.Danger, JSON.stringify(result));
      }

      await this.addComments(`tried PIN`);
      await this.refreshSingleTask(this.modalRow._id);
    }
  }

  async resetPin(pinHistory) {
    if (confirm('Are you sure to reset this PIN? This will not erase the PIN history but scanning task will not see it')) {
      try {
        await this._api.post(environment.gmbNgrok + 'task/reset-pin', {
          taskId: this.modalRow._id,
          email: this.modalRow.request.email,
          locationName: this.modalRow.request.locationName,
          pin: pinHistory.pin
        }).toPromise();

        this._global.publishAlert(AlertType.Success, 'PIN reset Successfully');

      } catch (error) {
        console.log(error);
        const result = error.error || error.message || error;
        this._global.publishAlert(AlertType.Danger, JSON.stringify(result));
      }

      await this.addComments(`PIN reset`);
      await this.refreshSingleTask(this.modalRow._id);
    }
  }


  async trigger(vo) {
    if (confirm('Trigger too many times could exhaust existing verification options. Are you sure?')) {
      this.verifyingOption = vo;
      try {
        await this._api.post(environment.gmbNgrok + 'task/verify', {
          taskId: this.modalRow._id,
          email: this.modalRow.request.email,
          locationName: this.modalRow.request.locationName,
          verificationOption: vo
        }).toPromise();

        this._global.publishAlert(AlertType.Success, 'triggered successfully');

      } catch (error) {
        console.log(error);
        const result = error.error || error.message || error;
        this._global.publishAlert(AlertType.Danger, JSON.stringify(result));
      }

      this.verifyingOption = undefined;
      await this.addComments(`tried verification`);
      await this.refreshSingleTask(this.modalRow._id);
    }
  }


  join(values) {
    return (values || []).join(', ')
  }

  async toggleDecline() {
    const currentlyDeclined = this.modalRow.request.ownerDeclined;
    const message = currentlyDeclined ?
      'The owner has agreed to work with qMenu. Are you sure?'
      : 'The owner has declined to work with qMenu. This will assign the task to another person to handle. Are you sure?';

    if (confirm(message)) {
      await this.addComments(currentlyDeclined ? 'owner agreed to work with qMenu' : 'owner declined to work with qMenu');
      await this.update(this.modalRow.task, 'request.ownerDeclined', !currentlyDeclined);
      await this.update(this.modalRow.task, 'scheduledAt', new Date());
      // await this.assign(this.modalRow.task, 'alan');
      // also update restaurant
      await this._api.patch(environment.qmenuApiUrl + "generic?resource=restaurant", [
        {
          old: {
            _id: { $oid: this.modalRow.task.relatedMap.restaurantId },
            web: {}
          },
          new: {
            _id: { $oid: this.modalRow.task.relatedMap.restaurantId },
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
    this.update(this.modalRow.task, 'scheduledAt', this.taskScheduledAt);
    this.addComments(`rescheduled`);

  }

  setActiveTab(tab) {
    this.activeTabLabel = tab.label;
  }

  async showDetails(row) {

    this.preferredVerificationOption = undefined;
    const relatedAccounts = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "gmbAccount",
      query: { "locations.cid": row.relatedMap.cid },
      limit: 100000,
      projection: {
        "locations.cid": 1,
        "locations.status": 1
      }
    }).toPromise();
    this.isPublished = relatedAccounts.some(acct => acct.locations.some(loc => loc.cid === row.relatedMap.cid && loc.status === 'Published'));

    this.modalRow = row;
    this.taskScheduledAt = row.scheduledAt || new Date();
    this.verificationOptions = row.verificationOptions || [];
    this.verifications = ((row.request.verificationHistory || [])[0] || {}).verifications || [];
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

    this.rowModal.show();

    this.restaurant = (
      await this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "restaurant",
        query: { _id: { $oid: row.relatedMap.restaurantId } },
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

    // console.log(row);
    //
  }
  async savePin() {
    if (!this.pin) {
      return alert('Bad PIN to save');
    }
    try {
      await this._api.post(environment.gmbNgrok + 'task/save-pin', {
        taskId: this.modalRow._id,
        pin: this.pin,
        username: this._global.user.username
      }).toPromise();
    } catch (error) {
      console.log(error);
      alert('ERROR SAVING PIN');
    }
    this.pin = '';
    await this.refreshSingleTask(this.modalRow._id);
  }

  async addComments(comments) {
    if (comments) {
      const fullComments = `${new Date().getMonth() + 1}/${new Date().getDate()} ${this.user.username}: ${comments}`;
      await this.update(this.modalRow.task, 'comments', this.modalRow.comments ? `${this.modalRow.comments}\n${fullComments}` : fullComments);
    }
    this.comments = '';
  }

  async populate() {
    try {
      // await Promise.all([
      await this.populateQMDomains(),
        await this.populateRTs(),
        await this.populateTasks()
      // ]);
    } catch (error) {
      this._global.publishAlert(AlertType.Danger, 'Error on loading data. Please contact technical support');
    }
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

    this.tabs.map(tab => {
      const index = tab.rows.findIndex(row => row.task._id === task._id);
      if (index >= 0) {
        tab.rows[index] = this.generateRow(index + 1, task);
        if (this.modalRow && this.modalRow.task._id === task._id) {
          this.modalRow = tab.rows[index];
        }
      }
    });


  }

  private generateRow(rowNumber, task) {
    // console.log(task);
    // console.log(((task.request.voHistory || [])[0] || { options: [] }).options);
    const timezoneR = (this.restaurantDict[task.relatedMap.restaurantId].googleAddress || {}).timezone;
    const formatedAddr = (this.restaurantDict[task.relatedMap.restaurantId].googleAddress || {}).formatted_address || '';
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
      verificationOptions: ((task.request.voHistory || [])[0] || { options: [] }).options.filter(vo => vo.verificationMethod !== 'SMS').map(vo => ({
        ...vo,
        verification: ((task.request.verificationHistory || [])[0] || { verifications: [] }).verifications.filter(verification => verification.state === 'PENDING' && verification.method === vo.verificationMethod)[0]
      })),
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
      console.log(url);
      return;
    }
  }

  private setQueryOr() {
    const daysAgo = function (days) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - days);
      return d;
    };
    // this.query_or = [
    //   {
    //     assignee: this.myUsername,
    //     name: "GMB Request"
    //   },
    //   {
    //     assignee: null,
    //     name: "GMB Request",
    //     result: null
    //   }
    // ]

    // if (this.myUserRoles.includes("ADMIN") || this.myUserRoles.includes("GMB_ADMIN")) {

    this.query_or = [
      {
        resultAt: { $gt: { $date: daysAgo(this.hideClosedOldTasksDays) } },
        name: "GMB Request"
      },
      {
        result: null,
        name: "GMB Request"
      }
    ]
    // }

    // console.log(`task query = ${JSON.stringify(this.query_or)}`);
  }

  private async populateTasks() {
    this.setQueryOr();
    // const tasks = await this._api.get(environment.qmenuApiUrl + "generic", {
    //   resource: "task",
    //   query: {
    //     $or: this.query_or
    //   },
    // }).toPromise();
    const tasks = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: "task",
      query: {
        $or: this.query_or
      },
    }, 2000);

    this.tasks = tasks.map(t => new Task(t));
    this.tasks.sort((t1, t2) => t1.scheduledAt.valueOf() - t2.scheduledAt.valueOf());
    this.filteredTasks = this.tasks;
    this.filter();
  }

  private async populateRTs() {
    // const restaurants = await this._api.get(environment.qmenuApiUrl + "generic", {
    //   resource: "restaurant",
    //   query: {},
    //   limit: 10000,
    //   projection: {
    //     "googleAddress.formatted_address": 1,
    //     "googleAddress.timezone": 1,
    //     "googleListing.gmbOwner": 1,
    //     "googleListing.phone": 1,
    //     score: 1,
    //     "web.qmenuWebsite": 1 // for qmenu domains
    //   }
    // }).toPromise();
    const restaurants = await this._global.getCachedVisibleRestaurantList();
    this.restaurantDict = restaurants.reduce((dict, rt) => (dict[rt._id] = rt, dict), {});
  }

  private async populateQMDomains() {

    // retrieve ALL qmenu domains
    // const myDomains = await this._api.get(environment.qmenuApiUrl + "generic", {
    //   resource: "domain",
    //   query: {},
    //   limit: 10000000,
    //   projection: { expiry: 1, name: 1 }
    // }).toPromise();

    // const nonExpiredDomains = myDomains.filter(d => new Date(d.expiry) > new Date());
    // nonExpiredDomains.push({ name: 'qmenu.us' }); // in case it's not there
    // nonExpiredDomains.map(d => this.qmenuDomains.add(d.name));

    this.qmenuDomains = await this._global.getCachedDomains();
  }

  ngOnChanges(changes: SimpleChanges) {
    this.populateTasks();
    this.filter();
  }

  //filters
  assignee: string;
  filteredTasks = [];
  timeZone = "All";
  timeZoneList = ["PDT", "MDT", "CDT", "EDT", "HST", "AKDT"].sort();
  owner = "All";
  ownerList = [];

  hasEmail = false;
  hasPhone = false;
  hasPostcard = false;
  hasCode = false;

  filter() {

    this.filteredTasks = this.tasks;

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

    //filter verification options
    if (this.hasEmail || this.hasPhone || this.hasPostcard) {
      this.filteredTasks = this.filteredTasks.filter(t => {

        const lastVos = ((((t.request || {}).voHistory || [])[0] || {}).options) || [];
        const availableVos = lastVos.map(op => op.verificationMethod);
        let voCheck = true;
        if (this.hasEmail) voCheck = lastVos.filter(v => v.emailData && this.qmenuDomains.has(v.emailData.domainName)).length > 0;
        if (this.hasPhone) voCheck = voCheck && availableVos.includes('PHONE_CALL');
        if (this.hasPostcard) voCheck = voCheck && availableVos.includes('ADDRESS');
        return voCheck;
      })
    };

    //filter PIN
    if (this.hasCode) {
      this.filteredTasks = this.filteredTasks.filter(t => (((t.request || {}).pinHistory || [])[0] || []).pin);
    };

    this.tabs.map(tab => {
      const filterMap = {
        "Mine": t => t.assignee === this.user.username && !t.result,
        "Non-claimed": t => !t.assignee && !t.result,
        "My Closed": t => t.assignee === this.user.username && t.result,
        "All Open": t => !t.result,
        "All Closed": t => t.result,
      };
      tab.rows = this.filteredTasks.filter(filterMap[tab.label]).map((task, index) => this.generateRow(index + 1, task));
    });

  }

  pagination = true;

}
