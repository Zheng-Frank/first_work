import { Component, OnInit, ViewChild } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { GlobalService } from '../../../services/global.service';
import { AlertType } from '../../../classes/alert-type';

@Component({
  selector: 'app-gmb-lost-list',
  templateUrl: './gmb-lost-list.component.html',
  styleUrls: ['./gmb-lost-list.component.css']
})
export class GmbLostListComponent implements OnInit {
  @ViewChild('taskDetailsModal') taskDetailsModal;

  rows = [];
  filteredRows = [];

  pagination: boolean = true;
  statusOptions;
  selectedStatus = "All";
  gmbOwnerOptions = [];
  selectedGmbOwner = "All";

  averageLossesPerDay = 0;
  numberOfRestaurant = 0;
  selectedTask;

  now = new Date();
  apiLoading = false;

  myColumnDescriptors = [
    {
      label: "#"
    },
    {
      label: "Restaurant Name"
    },
    {
      label: "Score",
      paths: ['score'],
      sort: (a, b) => (a || 0) > (b || 0) ? 1 : ((a || 0) < (b || 0) ? -1 : 0)
    },
    {
      label: "Lost",
      paths: ['lostDate'],
      sort: (a, b) => a.valueOf() - b.valueOf()
    },
    {
      label: "GMB",
      paths: ['owner'],
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },
    {
      label: "Tasks"
    },
    {
      label: "Local Time"
    },
    {
      label: "Comments"
    }
  ];

  constructor(private _api: ApiService, private _global: GlobalService) {
    this.refresh();
    // this.test();
  }

  ngOnInit() {
  }

  async refresh() {
    this.apiLoading = false;
    this.now = new Date();
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 30);

    // Getting data from tables
    const events = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'event',
      query: {
        name: 'gmb-lost',
        "params.cid": { $exists: true },
        createdAt: { $gte: tenDaysAgo.valueOf() }
      },
      projection: {
        _id: 1,
        "params.cid": 1,
        createdAt: 1,
        "comments.user": 1,
        "comments.date": 1,
        "comments.content": 1
      },
    }, 6000);

    const gmbAccounts = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbAccount',
      projection: {
        _id: 0,
        "locations.cid": 1,
        "locations.status": 1,
        "locations.role": 1
      },
    }, 6000);

    const restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        "googleListing.cid": { $exists: true },
      },
      projection: {
        _id: 1,
        "googleListing.cid": 1,
        "googleAddress.formatted_address": 1,
        "googleAddress.timezone": 1,
        "gmbOwnerHistory": { $slice: 1 },
        name: 1,
        score: 1,
        disabled: 1
      }
    }, 6000);

    const tasks = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'task',
      query: {
        result: null,
        "relatedMap.cid": { $exists: true }
      },
      projection: {
        _id: 1,
        "relatedMap.cid": 1,
        createdAt: 1,
        "request.email": 1,
        "request.appealId": 1,
        "request.statusHistory": { $slice: 1 },
      }
    }, 6000);

    /**********************************************************************************/

    // Filter out false gmb-lost events
    const ownGMBSet = new Set();
    gmbAccounts.map(account => (account.locations || []).map(loc => {
      if (loc.cid && loc.status === "Published" && ["PRIMARY_OWNER", "OWNER", "CO_OWNER", "MANAGER"].indexOf(loc.role) >= 0) {
        ownGMBSet.add(loc.cid);
      }
    }));
    const trueLostEvents = events.filter(event => !ownGMBSet.has(event.params.cid));

    // Match up event and restaurant
    const dict = [];
    restaurants.map(restaurant => {
      trueLostEvents.map(event => {
        if (event.params.cid === restaurant.googleListing.cid) {
          const index = dict.findIndex(entry => entry.cid == event.params.cid);
          if (index >= 0) {  // if event already exists, pick the older one
            if (event.createdAt > dict[index].lostDate) {
              dict[index].eventId = event._id;
              dict[index].lostDate = event.createdAt;
              dict[index].comments = event.comments;
            }
          } else {  // If no event tied to the restaurant yet
            let dictItem = {
              eventId: event._id,
              restaurantId: restaurant._id,
              name: restaurant.name,
              disabled: restaurant.disabled,
              address: restaurant.googleAddress.formatted_address,
              score: restaurant.score,
              lostDate: event.createdAt,
              owner: ((restaurant.gmbOwnerHistory || [])[0] || {}).gmbOwner || 'unknown',
              comments: event.comments,
              tasks: [],
              timezone: restaurant.googleAddress.timezone,
              cid: restaurant.googleListing.cid
            };
            dict.push(dictItem);
            // add gmb owner if it doesn't exist in gmbOwnerOptions array
            if (this.gmbOwnerOptions.indexOf(dictItem.owner) === -1) {
              this.gmbOwnerOptions.push(dictItem.owner);
            }
          }
        }
      });
    });
    this.gmbOwnerOptions.sort((a, b) => a.localeCompare(b));
    this.gmbOwnerOptions.unshift("All");
    this.statusOptions = new Set();
    this.statusOptions.add("All");
    // Match up above with tasks
    tasks.map(task => {
      dict.map(entry => {
        if (task.relatedMap.cid === entry.cid) {
          if (!entry.tasks) {
            entry.tasks = []
          }
          const status = (((task.request || {}).statusHistory || [])[0] || {}).status;
          entry.tasks.push({
            id: task._id,
            date: task.createdAt,
            email: (task.request || {}).email,
            appealId: (task.request || {}).appealId,
            status: status
          });
          // Update option list
          if (status) {
            this.statusOptions.add(status);
          }
        }
      });
    });

    // Sort and Update indicators
    if (dict.length > 0) {
      dict.map(entry => entry.lostDate = new Date(entry.lostDate));
      dict.sort((r1, r2) => r2.lostDate.valueOf() - r1.lostDate.valueOf());
      const firstLostDate = new Date(dict[dict.length - 1].lostDate);
      const lastLostdate = new Date(dict[0].lostDate);
      this.numberOfRestaurant = dict.length;
      this.averageLossesPerDay = Math.ceil(this.numberOfRestaurant / (1 + (lastLostdate.valueOf() - firstLostDate.valueOf()) / (24 * 3600000)));

      this.rows = dict.filter(r => !r.disabled);
      this.filter();
    }

    this.apiLoading = false;
  }

  async filter() {
    this.filteredRows = this.rows;

    if (this.selectedStatus !== "All") {
      this.filteredRows = this.filteredRows.filter(entry => {
        let match = false;
        if (entry.tasks) {
          entry.tasks.map(task => {
            if (task.status === this.selectedStatus) {
              match = true;
            }
          });
        }
        return match;
      });
    }
    if (this.selectedGmbOwner !== "All") {
      this.filteredRows = this.filteredRows.filter(entry => entry.owner === this.selectedGmbOwner);
    }
    // Update number of restaurants shown
    this.numberOfRestaurant = this.filteredRows.length;
  }

  // Refresh a single entry's completion status
  async refreshSingleEntry(eventId) {
    this.now = new Date();
    // Get the updated request information
    const newEvents = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "event",
      query: { _id: { $oid: eventId } },
      projection: {
        "comments.user": 1,
        "comments.date": 1,
        "comments.content": 1
      }
    }).toPromise();
    const newEvent = newEvents[0];
    // Find the corresponding UI row and update it
    const index = this.rows.findIndex(row => row.eventId == eventId);
    if (index >= 0) {
      const newRow = this.rows[index];
      newRow['comments'] = newEvent['comments'];
      this.rows[index] = newRow;
    }
    const index2 = this.filteredRows.findIndex(row => row.eventId == eventId);
    if (index2 >= 0) {
      const newRow = this.filteredRows[index2];
      newRow['comments'] = newEvent['comments'];
      this.filteredRows[index2] = newRow;
    }
  }

  async addComment(r: any) {
    if (r.content) {
      try {
        // Copy and add the new Comment
        const newComment = JSON.parse(JSON.stringify(r.comments || []));
        newComment.push({
          user: this._global.user.username,
          date: new Date(),
          content: r.content
        });
        const oldData = {
          _id: r.eventId,
          comments: r.comments
        };
        const newData = {
          _id: r.eventId,
          comments: newComment
        };
        await this._api.patch(environment.qmenuApiUrl + 'generic?resource=event', [{ old: oldData, new: newData }]).toPromise();
        this._global.publishAlert(AlertType.Success, `Comment added successfully`);
        await this.refreshSingleEntry(r.eventId);
      } catch (error) {
        console.error('error while adding comment.', error);
        this._global.publishAlert(AlertType.Danger, `Error while adding comment.`);
      }
      r.content = "";
    } else {
      console.error("Comment cannot be blank");
      this._global.publishAlert(AlertType.Danger, `Comment cannot be blank.`);
    }
  }

  createAngularIndentifiableArray(array) {
    if (array) {
      return Array.from(array);
    } else {
      return [];
    }
  }

  async showDetails(taskId) {
    const tasks = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "task",
      query: { _id: { $oid: taskId } },
      limit: 1
    }).toPromise();
    this.selectedTask = tasks[0];
    this.taskDetailsModal.show();
  }
}
