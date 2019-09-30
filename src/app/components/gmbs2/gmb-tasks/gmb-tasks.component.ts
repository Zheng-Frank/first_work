import { Component, OnInit, ViewChild } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { environment } from '../../../../environments/environment';
import { GlobalService } from 'src/app/services/global.service';
import { AlertType } from 'src/app/classes/alert-type';
import { Task } from 'src/app/classes/tasks/task';
import { ModalComponent } from "@qmenu/ui/bundles/qmenu-ui.umd";

@Component({
  selector: 'app-gmb-tasks',
  templateUrl: './gmb-tasks.component.html',
  styleUrls: ['./gmb-tasks.component.css']
})
export class GmbTasksComponent implements OnInit {
  @ViewChild('rowModal') rowModal: ModalComponent;
  apiLoading = false;
  activeTabLabel = 'Mine';
  currentAction;
  tasks = [];

  qmenuDomains = new Set();
  modalRow;
  restaurant;
  verificationOptions = [];
  verifications = [];
  preferredVerification;
  showNotifier = false;

  restaurantDict = {};

  now = new Date();
  user;
  assignees = [];

  taskScheduledAt = new Date();
  comments = '';
  pin;
  calling = false;

  tabs = [
    { label: 'Mine', rows: [] },
    { label: 'Non-claimed', rows: [] },
    { label: 'My Closed', rows: [] }
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


  constructor(private _api: ApiService, private _global: GlobalService) {
    this.user = this._global.user;
  }

  async ngOnInit() {
    this.setActiveTab(this.tabs[0]);
    this.populate();
    const users = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'user',
      projection: {
        username: 1,
        roles: 1,
        disabled: 1
      },
      limit: 6000
    }).toPromise();

    // either marketer or GMB
    this.assignees = users.filter(u => !u.disabled && u.roles.some(r => ['GMB', 'MARKETER'].indexOf(r) >= 0)).map(u => u.username).sort((u1, u2) => u1 > u2 ? 1 : -1);
    this.assignees.unshift('NON-CLAIMED');
  }


  async triggerGoogleCall() {
    this.calling = true;
    let result;
    try {

      result = await this._api.post(environment.appApiUrl + 'gmb/verify', {
        email: this.modalRow.request.email,
        locationName: this.modalRow.request.locationName,
        verificationOption: this.preferredVerification
      }).toPromise();
      this._global.publishAlert(AlertType.Success, 'Call Initiated from Google');

    } catch (error) {
      console.log(error);
      result = error.message || error.error || error;
      this._global.publishAlert(AlertType.Danger, JSON.stringify(result));
    }
    this.calling = false;
    await this.addComments(`called: result=${JSON.stringify(result)}`);
  }


  join(values) {
    return (values || []).join(', ')
  }

  async decline() {
    if (confirm('The owner has declined to work with qMenu. This will assign the task to another person to handle. Are you sure?')) {
      await this.addComments('owner declined to work with qMenu');
      await this.update(this.modalRow.task, 'request.ownerDeclined', true);
      await this.update(this.modalRow.task, 'scheduledAt', new Date());
      await this.assign(this.modalRow.task, 'mo');
    }
  }

  async assign(task, assignee) {
    await this.update(task, 'assignee', assignee === 'NON-CLAIMED' ? undefined : assignee);
    await this.populate();
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

    this.preferredVerification = this.verifications.filter(v => v.state === 'PENDING')[0];
    if (!this.preferredVerification && this.verificationOptions.some(vo => vo.verificationMethod === 'PHONE_CALL')) {
      this.preferredVerification = this.verificationOptions.filter(vo => vo.verificationMethod === 'PHONE_CALL')[0];
      this.preferredVerification.method = this.preferredVerification.verificationMethod;
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
  }
  async savePin() {
    await this.update(this.modalRow.task, "request.pin", this.pin);
    await this.addComments(`PIN ${this.pin}`);
    this.pin = '';
  }

  async addComments(comments) {
    if (comments) {
      const fullComments = `${new Date().getMonth() + 1}/${new Date().getDate()} ${this.user.username}: ${comments}`;
      await this.update(this.modalRow.task, 'comments', this.modalRow.comments ? `${this.modalRow.comments}\n${fullComments}` : fullComments);
    }
    this.comments = '';
  }

  async populate() {
    const myUsername = this._global.user.username;
    // either mine or "non-claimed and open'

    try {
      const tasks = await this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "task",
        query: {
          $or: [
            {
              assignee: myUsername,
              name: "GMB Request"
            },
            {
              assignee: null,
              name: "GMB Request",
              result: null
            },
          ]
        },
        limit: 10000000,
        sort: {
          createdAt: -1
        }
      }).toPromise();
      this.tasks = tasks.map(t => new Task(t));

      const restaurants = await this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "restaurant",
        query: {},
        limit: 10000000,
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
      restaurants.map(rt => {
        const topDomain = this.parseTopDomain((rt.web || {}).qmenuWebsite || 'randomdomain.com');
        if (topDomain) {
          this.qmenuDomains.add(topDomain);
        }
      });

    } catch (error) {
      this._global.publishAlert(AlertType.Danger, 'Error on loading data. Please contact technical support');
    }

    this.tabs.map(tab => {
      const filterMap = {
        "Mine": t => t.assignee === this.user.username && !t.result,
        "Non-claimed": t => !t.assignee && !t.result,
        "My Closed": t => t.assignee === this.user.username && t.result
      };
      tab.rows = this.tasks.filter(filterMap[tab.label]).map((task, index) => this.generateRow(index + 1, task));
    });
    this.now = new Date();

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
      await this.updateSingleTask(task._id);

    } catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, 'Error updating');
    }

  }

  async updateSingleTask(taskId) {
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
    return {
      localTimeString: new Date().toLocaleTimeString('en-US', { timeZone: (this.restaurantDict[task.relatedMap.restaurantId].googleAddress || {}).timezone }),
      statusClass: this.getStatusClass(task),
      address: ((this.restaurantDict[task.relatedMap.restaurantId].googleAddress || {}).formatted_address || '').split(', USA')[0],
      score: this.restaurantDict[task.relatedMap.restaurantId].score,
      rowNumber: rowNumber,
      gmbOwner: (this.restaurantDict[task.relatedMap.restaurantId].googleListing || {}).gmbOwner,
      task: task,
      ...task, // also spread everything in task to row for convenience
      verificationOptions: ((task.request.voHistory || [])[0] || { options: [] }).options.filter(vo => vo.verificationMethod !== 'SMS').map(vo => ({
        ...vo,
        verification: ((task.request.verificationHistory || [])[0] || { verifications: [] }).verifications.filter(verification => verification.state === 'PENDING' && verification.method === vo.verificationMethod)[0]
      }))
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
}
