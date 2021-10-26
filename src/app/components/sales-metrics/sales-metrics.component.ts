import { GlobalService } from 'src/app/services/global.service';
import { Component, ElementRef, OnInit, QueryList, ViewChildren } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { environment } from 'src/environments/environment';

enum TimeRanges {
  Last24Hours = 'Last 24 hours',
  Last48Hours = 'Last 48 hours',
  Last3Days = 'Last 3 days',
  Last7Days = 'Last 7 days',
  Last30Days = 'Last 30 days',
  CustomDate = 'Custom'
}

enum AgentTypes {
  All = 'All',
  Sales = 'Sales',
  CSR = 'CSR'
}

enum SortFields {
  TotalCalls = 'Total Calls',
  TotalCallTime = 'Total Call Time',
  AvgCallDuration = 'Avg Call Duration',
  RestaurntSignUps = 'Restaurant Sign Ups',
  ChurnCount = 'RTs lost to churn'
}

enum SortOrders {
  Ascending = 'Ascending',
  Descending = 'Descending'
}

@Component({
  selector: 'app-sales-metrics',
  templateUrl: './sales-metrics.component.html',
  styleUrls: ['./sales-metrics.component.css']
})
export class SalesMetricsComponent implements OnInit {

  @ViewChildren('cmp') components: QueryList<ElementRef>;

  startDate;
  endDate;
  rawIvrData = []
  
  timeRange = TimeRanges.Last24Hours;
  sortBy = SortFields.TotalCallTime;
  sortOrder = SortOrders.Descending;
  list = [];
  filteredList = [];
  totalRecords = 0;
  filteredTotalRecords = 0;
  churchTotal = 0;
  ivrUsers = {};
  userRoleMap = {};

  restaurants = [];

  get now(): string {
    return this.dateStr(new Date());
  }

  get TimeRanges() {
    return TimeRanges;
  }
  get timeRanges() {
    return Object.values(TimeRanges);
  }

  get sortFields() {
    return Object.values(SortFields);
  }

  get sortOrders() {
    return Object.values(SortOrders);
  }

  constructor(private _api: ApiService, private _global: GlobalService) {
  }

  dateStr(dt, withTime = false) {
    let [date, time] = new Date(dt).toISOString().split("T");
    if (withTime) {
      // only show in hours: 2021-09-30 12:00
      return [date, time.substr(0, 2) + ":00"].join(" ");
    }
    return date;
  }

  localDateStr(origin, withTime) {
    // 2021-09-30 12:00 or 2021-09-30
    let [date, time] = origin.split(" ");
    if (!withTime) {
      return date;
    }
    let offset = new Date().getTimezoneOffset() / 60;
    // get origin datetime in utc
    date = new Date([date, time].join("T") + "Z");
    let hour = Number(time.split(":")[0]) - offset;
    if (hour >= 24) {
      date.setDate(date.getDate() + 1);
      hour -= 24;
    } else if (hour < 0) {
      date.setDate(date.getDate() - 1);
      hour += 24;
    }
    // get the actual local date and time;
    date = date.toISOString().split("T")[0];
    time = (hour > 10 ? hour : "0" + hour) + ":00";
    return [date, time].join(" ");
  }

  async changeDate() {
    if (this.timeRange !== TimeRanges.CustomDate) {
      let temp = new Date();
      this.endDate = this.dateStr(temp);
      let diffs = {
        [TimeRanges.Last24Hours]: 1,
        [TimeRanges.Last48Hours]: 2,
        [TimeRanges.Last3Days]: 3,
        [TimeRanges.Last7Days]: 7,
        [TimeRanges.Last30Days]: 30
      };
      temp.setDate(temp.getDate() - diffs[this.timeRange]);
      this.startDate = this.dateStr(temp);
      await this.query();
    } else {
      this.startDate = this.endDate = undefined;
    }
  }

  calcDates(days) {
    let start = this.startDate, end = this.endDate;
    if (this.timeRange !== TimeRanges.CustomDate) {
      let time = "T" + new Date().toISOString().split("T")[1];
      start += time;
      end += time;
    }
    let dates = [];
    start = new Date(start);
    end = new Date(end);
    const iterateHours = (step) => {
      while (start <= end) {
        dates.push(this.dateStr(start, true));
        start.setHours(start.getHours() + step);
      }
    };
    const iterateDays = (step) => {
      while (start <= end) {
        dates.push(this.dateStr(start));
        start.setDate(start.getDate() + step);
      }
    };
    if (days <= 7) {
      iterateHours(days);
    } else {
      iterateDays(Math.floor(days / 30));
    }
    return dates;
  }

  async query() {

    let ivrName = this._global.user.ivrUsername;
    if (!this.isAdmin() && !ivrName) {
      this.list = [];
      this.totalRecords = 0;
      return;
    }
    // if user input date invalid, the field will be undefined
    if (!this.startDate || !this.endDate) {
      return;
    }
    let start = this.startDate, end = this.endDate;
    if (this.timeRange === TimeRanges.CustomDate) {
      // for custom date, we calc from start 00:00:00.000 to end 23:59:59.999
      end = new Date(end);
      end.setDate(end.getDate() + 1);
    } else {
      // for last* range, we calc from (start date + cur time) to now
      let time = "T" + new Date().toISOString().split("T")[1];
      start += time;
      end += time;
    }
    start = new Date(start).valueOf();
    end = new Date(end).valueOf();
    let query = {
      Channel: 'VOICE',
      createdAt: { $gte: start, $lt: end },
      Agent: { $exists: true }
    } as any;
    if (this.isAdmin()) {
      query['Agent.Username'] = { $exists: true };
    } else {
      query['Agent.Username'] = ivrName;
    }

    const rtQuery = {
      createdAt: { $gte: { $date: start }, $lt: { $date: end } },
      "rateSchedules.agent": { $exists: true }
    };

    let data = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'amazon-connect-ctr',
      query: query,
      projection: {
        'Agent.Username': 1,
        'ConnectedToSystemTimestamp': 1,
        'DisconnectTimestamp': 1,
        'Agent.AgentInteractionDuration': 1,
      },
      limit: 100000 // limit to 10w, contains 3~4 months data
    }, 20000);
    this.totalRecords = data.length;


    this.restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: rtQuery,
      projection: {
        'createdAt': 1,
        'disabledAt': 1,
        'rateSchedules.agent': 1,
      },
      limit: 100000
    }).toPromise();

    let map = {} as {
      [key: string]: {
        totalCalls: number, totalCallTime: number, durations: any[]
      }
    };
    let days = Math.floor((end - start) / (24 * 3600 * 1000));
    data.forEach(item => {
      let ivrUsername = item.Agent.Username;
      let agent = this.ivrUsers[ivrUsername] || ivrUsername;
      let daysWorked = this.calculateDaysWorked(agent);
      map[agent] = map[agent] || {
        totalCalls: 0,
        totalCallTime: 0,
        durations: []
      };
      map[agent].totalCalls += 1;
      map[agent].totalCallTime += item.Agent.AgentInteractionDuration;
      map[agent].durations.push({
        start: item.ConnectedToSystemTimestamp,
        end: item.DisconnectTimestamp,
        duration: item.Agent.AgentInteractionDuration
      });
    });

    this.list = Object.entries(map).map(([key, { totalCalls, totalCallTime, durations }]) => {
      let avgCallDuration = totalCallTime / totalCalls;
      let avgCallTimePerDay = totalCallTime / days;
      const agentRts = (this.restaurants || []).filter(rt => rt.rateSchedules.some(sch => sch.agent === key));
      return {
        agent: key,
        totalCalls,
        totalCallTime,
        avgCallDuration,
        avgCallTimePerDay,
        durations,
        roles: this.userRoleMap[key],
        rtCount: agentRts.length,
        churnCount: agentRts.filter(rt => this.wasRtLostInTimePeriod(rt)).length
      }
    });
    this.sort();
    this.filter();

  }

  isAdmin() {
    return this._global.user.roles.some(role => role === 'ADMIN');
  }

  async getUsers() {
    let users = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'user',
      query: {
        ivrUsername: { $exists: true },
        roles: { $in: ['MARKETER', 'MARKETER_INTERNAL', 'MARKETER_EXTERNAL'] }
      },
      projection: { username: 1, ivrUsername: 1, roles: 1 },
      limit: 1000
    }).toPromise();
    users.forEach(({ username, ivrUsername, roles }) => {
      this.ivrUsers[ivrUsername] = username;
      this.userRoleMap[username] = roles;
    });
  }


  async ngOnInit() {
    await this.getUsers();
    await this.changeDate();
  }

  sort() {
    const sortField = {
      [SortFields.TotalCallTime]: 'totalCallTime',
      [SortFields.TotalCalls]: 'totalCalls',
      [SortFields.AvgCallDuration]: 'avgCallDuration',
      [SortFields.RestaurntSignUps]: 'rtCount',
      [SortFields.ChurnCount]: 'churnCount'
    }[this.sortBy];
    const sortFunc = (a, b) => {
      return this.sortOrder === SortOrders.Ascending ? a[sortField] - b[sortField] : b[sortField] - a[sortField];
    };
    this.filteredList.sort(sortFunc);
  }

  secondsToHms(duration) {
    duration = Number(duration);
    let h = Math.floor(duration / 3600);
    let m = Math.floor(duration % 3600 / 60);
    let s = Math.floor(duration % 3600 % 60);

    const format = (num, unit) => {
      if (num > 0) {
        return num + ([unit][num - 1] || (unit + 's'));
      }
      return '';
    };
    return [
      format(h, 'hour'), format(m, 'minute'), format(s, 'second')
    ].filter(x => !!x).join(', ');
  }

  async filter() {
    this.filteredList = this.list;
    this.filteredTotalRecords = this.totalRecords;

    // if (this.agentType === 'All') {
    //   return;
    // }
    // if (this.agentType === 'CSR') {
    //   this.filteredList = this.list.filter(agent => (agent.roles || []).some(role => role === 'CSR'));
    //   this.filteredTotalRecords = this.filteredList.reduce((prev, val) => prev + val.totalCalls, 0);
    //   return;
    // }
    // if (this.agentType === 'Sales') {
    //   this.filteredList = this.list.filter(agent => {
    //     return ['MARKETER', 'MARKETER_INTERNAL', 'MARKETER_EXTERNAL'].some(applicableRole => (agent.roles || []).some(agentRole => agentRole === applicableRole));
    //   });
    //   this.filteredTotalRecords = this.filteredList.reduce((prev, val) => prev + val.totalCalls, 0);
    //   return;
    // }

  }

  newSignUpCount() {
    // only count sign-ups for agents whose stats are currently displayed on the page. otherwise, we may have a mismatch
    // between the total count displayed at the top of the page and the total of the individual agents' numbers 
    return (this.restaurants || []).reduce((prev, val) => {
      const displayedUsers = this.filteredList.map(item => item.agent);
      if (displayedUsers.includes(val.rateSchedules[0].agent)) {
        return prev + 1;
      }
      return prev;
    }, 0);
  }

  churnCount() {
    return (this.restaurants || []).reduce((prev, val) => {
      const displayedUsers = this.filteredList.map(item => item.agent);
      if (displayedUsers.includes(val.rateSchedules[0].agent) && this.wasRtLostInTimePeriod(val)) {
        return prev + 1;
      }
      return prev;
    }, 0);
  }

  displayTimeRange() {
    if (this.timeRange !== 'Custom') {
      return 'the ' + this.timeRange;
    }
    return 'custom date range';
  }

  wasRtLostInTimePeriod(rt) {

    if (!this.startDate || !this.endDate) {
      return false;
    }
    if (!rt.disabledAt) {
      return false;
    }
    let start = this.startDate, end = this.endDate;
    if (this.timeRange === TimeRanges.CustomDate) {
      end = new Date(end);
      end.setDate(end.getDate() + 1);
    } else {
      
      let time = "T" + new Date().toISOString().split("T")[1];
      start += time;
      end += time;
    }
    start = new Date(start).valueOf();
    end = new Date(end).valueOf();
    if (start < new Date(rt.disabledAt).valueOf()) {
      return true;
    }
    return false;

  }


  calculateDaysWorked(username) {
    
  }
}
