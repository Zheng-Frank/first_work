import { Component, OnInit, Input, ViewChild  } from '@angular/core';
import { GmbBiz } from '../../../classes/gmb/gmb-biz';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { GmbAccount } from '../../../classes/gmb/gmb-account';
import { GlobalService } from '../../../services/global.service';
import { AlertType } from '../../../classes/alert-type';
import { zip } from 'rxjs';
import { FormEvent } from '@qmenu/ui';
import { mergeMap } from 'rxjs/operators';

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
      label: "Updated"
    },
    {
      label: "Actions"
    }
  ];

  constructor(private _api: ApiService, private _global: GlobalService) {
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

  debounce(event) {
    this.filterBizList();
  }

  filterBizList() {
    let filteredBizList = this.bizList;
    if (this.searchFilter) {
      filteredBizList = this.bizList
        .filter(biz => (
          // search name
          biz.name.toLowerCase().indexOf(this.searchFilter.toLowerCase()) >= 0)

          // search phone
          || biz.phone.indexOf(this.searchFilter) === 0

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
  }

  async crawlAll() {
    this.crawling = true;
    for (let biz of this.bizList) {
      try {
        let result = await this.crawlOne(biz);
        this.patchGmbBiz(biz, result);
      } catch (error) {
        this._global.publishAlert(AlertType.Danger, 'Error crawling ' + biz.name);
      }
    }
    this.crawling = false;
  }

  private crawlOne(biz) {
    // let's ALLWAYS resolve to not blocking sequencial requesting
    return new Promise((resolve, reject) => {
      this.processingBizSet.add(biz);
      this._api
        .get(environment.adminApiUrl + "utils/scan-gmb", {
          q: [biz.name, biz.address].join(" ")
        })
        .subscribe(result => {
          this.processingBizSet.delete(biz);
          resolve(result);
        }, error => {
          this.processingBizSet.delete(biz);
          reject(error);
        });
    });
  }

  isProcessing(biz) {
    return this.processingBizSet.has(biz);
  }

  patchGmbBiz(gmbBiz: GmbBiz, crawledResult) {

    const kvps = ['place_id', 'cid', 'gmbOwner', 'gmbOpen', 'gmbWebsite', 'menuUrls'].map(key => ({ key: key, value: crawledResult[key] }));

    // if gmbWebsite belongs to qmenu, we assign it to qmenuWebsite
    if (crawledResult['gmbOwner'] === 'qmenu') {
      kvps.push({ key: 'qmenuWebsite', value: crawledResult['gmbWebsite'] });
    }
    // let's just override!
    const oldBiz = { _id: gmbBiz._id };
    const newBiz = { _id: gmbBiz._id };
    kvps.map(kvp => newBiz[kvp.key] = kvp.value);

    this._api
      .patch(environment.adminApiUrl + "generic?resource=gmbBiz", [{ old: oldBiz, new: newBiz }])
      .subscribe(result => {
        this._global.publishAlert(AlertType.Success, 'Updated ' + gmbBiz.name);

        // update gmbBiz!
        kvps.map(kvp => gmbBiz[kvp.key] = kvp.value);
        gmbBiz.updatedAt = new Date();
      }, error => {
        this._global.publishAlert(AlertType.Danger, 'Error updating ' + gmbBiz.name);
      });
  }

  getLogo(gmbBiz) {
    return GlobalService.serviceProviderMap[gmbBiz.gmbOwner];
  }

  edit(bizObj) {

    this.apiError = undefined;
    // make a copy of biz instead to avoid mutation
    this.bizInEditing = new GmbBiz(bizObj.gmbBiz);
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
    this._api.post(environment.autoGmbUrl + 'encrypt', {email: biz.qmenuPop3Email || 'n/a', password: biz.qmenuPop3Password || 'n/a'}).pipe(mergeMap(result => {
      const oldBiz = JSON.parse(JSON.stringify(this.bizList.filter(b => b._id === biz._id)[0]));
      const updatedBiz = JSON.parse(JSON.stringify(biz));
      // depends on if we are updating password
      delete oldBiz.qmenuPop3Password;
      delete updatedBiz.qmenuPop3Password;

      if(biz.qmenuPop3Password) {
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
}
