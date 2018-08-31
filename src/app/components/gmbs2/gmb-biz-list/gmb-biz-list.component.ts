import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { GmbBiz } from '../../../classes/gmb/gmb-biz';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { GmbAccount } from '../../../classes/gmb/gmb-account';
import { GlobalService } from '../../../services/global.service';
import { AlertType } from '../../../classes/alert-type';
import { zip } from 'rxjs';
import { FormEvent } from '@qmenu/ui';
import { mergeMap } from 'rxjs/operators';
import { GmbService } from '../../../services/gmb.service';

interface myBiz {
  gmbBiz: GmbBiz;
  owned?: boolean;
  ownershipPercentage?: number;
  lostDate?: Date;
  transfers?: string; // A <- B <- C
}

@Component({
  selector: 'app-gmb-biz-list',
  templateUrl: './gmb-biz-list.component.html',
  styleUrls: ['./gmb-biz-list.component.css']
})
export class GmbBizListComponent implements OnInit {
  @ViewChild('bizEditingModal') bizEditingModal;

  bizList: GmbBiz[] = [];
  myEmails: string[] = [];

  searchFilter;
  websiteUpdateNeeded = false;

  filteredMyBizList: myBiz[] = [];

  refreshing = false;
  crawling = false;

  now = new Date();

  processingBizSet = new Set<any>();

  bizInEditing: GmbBiz;
  apiError;

  myColumnDescriptors = [
    {
      label: "Name",
      paths: ['gmbBiz', 'name'],
      sort: (a, b) => a.toLowerCase() > b.toLowerCase() ? 1 : (a.toLowerCase() < b.toLowerCase() ? -1 : 0)
    },
    {
      label: "Score",
      paths: ['gmbBiz', 'score'],
      sort: (a, b) => (a || 0) > (b || 0) ? 1 : ((a || 0) < (b || 0) ? -1 : 0)
    },
    {
      label: "Possessed"
    },
    {
      label: "Accounts",
      paths: ['transfers'],
      sort: (a, b) => (a || 0) > (b || 0) ? 1 : ((a || 0) < (b || 0) ? -1 : 0)
    },
    {
      label: "GMB"
    },
    {
      label: "Website"
    },
    {
      label: "Crawled",
      paths: ['gmbBiz', 'crawledAt'],
      sort: (a1, a2) => (a1 || new Date(0)).valueOf() - (a2 || new Date(0)).valueOf()
    },
    {
      label: "Actions"
    }
  ];

  constructor(private _api: ApiService, private _global: GlobalService, private _gmb: GmbService) {
    this.refresh();
  }
  ngOnInit() {
  }

  refresh() {
    this.now = new Date();
    this.refreshing = true;
    zip(
      this._api.get(environment.adminApiUrl + "generic", {
        resource: "gmbBiz",
        limit: 5000
      }),
      this._api.get(environment.adminApiUrl + "generic", {
        resource: "gmbAccount",
        projection: {
          email: 1
        },
        limit: 5000
      })
    )
      .subscribe(
        results => {
          this.refreshing = false;
          this.bizList = results[0].map(b => new GmbBiz(b)).sort((g1, g2) => g1.name > g2.name ? 1 : -1);
          this.myEmails = results[1].map(account => account.email);
          this.filterBizList();
        },
        error => {
          this.refreshing = false;
          this._global.publishAlert(AlertType.Danger, error);
        }
      );
  }

  getEncodedGoogleSearchString(gmbBiz: GmbBiz) {
    return encodeURI(gmbBiz.name + ' ' + gmbBiz.address);
  }

  debounce(event) {
    this.filterBizList();
  }

  filterBizList() {
    const start = new Date();
    let filteredBizList = this.bizList;
    if (this.searchFilter) {
      filteredBizList = this.bizList
        .filter(biz => (
          // search name
          biz.name.toLowerCase().indexOf(this.searchFilter.toLowerCase()) >= 0)

          // search phone
          || (biz.phone || '').indexOf(this.searchFilter) === 0

          // search account
          || (biz.gmbOwnerships || []).some(o => (o.email || '').indexOf(this.searchFilter) === 0)
        );
    }



    this.filteredMyBizList = filteredBizList.map(biz => ({
      gmbBiz: biz,
      transfers: (biz.gmbOwnerships || []).map(o => (o.email || 'N/A').split('@')[0]).reverse().join('←'),
      owned: biz.hasOwnership(this.myEmails),
      ownershipPercentage: ((biz) => {
        let possesedTime = 1;
        let nonPossesedTime = 1000;
        for (let i = 0; i < (biz.gmbOwnerships || []).length; i++) {
          const owned = this.myEmails.indexOf(biz.gmbOwnerships[i].email) >= 0;
          const nextStart = i < biz.gmbOwnerships.length - 1 ? biz.gmbOwnerships[i + 1].possessedAt : new Date();
          const span = nextStart.valueOf() - biz.gmbOwnerships[i].possessedAt.valueOf();
          possesedTime += owned ? span : 0;
          nonPossesedTime += owned ? 0 : span;
        }
        return Math.round(possesedTime * 100 / (possesedTime + nonPossesedTime));
      })(biz),
      lostDate: (biz.hasOwnership(this.myEmails) || !biz.gmbOwnerships || biz.gmbOwnerships.length === 0) ? undefined : biz.gmbOwnerships[biz.gmbOwnerships.length - 1].possessedAt
    }));

    if (this.websiteUpdateNeeded) {
      this.filteredMyBizList = this.filteredMyBizList.filter(b => b.gmbBiz.gmbOwner !== 'qmenu' && b.owned);
    }

    console.log(new Date().valueOf() - start.valueOf());
  }

  async crawlAll() {
    this.crawling = true;

    // we'd like to crawl from most outdate ones
    const sortedBizList = this.filteredMyBizList.sort((a1, a2) => (a1.gmbBiz.crawledAt || new Date(0)).valueOf() - (a2.gmbBiz.crawledAt || new Date(0)).valueOf());

    for (let b of sortedBizList) {
      try {
        let result = await this.crawl(b.gmbBiz);
      } catch (error) {
        console.log(error);
        this._global.publishAlert(AlertType.Danger, 'Error crawling ' + b.gmbBiz.name);
      }
    }
    this.crawling = false;
  }

  async crawl(biz) {
    try {
      this.processingBizSet.add(biz);
      console.log(this.processingBizSet);
      let result = await this._gmb.crawlOneGoogleListing(biz);
      this.now = new Date();
      this.processingBizSet.delete(biz);
      this._global.publishAlert(AlertType.Success, 'Updated ' + biz.name);
    } catch (error) {
      console.log(error);
      this.processingBizSet.delete(biz);
      this._global.publishAlert(AlertType.Danger, 'Error crawling ' + biz.name);
    }
  }

  isProcessing(biz) {
    return this.processingBizSet.has(biz);
  }

  getLogo(gmbBiz) {
    return GlobalService.serviceProviderMap[gmbBiz.gmbOwner];
  }

  edit(biz) {

    this.apiError = undefined;
    // make a copy of biz instead to avoid mutation
    this.bizInEditing = new GmbBiz(biz);
    // we need to remove pop3 password
    delete this.bizInEditing.qmenuPop3Password;

    this.bizEditingModal.show();
  }

  cancel() {
    this.bizEditingModal.hide();
  }

  done(event: FormEvent) {
    const biz = event.object as GmbBiz;
    this.apiError = undefined;
    this._api.post(environment.autoGmbUrl + 'encrypt', { email: biz.qmenuPop3Email || 'n/a', password: biz.qmenuPop3Password || 'n/a' }).pipe(mergeMap(result => {
      const oldBiz = JSON.parse(JSON.stringify(this.bizList.filter(b => b._id === biz._id)[0]));
      const updatedBiz = JSON.parse(JSON.stringify(biz));
      // depends on if we are updating password
      delete oldBiz.qmenuPop3Password;
      delete updatedBiz.qmenuPop3Password;

      if (biz.qmenuPop3Password) {
        updatedBiz.qmenuPop3Password = result;
      }

      if (biz._id) {
        return this._api.patch(environment.adminApiUrl + "generic?resource=gmbBiz", [{ old: oldBiz, new: updatedBiz }]);
      } else {
        return this._api.post(environment.adminApiUrl + 'generic?resource=gmbBiz', [updatedBiz]);
      }

    })).subscribe(
      result => {
        event.acknowledge(null);
        this.refresh();
        this.bizEditingModal.hide();
      },
      error => {
        this.apiError = 'Possible: no Auto-GMB server running';
        event.acknowledge(error.message || 'API Error.');
        console.log(error);
      }
    );
  }

  remove(event: FormEvent) {
    const gmbBiz = event.object;
    this._api.delete(environment.adminApiUrl + 'generic', {
      resource: 'gmbBiz',
      ids: [gmbBiz._id]
    }).subscribe(
      result => {
        event.acknowledge(null);
        this.bizList = this.bizList.filter(b => b._id !== gmbBiz._id);
        this.filterBizList();
        this.bizEditingModal.hide();
      },
      error => {
        event.acknowledge(error.message || 'API Error.');
        this.apiError = 'API Error. Status code: ' + error.statusText;
        console.log(error);
      }
    );
  }

  async inject(biz) {
    try {
      await this._gmb.updateGmbWebsite(biz);
      this._global.publishAlert(AlertType.Success, 'Updated ' + biz.name);
    } catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, 'Erro Updating ' + biz.name + ', ' + error);
    }
  }

  private injectOne(gmbBiz) {
    let email = gmbBiz.gmbOwnerships.map(o => o.email).filter(email => email.indexOf('@') > 0).reverse()[0];
    if (!email) {
      return Promise.reject('No email');
    }


    console.log(email);
    console.log(gmbBiz);
    // return new Promise((resolve, reject) => {
    //   this.processingBizSet.add(biz);
    //   // 1. need to get last good qmenu account
    //   // 2. 
    //   this._api.post(
    //     'http://localhost:3000/updateWebsite', {
    //       email: results[0][0].email,
    //       password: results[0][0].password,
    //       website: results[1][0].qmenuWebsite,
    //       appealId: this.transfer.appealId
    //     }
    //   ).subscribe(
    //     ok => resolve(),
    //     error => reject(error)
    //   );
    // });
  }

}
