import { GlobalService } from 'src/app/services/global.service';
import { Component, ElementRef, OnInit, QueryList, ViewChildren } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { environment } from 'src/environments/environment';
import {Helper} from '../../classes/helper';

enum TimeRanges {
  Last24Hours = 'Last 24 hours',
  Last48Hours = 'Last 48 hours',
  Last3Days = 'Last 3 days',
  Last7Days = 'Last 7 days',
  Last30Days = 'Last 30 days',
  CustomDate = 'Custom'
}

enum ViewModes {
  Overview = 'Overview',
  Agent = 'Agent'
}

@Component({
  selector: 'app-sales-metrics',
  templateUrl: './sales-metrics.component.html',
  styleUrls: ['./sales-metrics.component.css']
})
export class SalesMetricsComponent implements OnInit {

  startDate;
  endDate;

  timeRange = TimeRanges.Last24Hours;
  list = [];
  agentsWithCalls = new Set();
  totalRecords = 0;
  ivrUsers = {};
  userRoleMap = {};

  restaurants = [];
  marketers = [];
  viewMode = ViewModes.Overview
  agent = '';
  get agentStatsColumnDescriptors() {
    let columns = [
      {
        label: 'Total Calls',
        paths: ['totalCalls'],
        sort: (a, b) => a > b ? 1 : (a < b ? -1 : 0),
      },
      {
        label: 'New RTs Gained',
        paths: ['rtCount'],
        sort: (a, b) => a > b ? 1 : (a < b ? -1 : 0),
      },
      {
        label: 'RTs Gained with GMB Owned',
        paths: ['gmbCount'],
        sort: (a, b) => a > b ? 1 : (a < b ? -1 : 0),
      },
      {
        label: 'Average Call Duration',
        paths: ['avgCallDuration'],
        sort: (a, b) => a > b ? 1 : (a < b ? -1 : 0),
      },
      {
        label: 'Total Call Time',
        paths: ['totalCallTime'],
        sort: (a, b) => a > b ? 1 : (a < b ? -1 : 0),
      },
      {
        label: 'Churn',
        paths: ['churnCount'],
        sort: (a, b) => a > b ? 1 : (a < b ? -1 : 0),
      }];
    if (this.viewMode === ViewModes.Agent) {
      return [{
        label: "Date",
        paths: ['date'],
        sort: (a, b) => new Date(a).valueOf() - new Date(b).valueOf(),
      }, ...columns].map(col => ({...col}))
    }
    columns.splice(5, 0, {
      label: 'Average Call Time per Day',
      paths: ['avgCallTimePerDay'],
      sort: (a, b) => a > b ? 1 : (a < b ? -1 : 0),
    })
    return [{
      label: "Name",
      paths: ['agent'],
      sort: (a, b) => a > b ? 1 : (a < b ? -1 : 0),
    }, ...columns].map(col => ({...col}));
  }

  get now(): string {
    return this.dateStr(new Date());
  }

  get TimeRanges() {
    return TimeRanges;
  }
  get timeRanges() {
    return Object.values(TimeRanges);
  }

  get ViewModes() {
    return ViewModes;
  }

  get viewModes() {
    return Object.values(ViewModes);
  }

  get agents() {
    if (this.isAdmin()) {
      return Object.keys(this.ivrUsers).sort((a, b) => a.localeCompare(b));
    } else if (this.isMarketerManager()) {
      return this.marketers.map(x => x).sort((a, b) => a.localeCompare(b));
    }
    return [];
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
    if (!this.isAdmin() && !this.isMarketerManager() && !ivrName) {
      this.list = [];
      this.totalRecords = 0;
      return;
    }
    // if user input date invalid, the field will be undefined
    if (!this.startDate || !this.endDate) {
      return;
    }
    this.list = [];
    this.totalRecords = 0;
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
      Agent: { $ne: null }
    } as any;
    if (this.viewMode === ViewModes.Overview) {
      if (this.isAdmin()) {
        query['Agent.Username'] = { $in: Object.keys(this.ivrUsers) };
      } else if (this.isMarketerManager()) {
        query['Agent.Username'] = { $in: this.marketers }
      } else {
        query['Agent.Username'] = ivrName;
      }
    } else {
      if (this.agent) {
        query['Agent.Username'] = this.agent;
      }
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
        'createdAt': 1
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
        "googleListing.gmbOwner": 1,
        'rateSchedules.agent': 1,
      },
      limit: 100000
    }).toPromise();

    let agents = Object.keys(this.userRoleMap);
    data = data.filter(({Agent: {Username}}) => agents.includes(this.ivrUsers[Username] || Username));
    this.agentsWithCalls = new Set(data.map(({Agent: {Username}}) => this.ivrUsers[Username] || Username));
    if (this.viewMode === ViewModes.Overview) {
      this.renderOverView(data, start, end);
    } else if (this.viewMode === ViewModes.Agent) {
      this.renderAgentView(data)
    }
  }

  renderAgentView(data) {
    if (this.agent) {
      data = data.filter(x => x.Agent.Username === this.agent);
    }
    let map = {} as {
      [key: string]: {
        totalCalls: number, totalCallTime: number, durations: any[], agents: string[]
      }
    };
    data.forEach(item => {
      let date = new Date(item.createdAt).toLocaleDateString();
      map[date] = map[date] || {
        totalCalls: 0,
        totalCallTime: 0,
        durations: [],
        agents: []
      }
      map[date].totalCalls += 1;
      map[date].totalCallTime += item.Agent.AgentInteractionDuration;
      map[date].durations.push({
        start: item.ConnectedToSystemTimestamp,
        end: item.DisconnectTimestamp,
        duration: item.Agent.AgentInteractionDuration
      });
      map[date].agents.push(this.ivrUsers[item.Agent.Username] || item.Agent.Username);
    })
    this.list = Object.entries(map).map(([key, { totalCalls, totalCallTime, durations, agents }]) => {
      let avgCallDuration = totalCallTime / totalCalls;
      const agentRts = (this.restaurants || []).filter(rt => new Date(rt.createdAt).toLocaleDateString() === key && rt.rateSchedules.some(sch => agents.includes(sch.agent)));
      return {
        date: key,
        totalCalls,
        totalCallTime,
        avgCallDuration,
        durations,
        rtCount: agentRts.length,
        gmbCount: agentRts.filter(rt => (rt.googleListing || {}).gmbOwner === 'qmenu').length,
        churnCount: agentRts.filter(rt => this.wasRtLostInTimePeriod(rt)).length
      }
    }).sort((b, a) => new Date(a.date).valueOf() - new Date(b.date).valueOf());
  }

  renderOverView(data, start, end) {
    let map = {} as {
      [key: string]: {
        totalCalls: number, totalCallTime: number, durations: any[]
      }
    };
    let days = Math.floor((end - start) / (24 * 3600 * 1000));
    data.forEach(item => {
      let ivrUsername = item.Agent.Username;
      let agent = this.ivrUsers[ivrUsername] || ivrUsername;
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
        gmbCount: agentRts.filter(rt => (rt.googleListing || {}).gmbOwner === 'qmenu').length,
        churnCount: agentRts.filter(rt => this.wasRtLostInTimePeriod(rt)).length
      }
    }).sort((a, b) => a.agent > b.agent ? 1 : -1);
  }

  isAdmin() {
    return this._global.user.roles.some(role => role === 'ADMIN');
  }

  isMarketerManager() {
    return this._global.user.roles.some(role => role === 'MARKETER_MANAGER');
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
      if (roles.includes('MARKETER') || roles.includes('MARKETER_INTERNAL')) {
        this.marketers.push(ivrUsername)
      }
    });
  }


  async ngOnInit() {
    await this.getUsers();
    await this.changeDate();
  }

  secondsToHms(duration) {
    duration = Number(duration);
    let h = Math.floor(duration / 3600);
    let m = Math.floor(duration % 3600 / 60);
    let s = Math.floor(duration % 3600 % 60);

    const format = (t) => {
      if (t <= 9) {
        return '0' + t.toString();
      }
      return t.toString();
    };
    return [
      h, m, s
    ].filter(x => x > 0).map((el, i, arr) => {
      if (arr.length === 1) {
        return '0:' + format(el);
      }
      if (i === 0) {
        return el.toString();
      }
      return format(el);

    }).join(':');
  }

  avgCallTimePerDayByAgent() {
    let totalCallTime = this.list.reduce((a, c) => a + c.totalCallTime, 0);
    let days = Math.floor((new Date(this.endDate).valueOf() - new Date(this.startDate).valueOf()) / (24 * 3600 * 1000));
    return this.secondsToHms(totalCallTime / days);
  }

  newSignUpCount() {
    // only count sign-ups for agents whose stats are currently displayed on the page. otherwise, we may have a mismatch
    // between the total count displayed at the top of the page and the total of the individual agents' numbers
    return (this.restaurants || []).reduce((prev, val) => {
      if (this.agentsWithCalls.has(val.rateSchedules[0].agent)) {
        return prev + 1;
      }
      return prev;
    }, 0);
  }

  churnCount() {
    return (this.restaurants || []).reduce((prev, val) => {
      if (this.agentsWithCalls.has(val.rateSchedules[0].agent) && this.wasRtLostInTimePeriod(val)) {
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
    // to-do: function to find an agent's actual days worked for the given time period - e.g. user may query for 30 days'
    // worth of data, but a given agent may have worked 20 days out of the 30. In that case, we should use 20 as denominator
    // for average calculations, not 30)
  }

  downloadCsv() {
    let fields = this.agentStatsColumnDescriptors.map(({label, paths}) => ({
      label, paths
    }));

    let data = this.list.map(({avgCallDuration, totalCallTime, avgCallTimePerDay, ...rest}) => ({
      ...rest,
      avgCallDuration: this.secondsToHms(avgCallDuration),
      totalCallTime: this.secondsToHms(totalCallTime),
      avgCallTimePerDay: this.secondsToHms(avgCallTimePerDay)
    }));
    let filename = 'Sales Stats - Individual Totals for ' + this.displayTimeRange();
    if (this.viewMode === ViewModes.Agent && this.agent) {
      filename += ', ' + this.agent;
    }
    Helper.downloadCSV(filename, fields, data);
  }
}
