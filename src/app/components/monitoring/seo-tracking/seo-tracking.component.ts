import {environment} from 'src/environments/environment';
import {ApiService} from '../../../services/api.service';
import {Component, OnInit} from '@angular/core';
import {GlobalService} from '../../../services/global.service';
import {AlertType} from '../../../classes/alert-type';

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

  viewType = ViewTypes.Summary;
  summaryDates = [];
  summaryStartDate: string;
  summaryEndDate: string;
  specDates = [];
  specStartDate: string;
  specEndDate: string;
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

  async rtIDChange() {
    this.specDates = [];
    this.specStartDate = "";
    this.specEndDate = "";
  }

  async ngOnInit() {
    await this.getSummaryDates();
    await this.querySummary();
  }

  async getSummaryDates() {
    let result = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'google-ranks',
      aggregate: [
        {$match: {'ranks.0': {$exists: true}}},
        {
          $group: {
            _id: {$dateToString: {format: '%Y-%m-%d', date: '$createdAt'}},
            rts: {$addToSet: "$restaurantId"}
          },
        },
        {$project: {date: "$_id", _id: 0, cnt: {$size: "$rts"}}},
        {$match: {'cnt': {$gte: 9000}}},
        {$project: {date: 1}},
        {$sort: {date: 1}}
      ]
    }).toPromise();
    this.summaryDates = result.map(x => x.date);
    this.summaryStartDate = this.summaryDates[0];
    this.summaryEndDate = this.summaryDates[this.summaryDates.length - 1];
  }

  async getSpecificRTDates() {
    let [result] = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'google-ranks',
      aggregate: [
        {$match: {'ranks.0': {$exists: true}, restaurantId: this.restaurantId}},
        {$group: {_id: null, creationDates: {$addToSet: {$dateToString: {format: '%Y-%m-%d', date: '$createdAt'}}}}},
        {$project: {creationDates: '$creationDates', _id: 0}}
      ]
    }).toPromise();
    if (result) {
      this.specDates = result.creationDates.sort((a, b) => new Date(a).valueOf() - new Date(b).valueOf());
      this.specStartDate = this.specDates[0];
      this.specEndDate = this.specDates[this.specDates.length - 1];
    }
  }

  async querySummary() {
    let data = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'google-ranks',
      aggregate: [
        {$match: {'ranks.0': {$exists: true}}},
        {$addFields: {'creationDate': {$dateToString: {format: '%Y-%m-%d', date: '$createdAt'}}}},
        {$match: {creationDate: {$in: [this.summaryStartDate, this.summaryEndDate]}}},
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
    let startRanks = (data.find(x => x.date === this.summaryStartDate) || {ranks: []}).ranks;
    let endRanks = (data.find(x => x.date === this.summaryEndDate) || {ranks: []}).ranks;
    let allRanks = [...startRanks, ...endRanks];
    // @ts-ignore
    let ranks = Array.from(new Set(allRanks.map(x => x.value))).sort((a, b) => a - b);
    this.allRTsRankChangeList = ranks.map((r, i) => {
      let startCounts = startRanks.filter(x => x.value === r).length;
      let endCounts = endRanks.filter(x => x.value === r).length;
      let change = endCounts - startCounts;
      return {
        rank: r, startCounts, endCounts, change: change > 0 ? '+' + change : change.toString()
      };
    });
    let startAvg = startRanks.reduce((a, c) => a + c.value, 0) / startRanks.length;
    let endAvg = endRanks.reduce((a, c) => a + c.value, 0) / endRanks.length;
    this.summary.avgRanking = `${isNaN(startAvg) ? "N/A" : startAvg.toFixed(2)} to ${isNaN(endAvg) ? 'N/A' : endAvg.toFixed(2)}`;

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
          this.summary.totalMovesDown += change;
        } else if (change < 0) {
          this.summary.totalMovesUp += -change;
        }
        this.summary.netTotalMoves += -change;
      }
    });
  }

  async querySpecific() {
    if (!this.restaurantId) {
      this._global.publishAlert(AlertType.Warning, 'Please input a restaurant id!');
      return;
    }
    this.qMenuChange = '';
    if (!this.specDates.length) {
      await this.getSpecificRTDates();
    }
    let data = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'google-ranks',
      aggregate: [
        {$match: {restaurantId: this.restaurantId, 'ranks.0': {$exists: true}}},
        {$addFields: {'creationDate': {$dateToString: {format: '%Y-%m-%d', date: '$createdAt'}}}},
        {$match: {creationDate: {$in: [this.specStartDate, this.specEndDate]}}},
        {$project: {ranks: 1, date: '$creationDate'}},
      ]
    }).toPromise();
    let earliest = data.find(x => x.date === this.specStartDate);
    let oldRanks = earliest ? earliest.ranks : [];
    let latest = data.find(x => x.date === this.specEndDate);
    let newRanks = latest ? latest.ranks : [];
    let providers = [...new Set(data.reduce((a, c) => ([...a, ...c.ranks.map(r => r.name)]), []))];
    this.allProvidersRankChangeList = providers.filter(p => !!p).map((p, i) => {
      let oldRank = oldRanks.find(r => r.name === p);
      let newRank = newRanks.find(r => r.name === p);
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
  }
}
