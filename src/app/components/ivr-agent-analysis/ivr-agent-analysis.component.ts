import { GlobalService } from 'src/app/services/global.service';
import { Component, ElementRef, OnInit, QueryList, ViewChildren } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { environment } from 'src/environments/environment';
import { Chart } from 'chart.js';

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
  RestaurntSignUps = 'Restaurant Sign Ups'
}

enum SortOrders {
  Ascending = 'Ascending',
  Descending = 'Descending'
}

@Component({
  selector: 'app-ivr-agent-analysis',
  templateUrl: './ivr-agent-analysis.component.html',
  styleUrls: ['./ivr-agent-analysis.component.css']
})
export class IvrAgentAnalysisComponent implements OnInit {

  @ViewChildren('cmp') components: QueryList<ElementRef>;

  startDate;
  endDate;
  agentType = AgentTypes.All;
  timeRange = TimeRanges.Last24Hours;
  sortBy = SortFields.TotalCallTime;
  sortOrder = SortOrders.Descending;
  list = [];
  filteredList = [];
  totalRecords = 0;
  filteredTotalRecords = 0;
  charts = [];
  ivrUsers = {};
  userRoleMap = {};
  showCharts = false;

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

  get agentTypes() {
    return Object.values(AgentTypes);
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

  chartRefresh(el) {
    let index = Number(el.dataset.index);
    let item = this.list[index];
    const OneDay = 24 * 3600 * 1000;
    let days = Math.floor((new Date(this.endDate).valueOf() - new Date(this.startDate).valueOf()) / OneDay);
    let withTime = days <= 7;
    let dates = this.calcDates(days);
    let datasets = Object.values(SortFields).map(label => {
      let data = dates.map(date => {
        let durations = item.durations.filter(d => this.dateStr(d.start, withTime) === date);
        return {
          [SortFields.TotalCalls]: durations.length,
          [SortFields.TotalCallTime]: durations.reduce((a, c) => a + c.duration, 0),
          [SortFields.AvgCallDuration]: Math.round(durations.reduce((a, c) => a + c.duration, 0) / durations.length)
        }[label];
      });
      let yAxisID = label === SortFields.TotalCalls ? 'y-count' : 'y-time';
      let color = {
        [SortFields.TotalCalls]: '#c00',
        [SortFields.TotalCallTime]: '#00AA4F',
        [SortFields.AvgCallDuration]: '#26C9C9'
      }[label];
      return { label, yAxisID, borderColor: color, backgroundColor: color, data, fill: false };
    });
    let chart = new Chart(el, {
      options: {
        responsive: true,
        tooltips: { mode: 'index', intersect: false },
        stacked: false,
        scales: {
          yAxes: [
            { id: "y-count", type: 'linear', display: true, position: 'left' },
            {
              id: "y-time",
              type: 'linear',
              display: true,
              position: 'right',

              // grid line settings
              grid: {
                drawOnChartArea: false, // only want the grid lines for one axis to show up
              },
            }
          ]
        }
      },
      type: 'line',
      data: { labels: dates.map(d => this.localDateStr(d, withTime)), datasets }
    });
    this.charts.push(chart);
  }

  async query() {
    this.charts.forEach(chart => chart.destroy());
    this.charts = [];
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
      return {
        agent: key,
        totalCalls,
        totalCallTime,
        avgCallDuration,
        avgCallTimePerDay,
        durations,
        roles: this.userRoleMap[key],
        rtCount: (this.restaurants || []).filter(rt => rt.rateSchedules.some(sch => sch.agent === key)).length
      }
    });
    this.sort();
    this.filter();
    setTimeout(() => {
      this.components.toArray().forEach(el => this.chartRefresh(el.nativeElement));
    });
  }

  isAdmin() {
    return this._global.user.roles.some(role => role === 'ADMIN');
  }

  async getUsers() {
    let users = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'user',
      query: { ivrUsername: { $exists: true } },
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
      [SortFields.RestaurntSignUps]: 'rtCount'
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

    if (this.agentType === 'All') {
      return;
    }
    if (this.agentType === 'CSR') {
      this.filteredList = this.list.filter(agent => (agent.roles || []).some(role => role === 'CSR'));
      this.filteredTotalRecords = this.filteredList.reduce((prev, val) => prev + val.totalCalls, 0);
      return;
    }
    if (this.agentType === 'Sales') {
      this.filteredList = this.list.filter(agent => {
        return ['MARKETER', 'MARKETER_INTERNAL', 'MARKETER_EXTERNAL'].some(applicableRole => (agent.roles || []).some(agentRole => agentRole === applicableRole));
      });
      this.filteredTotalRecords = this.filteredList.reduce((prev, val) => prev + val.totalCalls, 0);
      return;
    }

    await this.changeDate();
  }

  async toggleCharts() {
    await this.changeDate(); // calling changeDate() is a hack that can "trick" ChartJS into re-rendering views
  }
}
