import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {Restaurant} from '@qmenu/ui';
import {AlertType} from '../../../classes/alert-type';
import {ApiService} from '../../../services/api.service';
import {GlobalService} from '../../../services/global.service';
import {environment} from '../../../../environments/environment';

@Component({
  selector: 'app-restaurant-seo-tracking',
  templateUrl: './restaurant-seo-tracking.component.html',
  styleUrls: ['./restaurant-seo-tracking.component.css']
})
export class RestaurantSeoTrackingComponent implements OnInit {

  @Input() restaurant: Restaurant;
  @ViewChild('scrapeModal') scrapeModal;
  cols = [
    {label: 'Provider'},
    {label: 'Old Ranking'},
    {label: 'New Ranking'},
    {label: 'Up/Down'},
  ];
  list = [];
  rows = [];
  ranks = [];
  startDate = '';
  endDate = '';
  providers = [];
  dates = [];
  constructor(private _api: ApiService, private _global: GlobalService) { }

  async ngOnInit() {
    await this.populateGoogleRanks();
    await this.calcRankRowsByDate();
  }

  async populateGoogleRanks() {
    this.list = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: "google-ranks",
      query: {
        restaurantId: this.restaurant._id,
        ranks: {
          $exists: true,
          $ne: []
        },
        "ranks.rank": {
          $exists: true
        }
      },
      projection: {
        ranks: 1,
        createdAt: 1
      }
    }, 500);
    this.list.sort((a, b) => new Date(a.createdAt).valueOf() - new Date(b.createdAt).valueOf());

    this.dates = Array.from(new Set(this.list.map(x => x.createdAt.split('T')[0])));
    this.providers = Array.from(new Set(this.list.reduce((a, c) => a.concat((c.ranks || []).map(r => r.name).filter(x => !!x)), [])));
    this.startDate = this.dates[0];
    this.endDate = this.dates[this.dates.length - 1];
  }

  calcRankRowsByDate() {
    if (new Date(this.startDate).valueOf() > new Date(this.endDate).valueOf()) {
      return this._global.publishAlert(AlertType.Danger, 'Start date must be earlier than end date!');
    }
    let startRanks = this.list.filter(x => x.createdAt.split('T')[0] === this.startDate).pop() || {ranks: []};
    let endRanks = this.list.filter(x => x.createdAt.split('T')[0] === this.endDate).pop() || {ranks: []};
    this.rows = this.providers.map(p => {
      let startRank = startRanks.ranks.find(r => r.name === p);
      let endRank = endRanks.ranks.find(r => r.name === p);
      let item = {
        provider: p, change: 0 as string|number,
        oldRanking: startRank ? startRank.rank : 'N/A',
        newRanking: endRank ? endRank.rank : 'N/A'
      };
      item.change = -(item.newRanking - item.oldRanking);
      if (Number.isNaN(item.change)) {
        item.change = 'N/A';
      }
      return item;
    });
  }

  async scrape() {
    try {
      this._global.publishAlert(AlertType.Info, 'Scraping...');
      this.ranks = await this._api.post(environment.appApiUrl + 'utils/menu', {
        name: 'google-rank',
        payload: {
          restaurantId: this.restaurant._id,
        }
      }).toPromise();
      this.scrapeModal.show();
      this._global.publishAlert(AlertType.Success, 'Google ranks scraped!');
    } catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, 'Error on retrieving google ranks');
    }
  }
  // do following things:
  // 1. hide modal
  // 2. rescan table
  async closeScrapeModal() {
    this.scrapeModal.hide();
    await this.populateGoogleRanks();
    await this.calcRankRowsByDate();
  }

  getqMenuCondition() {
    let qmenuRank = this.rows.find(rank => rank.provider === 'qmenu');
    if (qmenuRank && Number.isInteger(qmenuRank.change)) {
      let { change } = qmenuRank;
      if (change === 0) {
        return 'qMenu: keep ranking';
      } else if (change < 0) {
        return 'qMenu: moved down by ' + (-change);
      } else if (change > 0) {
        return 'qMenu: moved up by ' + change;
      }
    } else {
      return `Rank of qMenu can't be calculated because missing oldRanking or new Ranking.`;
    }
  }
}
