
import { Component, OnInit, ViewChild, ViewChildren } from '@angular/core';
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";
import { Gmb } from '../../../classes/gmb';
import { Business } from '../../../classes/business';
import { OwnershipRequest } from '../../../classes/ownership-request';
import { Observable } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { Restaurant } from '@qmenu/ui';
import { PostcardAction } from '../../../classes/postcard-action';

@Component({
  selector: 'app-gmb-dashboard',
  templateUrl: './gmb-dashboard.component.html',
  styleUrls: ['./gmb-dashboard.component.scss']
})
export class GmbDashboardComponent implements OnInit {

  @ViewChild('gmbEditingModal') gmbEditingModal;
  @ViewChild('gmbCopyToModal') gmbCopyToModal;
  @ViewChildren('gmbCards') gmbCards;
  @ViewChild('gmbViewContactModal') gmbViewContactModal;

  contactRestaurant: Restaurant;
  contactBiz: Business;

  gmbInEditing: Gmb = new Gmb();
  apiError = undefined;

  filterAccount;
  filterBusiness;

  now = new Date();

  myGmbs: Gmb[] = [];

  copyData = {} as any;
  copyTargetEmail;
  updatedGMB = [];

  tabs = ["All", "Red", "Lost", "Postcard Not Notified", "Postcard Not Cleared", "Tools"];
  activeTab = "All"
  constructor(private _api: ApiService, private _global: GlobalService) { }

  get redOnly() {
    return this.activeTab === 'Red';
  }

  get lostOnly() {
    return this.activeTab === 'Lost'
  }

  ngOnInit() {

    // this._api.get(environment.qmenuApiUrl + "generic", {
    //   resource: "gmb",
    //   limit: 5000
    // })
    //   .subscribe(
    //     gmbs => {
    //       this.myGmbs = gmbs.map(g => new Gmb(g)).sort((g1, g2) => g1.email > g2.email ? 1 : -1);
    //     },
    //     error => {
    //       this._global.publishAlert(AlertType.Danger, error);
    //     }
    //   );
    this._api.get(environment.legacyApiUrl + 'gmb').subscribe(
      gmbs => {
        this.myGmbs = gmbs.map(g => new Gmb(g)).sort((g1, g2) => g1.email > g2.email ? 1 : -1);
      },
      error => {
        alert('API Error.');
      }
    );

    setInterval(() => { this.now = new Date(); }, 60000);
  }

  getBizFilter() {
    return (biz: Business) => {
      return (
        (!this.filterBusiness || biz.name.toLocaleLowerCase().indexOf(this.filterBusiness.toLowerCase()) >= 0)
        && (!this.redOnly || biz.getStatus(this.now) === 'danger')
        && (!this.lostOnly || this.getLostBusinessAddresses().has(biz.address))
        && (this.activeTab !== 'Postcard Not Notified' || biz.postcardActions && biz.postcardActions.length === 1)
        && (this.activeTab !== 'Postcard Not Cleared' || biz.postcardActions && biz.postcardActions.length > 0)
      );
    }
  }

  setActiveTab(tab) {
    this.activeTab = tab;
  }

  getStatOfPublished() {
    const published = [];
    const unpublished = [];
    (this.myGmbs || []).map(gmb => {
      (gmb.businesses || []).map(biz => {
        if (biz.isPublished) {
          published.push(biz.address);
        } else {
          unpublished.push(biz.address);
        }
      });
    });
    // remove lost ownership ones
    const lostOwnership = unpublished.filter(a1 => !published.some(a2 => a1 === a2));
    return {
      published: new Set(published).size,
      lostOwnership: new Set(lostOwnership).size
    };
    // return (this.myGmbs || []).reduce((sum, gmb) => sum + (gmb.businesses || []).reduce((subsum, biz) => subsum + (biz.isPublished ? 0 : 1), 0), 0);
  }

  getFilteredGmbs() {
    let lostAddresses = new Set();
    if (this.lostOnly) {
      lostAddresses = this.getLostBusinessAddresses();
    }

    return this.myGmbs.filter(gmb => {
      const filterAccount = this.filterAccount === undefined || this.filterAccount === null || this.filterAccount.length === 0 || gmb.email.toLowerCase().indexOf(this.filterAccount.toLowerCase()) >= 0;
      const filterBiz = (this.filterBusiness === undefined || this.filterBusiness === null || this.filterBusiness.length === 0) || (gmb.businesses.some(biz => biz.name.toLowerCase().indexOf(this.filterBusiness.toLowerCase()) >= 0));
      const filterRed = (!this.redOnly || gmb.businesses.some(biz => biz.getStatus(this.now) === 'danger'));
      const filterLost = (!this.lostOnly || gmb.businesses.some(biz => lostAddresses.has(biz.address)));
      const filterPostcardNotNotified = (this.activeTab !== 'Postcard Not Notified' || gmb.businesses.some(biz => biz.postcardActions && biz.postcardActions.length === 1));
      const filterPostcardNotCleared = (this.activeTab !== 'Postcard Not Cleared' || gmb.businesses.some(biz => biz.postcardActions && biz.postcardActions.length > 0));
      return filterAccount && filterBiz && filterRed && filterLost && filterPostcardNotNotified && filterPostcardNotCleared;
    });
  }

  getLostBusinessAddresses() {
    const published = [];
    const unpublished = [];
    (this.myGmbs || []).map(gmb => {
      (gmb.businesses || []).map(biz => {
        if (biz.isPublished) {
          published.push(biz.address);
        } else {
          unpublished.push(biz.address);
        }
      });
    });
    // remove lost ownership ones
    return new Set(unpublished.filter(a1 => !published.some(a2 => a1 === a2)));
  }

  getFilteredAndSortedGmbs() {
    const filteredGmbs = this.getFilteredGmbs();
    return filteredGmbs.sort((g1, g2) => g1.email > g2.email ? 1 : -1);
  }

  addNew() {
    this.apiError = undefined;
    this.gmbInEditing = {} as Gmb;
    this.gmbEditingModal.show();
  }

  edit(gmb) {
    this.apiError = undefined;
    this.gmbInEditing = gmb;
    this.gmbEditingModal.show();
  }

  done(gmb) {
    this.apiError = undefined;
    if (gmb.id) {
      this.update(gmb);
    } else {

      this._api.post(environment.legacyApiUrl + 'gmb', gmb).subscribe(
        result => {
          this.myGmbs.unshift(new Gmb(result));
          this.gmbEditingModal.hide();
        },
        error => {
          this.apiError = 'API Error. Status code: ' + error.status;
          console.log(error);
        }
      );
    }
  }

  onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
  }

  update(gmb) {
    this.updatedGMB = this.updatedGMB.filter(this.onlyUnique);

    this._api.put(environment.legacyApiUrl + 'gmb/' + gmb.id, gmb).subscribe(
      result => {
        // replace same id instance
        for (let i = this.myGmbs.length - 1; i >= 0; i--) {
          if (this.myGmbs[i].id === result.id) {
            this.myGmbs[i] = new Gmb(result);
          }
        }
        // in case we have editor popup
        this.gmbEditingModal.hide();
      },
      error => {
        this.apiError = 'API Error. Status code: ' + error.status;
        console.log(error);
      }
    );
  }
  cancel() {
  }

  onDelete(gmb) {
    this.apiError = undefined;
    this._api.delete(environment.legacyApiUrl + 'gmb/' + gmb.id).subscribe(
      result => {
        this.myGmbs = this.myGmbs.filter(g => g.id !== result.id);
        this.gmbEditingModal.hide();
      },
      error => {
        this.apiError = 'API Error. Status code: ' + error.status;
        console.log(error);
      }
    );
  }

  copyBusiness(data) {
    this.copyData = data;
    this.gmbCopyToModal.show();
  }

  getCopyTargets() {
    const list = this.myGmbs.filter(gmb => this.copyData.gmb && gmb.email !== this.copyData.gmb.email && !(gmb.businesses || []).some(b => b.name === this.copyData.business.name && b.address === this.copyData.business.address)).map(g => g.email).sort();
    list.unshift('');
    return list;
  }

  submitCopy() {
    this.myGmbs
      .filter(gmb => gmb.email === this.copyTargetEmail)
      .map(gmb => {
        const biz = new Business(this.copyData.business);
        // clear all existing requests
        biz.ownershipRequests = [];
        // set to unpublished status
        biz.isPublished = false;

        gmb.businesses.push(biz);
        this.update(gmb);
      });
    this.gmbCopyToModal.hide();
  }

  businessEmailUpdated(business) {
    this.myGmbs
      .map(gmb => {
        let updated = false;
        gmb.businesses.map(biz => {
          if (biz.equals(business)) {
            biz.pop3Email = business.pop3Email;
            biz.pop3Host = business.pop3Host;
            biz.pop3Password = business.pop3Password;
            biz.zipcode = business.zipcode;
            updated = true;
          }
        });
        if (updated) {
          this.update(gmb);
        }
      });
  }

  scanPublished(gmb) {
    return new Promise((resolve, reject) => {
      this._api
        .post('http://localhost:3000/retrieveGmbLocations', { email: gmb.email, password: gmb.password })
        .subscribe(
          result => {
            // keep only published
            result = result.filter(pl => pl.status.indexOf('Published') === 0);
            this.updatePublishedLocations(gmb, result.map(b => new Business(b)));
            resolve();
          },
          error => {
            // we also resolve to keep going
            resolve(error);
            console.log(error);
          });
    });
  }

  updatePublishedLocations(gmb, publishedLocations: any[]) {
    gmb.businesses.map(biz => {
      publishedLocations.map(pbiz => {
        if (pbiz.equals(biz)) {
          biz.homepage = pbiz.homepage;
        }
      });
    });
    // update published status
    gmb.businesses.map(biz => {
      biz.isPublished = publishedLocations.some(p => p.name === biz.name && biz.phone === p.phone);
    });

    // insert of it's not in
    publishedLocations.map(p => {
      if (!gmb.businesses.some(biz => biz.name === p.name && biz.phone === p.phone)) {
        const business = new Business();
        business.name = p.name;
        business.phone = p.phone;
        business.homepage = p.homepage;
        business.address = p.address;
        business.isPublished = true;
        gmb.businesses.push(business);
      }
    });


    this.updatedGMB.push(gmb.email);

    this.update(gmb);
  }

  removeSpecialCharacters(input: string) {
    return input.replace(/[^a-zA-Z ]/g, "").replace(/\s/g, "");
  }

  scanEmail(gmb) {
    return new Promise((resolve, reject) => {
      this._api
        .post('http://localhost:3000/retrieveGmbRequests', { email: gmb.email, password: gmb.password, stayAfterScan: false })
        .subscribe(
          result => {
            // convert to OwnershipRequest type and remove isReminder!
            const requests: OwnershipRequest[] = result.map(r => new OwnershipRequest(r)); //.filter(r => !r.isReminder);

            // find reminders that have NO previous requests (within 7 days!)
            //let or = new OwnershipRequest();
            const eightDays = 8 * 24 * 3600 * 1000;
            const noPreviousRequestReminders =
              requests.filter(r1 =>
                r1.isReminder
                && !(
                  requests.some(r2 =>
                    r1 !== r2
                    && !r2.isReminder
                    && r1.email === r2.email
                    && r1.business === r2.business
                    && r1.date && r2.date
                    && (r1.date.valueOf() - r2.date.valueOf() > 0)
                    && (r1.date.valueOf() - r2.date.valueOf() < eightDays)))
                && !(
                  gmb.businesses && gmb.businesses.some(biz => biz.ownershipRequests && biz.ownershipRequests.some(r2 =>
                    r1 !== r2
                    && !r2.isReminder
                    && r1.email === r2.email
                    && r1.business === r2.business
                    && r1.date && r2.date
                    && (r1.date.valueOf() - r2.date.valueOf() > 0)
                    && (r1.date.valueOf() - r2.date.valueOf() < eightDays))))
              );
            // keep only the oldest one
            for (let i = noPreviousRequestReminders.length - 1; i >= 0; i--) {
              const r1 = noPreviousRequestReminders[i];
              for (let j = 0; j < noPreviousRequestReminders.length; j++) {
                const r2 = noPreviousRequestReminders[j];
                if (r1 !== r2 && r1.business === r2.business && r1.email && r2.email && r1.date && r2.date && r1.date > r2.date) {
                  noPreviousRequestReminders.splice(i, 1);
                  break;
                }
              }
            }

            const finalRequests = requests.filter(r => !r.isReminder || noPreviousRequestReminders.indexOf(r) >= 0);

            this.updateOwnershipRequests(gmb, finalRequests);
            resolve();
          },
          error => {
            // we still resolve to keep things going
            resolve(error);
            console.log(error);
          });
    });
  }

  updateOwnershipRequests(gmb, requests: OwnershipRequest[]) {

    requests.map(r => {
      gmb.businesses
        .filter(b => this.removeSpecialCharacters(b.name.toLowerCase()) === this.removeSpecialCharacters(r.business.toLowerCase()))
        .map(b => {
          b.ownershipRequests = b.ownershipRequests || [];
          // skip if exists, otherwise insert!!!
          if (!b.ownershipRequests.some(oldR => r.date.valueOf() === oldR.date.valueOf() && r.email === oldR.email)) {
            b.ownershipRequests.push(r);
          }
        });
    });

    // we'd better sort by date asending
    gmb.businesses.map(biz => {
      biz.ownershipRequests = biz.ownershipRequests || [];
      biz.ownershipRequests = biz.ownershipRequests.sort((or1, or2) => or1.date.valueOf() - or2.date.valueOf());
    });

    this.updatedGMB.push(gmb.email);
    this.update(gmb);
  }

  updateAll() {
    const o = new Observable();
    this.myGmbs.reduce((p: any, gmb) => p.then(() => this.scanPublished(gmb)).then(() => this.scanEmail(gmb)), Promise.resolve());
  }

  viewContact(biz: Business) {
    this.contactBiz = biz;
    this.gmbViewContactModal.show();
    // get all users
    this._api.get(environment.qmenuApiUrl + 'generic',
      {
        resource: 'restaurant',
        query: {
          'phones.phoneNumber': biz.phone
        },
        projection: {
          name: 1,
          people: 1,
          channels: 1,
          phones: 1
        },
        limit: 1
      }).subscribe(
        restaurants => {
          this.contactRestaurant = restaurants[0];
        },
        error => {
          this.contactRestaurant = undefined;
          this._global.publishAlert(AlertType.Danger, 'Error querying restaurant with phone ' + biz.phone);
        });
  }

  postcardRequested(biz: Business) {
    biz.postcardActions = [{
      time: new Date(),
      action: 'Requested'
    }];
    this.myGmbs.map(gmb => {
      if (gmb.businesses.some(b => b === biz)) {
        this.update(gmb);
      }
    });
  }

  postcardNotified(biz: Business) {
    biz.postcardActions = biz.postcardActions || [];
    biz.postcardActions.push(
      {
        time: new Date(),
        action: 'Notified'
      }
    );
    this.myGmbs.map(gmb => {
      if (gmb.businesses.some(b => b === biz)) {
        this.update(gmb);
      }
    });
  }
  postcardCleared(biz: Business) {
    biz.postcardActions = undefined;
    this.myGmbs.map(gmb => {
      if (gmb.businesses.some(b => b === biz)) {
        this.update(gmb);
      }
    });
  }

  countAll() {

  }

  countRed() {

  }

  countLost() {

  }

  countPostcardNotCleared() {
    this.myGmbs.reduce((sum, gmb) => sum + gmb.businesses.reduce((subtotal, biz) => subtotal + ((biz.postcardActions && biz.postcardActions.length > 0) ? 1 : 0), 0), 0);
  }

  countPostcardNotNotified() {
    // if there is only one postcard action, we assume it's not notified
    this.myGmbs.reduce((sum, gmb) => sum + gmb.businesses.reduce((subtotal, biz) => subtotal + ((biz.postcardActions && biz.postcardActions.length === 1) ? 1 : 0), 0), 0);

  }


}
