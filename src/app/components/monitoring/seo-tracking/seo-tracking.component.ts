import {environment} from 'src/environments/environment';
import {ApiService} from '../../../services/api.service';
import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {GlobalService} from '../../../services/global.service';
import {AlertType} from '../../../classes/alert-type';
import {Chart} from 'chart.js';

enum ViewTypes {
  Summary = 'Summary',
  Specific = 'Specific Restaurant'
}

@Component({
  selector: 'app-seo-tracking',
  templateUrl: './seo-tracking.component.html',
  styleUrls: ['./seo-tracking.component.css']
})
export class SeoTrackingComponent implements OnInit {

  @ViewChild('specificChart') specificChart: ElementRef;
  @ViewChild('summaryChart') summaryChart: ElementRef;
  viewType = ViewTypes.Summary;
  dates = [];
  startDate: string;
  endDate: string;
  providers = [
    'atmenu', ' beyondmenu', 'bobog', 'brygid', 'carte24', 'chinesemenu',
    'chinesemenuonline', 'chowbus', 'chownow', 'clorder', 'doordash',
    'eat365', 'eatstreet', 'etapthru', 'foodonlineservice', 'gmenu', 'grubhub',
    'hanyi', 'imenu', 'mealhi5', 'menufreezone', 'menufy', 'menupages', 'menupix',
    'menusifu', 'menustar', 'opendining', 'ordereze', 'orderingspace', 'ordersnapp',
    'pringleapi', 'qmenu', 'redpassion', 'restaurantji', 'seamless', 'simplemenu',
    'slicelife', 'ubereats', ' vrindi', 'yelp', 'zmenu', 'facebook'
  ];
  provider = 'qmenu';
  restaurantId = '';
  allRTsRankChangeList = [];
  allProvidersRankChangeList = [];
  summary = {
    totalMovesUp: 0,
    totalMovesDown: 0,
    netTotalMoves: 0,
    avgRanking: '0 to 0'
  };
  qMenuChange = '';
  colors = [
    '#26B669', '#469177', '#58E0AD', '#579DE5', '#FFD126', '#EE9C4D', '#26C9C9', '#7587A2', '#B4DE41', '#2CAAA9', '#A98AF8', '#7075B9'
  ];
  charts = {summary: null, specific: null};

  constructor(private _api: ApiService, private _global: GlobalService) {
  }

  get viewTypes() {
    return ViewTypes;
  }

  async ngOnInit() {
    await this.getDates();
  }

  async getDates(restaurantId?) {
    let filter = {$match: {'ranks.0': {$exists: true}}};
    if (restaurantId) {
      // @ts-ignore
      filter.$match.restaurantId = restaurantId;
    }
    let [result] = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'google-ranks',
      aggregate: [
        filter,
        {$group: {_id: null, creationDates: {$addToSet: {$dateToString: {format: '%Y-%m-%d', date: '$createdAt'}}}}},
        {$project: {creationDates: '$creationDates', _id: 0}}
      ],
      limit: 1
    }).toPromise();
    if (result) {
      this.dates = result.creationDates.sort((a, b) => new Date(a).valueOf() - new Date(b).valueOf());
      this.endDate = this.dates[this.dates.length - 1];
      this.startDate = this.dates[this.dates.length - 7];
    }
  }

  getRangedDates() {
    let startIndex = this.dates.indexOf(this.startDate),
      endIndex = this.dates.indexOf(this.endDate);
    return this.dates.slice(startIndex, endIndex + 1);
  }

  async querySummary(dates) {
    this.summary.totalMovesDown = 0;
    this.summary.totalMovesUp = 0;
    this.summary.netTotalMoves = 0;
    this.summary.avgRanking = '0 to 0';
    let data = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'google-ranks',
      aggregate: [
        {$match: {'ranks.0': {$exists: true}}},
        {$addFields: {'creationDate': {$dateToString: {format: '%Y-%m-%d', date: '$createdAt'}}}},
        {$match: {creationDate: {$in: dates}}},
        {
          $project: {
            rank: {
              $arrayElemAt: [{
                $map: {
                  input: {
                    $filter: {
                      input: '$ranks',
                      as: 'rank',
                      cond: {$eq: ['$$rank.name', this.provider]}
                    },
                  },
                  as: 'item',
                  in: '$$item.rank'
                }
              }, 0]
            },
            rtId: '$restaurantId',
            createdAt: '$creationDate'
          }
        },
        {$match: {rank: {$ne: null}}},
        {$group: {_id: {createdAt: '$createdAt', rtId: '$rtId'}, rank: {$last: '$rank'}}},
        {$group: {_id: '$_id.createdAt', ranks: {$push: {value: '$rank', rtId: '$_id.rtId'}}}},
        {$project: {date: '$_id', ranks: 1, _id: 0}}
      ]
    }).toPromise();
    let startRanks = (data.find(x => x.date === this.startDate) || {ranks: []}).ranks;
    let endRanks = (data.find(x => x.date === this.endDate) || {ranks: []}).ranks;
    let allRanks = [...startRanks, ...endRanks];
    let datasets = [];
    // @ts-ignore
    let ranks = Array.from(new Set(allRanks.map(x => x.value))).sort((a, b) => a - b);
    this.allRTsRankChangeList = ranks.map((r, i) => {
      let startCounts = startRanks.filter(x => x.value === r).length;
      let endCounts = endRanks.filter(x => x.value === r).length;
      let change = endCounts - startCounts;
      let color = this.colors[i];
      datasets.push({
        fill: false, borderColor: color,
        backgroundColor: color, label: r,
        data: dates.map(d => {
          return (data.find(x => x.date === d) || {ranks: []}).ranks.filter(x => x.value === r).length;
        })
      });
      return {
        rank: r, startCounts, endCounts, change: change > 0 ? '+' + change : change.toString()
      };
    });
    let startAvg = startRanks.reduce((a, c) => a + c.value, 0) / startRanks.length;
    let endAvg = endRanks.reduce((a, c) => a + c.value, 0) / endRanks.length;
    this.summary.avgRanking = `${startAvg.toFixed(2)} to ${endAvg.toFixed(2)}`;

    let dict = {} as { rtId: { start: number, end: number } };
    startRanks.forEach(r => {
      dict[r.rtId] = {start: r.value};
    });
    endRanks.forEach(r => {
      if (dict[r.rtId]) {
        dict[r.rtId].end = r.value;
      }
    });
    Object.values(dict).forEach(v => {
      if (v.start && v.end) {
        let change = v.end - v.start;
        if (change > 0) {
          this.summary.totalMovesUp += change;
        } else if (change < 0) {
          this.summary.totalMovesDown += change;
        }
        this.summary.netTotalMoves += change;
      }
    });
    this.refreshChart(this.summaryChart.nativeElement, dates, datasets);
  }

  async querySpecific(dates) {
    if (!this.restaurantId) {
      this._global.publishAlert(AlertType.Warning, 'Please input a restaurant id!');
      return;
    }
    this.qMenuChange = '';
    let data = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'google-ranks',
      aggregate: [
        {$match: {restaurantId: this.restaurantId, 'ranks.0': {$exists: true}}},
        {$addFields: {'creationDate': {$dateToString: {format: '%Y-%m-%d', date: '$createdAt'}}}},
        {$match: {creationDate: {$in: dates}}},
        {$project: {ranks: 1, date: '$creationDate'}},
      ]
    }).toPromise();
    let earliest = data.find(x => x.date === this.startDate);
    let oldRanks = earliest ? earliest.ranks : [];
    let latest = data.find(x => x.date === this.endDate);
    let newRanks = latest ? latest.ranks : [];
    let datasets = [], providers = [...new Set(data.reduce((a, c) => ([...a, ...c.ranks.map(r => r.name)]), []))];
    this.allProvidersRankChangeList = providers.filter(p => !!p).map((p, i) => {
      let oldRank = oldRanks.find(r => r.name === p);
      let newRank = newRanks.find(r => r.name === p);
      let color = this.colors[i];
      datasets.push({
        fill: false, borderColor: color,
        backgroundColor: color, label: p,
        data: dates.map(d => {
          let ranks = (data.find(x => x.date === d) || {ranks: []}).ranks;
          let item = ranks.find(r => r.name === p);
          return item ? item.rank : null;
        })
      });
      let temp = {
        provider: p, change: '',
        oldRanking: oldRank ? oldRank.rank : 'N/A',
        newRanking: newRank ? newRank.rank : 'N/A',
      };
      if (Number.isInteger(temp.oldRanking) && Number.isInteger(temp.newRanking)) {
        let diff = temp.newRanking - temp.oldRanking;
        if (diff > 0) {
          temp.change = `+${diff}`;
        } else {
          temp.change = diff.toString();
        }
      } else {
        temp.change = 'N/A';
      }
      if (p === 'qmenu') {
        if (temp.change === 'N/A' || temp.change === '0') {
          this.qMenuChange = '';
        } else {
          let [sign, num] = temp.change.split("");
         this.qMenuChange = {"+": "up", '-': 'down'}[sign] + ' by ' + num;
        }
      }
      return temp;
    });
    this.refreshChart(this.specificChart.nativeElement, dates, datasets);
  }

  refreshChart(el, dates, datasets) {
    this.charts.specific = new Chart(el, {
      options: {
        responsive: true,
        tooltips: {mode: 'index', intersect: false},
        stacked: false,
      },
      type: 'line',
      data: {labels: dates, datasets}
    });
  }

  async query() {
    let dates = this.getRangedDates();
    if (dates.length > 7) {
      this._global.publishAlert(AlertType.Warning, "Only support 7 days query at most");
      return;
    }

    if (this.viewType === ViewTypes.Specific) {
      await this.querySpecific(dates);
    } else {
      await this.querySummary(dates);
    }
  }

}
