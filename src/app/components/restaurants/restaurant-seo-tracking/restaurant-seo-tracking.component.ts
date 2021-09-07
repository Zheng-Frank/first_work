import { Input, ViewChild } from '@angular/core';
import { Component, OnInit } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { AlertType } from '../../../classes/alert-type';
import { ApiService } from '../../../services/api.service';
import { GlobalService } from '../../../services/global.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-restaurant-seo-tracking',
  templateUrl: './restaurant-seo-tracking.component.html',
  styleUrls: ['./restaurant-seo-tracking.component.css']
})
export class RestaurantSeoTrackingComponent implements OnInit {

  @Input() restaurant: Restaurant;
  @ViewChild('scrapeModal') scrapeModal;
  specificColumnDescriptors = [
    {
      label: 'Provider'
    },
    {
      label: 'Old Ranking',
    },
    {
      label: 'New Ranking',
    },
    {
      label: 'Up/Down',
    },
  ];
  specificRankingRows = [];
  filterSpecificRankingRows = [];
  ranks = [];
  startDates = [];
  endDates = [];
  startDate: string = '';
  endDate: string = '';
  providers = [];
  createdAts = [];
  constructor(private _api: ApiService, private _global: GlobalService) { }

  async ngOnInit() {
    await this.populateGoogleRanks();
    await this.calcRankRowsByDate();
  }

  async populateGoogleRanks() {
    this.specificRankingRows = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
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
    this.specificRankingRows.sort((a, b) => new Date(a.createdAt).valueOf() - new Date(b.createdAt).valueOf());

    // ISO date is 'yyyy-MM-DDThh:mm:ss.msmsmsZ'
    // if the script run in a day, it should adapt yyyy-MM-DD
    this.specificRankingRows.forEach(row => row.createdAt = (row.createdAt || '').split('T')[0]);
    this.specificRankingRows.forEach(row => {
      if (this.createdAts.indexOf(row.createdAt) === -1) {
        this.createdAts.push(row.createdAt);
      }
    });
    if (this.createdAts.length > 1) {
      this.startDates = this.createdAts;
      this.endDates = Object.assign(this.endDates, this.createdAts);
      this.endDates.shift();
    }

    this.specificRankingRows.forEach(row => {
      row.ranks.forEach(rank => {
        if (rank.name && this.providers.indexOf(rank.name) === -1) {
          this.providers.push(rank.name);
        }
      });
    });
    this.startDate = this.startDates[0];
    this.endDate = this.endDates[0];
  }

  calcRankRowsByDate() {
    if (this.startDates.length >= 1 && this.endDates.length >= 1) {
      if (new Date(this.startDate).valueOf() > new Date(this.endDate).valueOf()) {
        return this._global.publishAlert(AlertType.Danger, 'Start date must be earlier than end date!');
      }
      this.filterSpecificRankingRows.length = 0;
      this.providers.forEach(provider => {
        let obj = {
          provider: '',
          oldRanking: 0,
          newRanking: 0,
          upDown: ''
        }
        obj.provider = provider;
        let startDateRanks = [];
        this.specificRankingRows.filter(row => row.createdAt === this.startDate).forEach(row => (row.ranks || []).forEach(rank => {
          if (rank.name === provider) {
            startDateRanks.push(rank);
          }
        }));
        let endDateRanks = [];
        this.specificRankingRows.filter(row => row.createdAt === this.endDate).forEach(row => (row.ranks || []).forEach(rank => {
          if (rank.name === provider) {
            endDateRanks.push(rank);
          }
        }));
        startDateRanks.sort((a, b) => a.rank - b.rank);
        endDateRanks.sort((a, b) => a.rank - b.rank);
        obj.oldRanking = startDateRanks[0] && startDateRanks[0].rank ? startDateRanks[0].rank : 'N/A';
        obj.newRanking = endDateRanks[0] && endDateRanks[0].rank ? endDateRanks[0].rank : 'N/A';
        if (isNaN(obj.oldRanking) || isNaN(obj.newRanking)) {
          obj.upDown = 'N/A';
        } else {
          obj.upDown = obj.oldRanking - obj.newRanking+"";
        }
        this.filterSpecificRankingRows.push(obj);
      });
    } else { // the data in database of the ranks of this restaurant is only a day.
      this.providers.forEach(provider => {
        let obj = {
          provider: '',
          oldRanking: 0,
          newRanking: 0,
          upDown: '0'
        }
        obj.provider = provider;
        let providersRanks = [];
        this.specificRankingRows.forEach(row => (row.ranks || []).forEach(rank => {
          if (rank.name === provider) {
            providersRanks.push(rank);
          }
        }));
        providersRanks.sort((a, b) => a.rank - b.rank);
        obj.oldRanking = obj.newRanking = providersRanks[0] && providersRanks[0].rank ? providersRanks[0].rank : 'N/A';
        if (isNaN(obj.oldRanking)) {
          obj.upDown = 'N/A';
        }
        this.filterSpecificRankingRows.push(obj);
      });
    }
    this.filterSpecificRankingRows = this.filterSpecificRankingRows.filter(row=>!(row.oldRanking === 'N/A' && row.newRanking === 'N/A'));
    this.filterSpecificRankingRows.sort((a, b) => a.newRanking - b.newRanking);
  }

  async scrape() {
    try {
      this._global.publishAlert(AlertType.Info, 'Scraping...');
      const ranks = await this._api.post(environment.appApiUrl + 'utils/menu', {
        name: 'google-rank',
        payload: {
          restaurantId: this.restaurant._id,
        }
      }).toPromise();
      this.ranks = ranks;
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
    let qmenuRank = this.filterSpecificRankingRows.find(rank => rank.provider === 'qmenu');
    if (qmenuRank && qmenuRank.newRanking && qmenuRank.oldRanking) {
      let deltaRank = qmenuRank.oldRanking - qmenuRank.newRanking;

      if (deltaRank === 0) {
        return 'qMenu: keep ranking';
      } else if (deltaRank < 0) {
        return 'qMenu: moved down by ' + Math.abs(deltaRank);
      } else if(deltaRank > 0){
        return 'qMenu: moved up by ' + Math.abs(deltaRank);
      }
    } else {
      return `Rank of qMenu can't be calculated because missing oldRanking or new Ranking.`;
    }
  }
}
