import { Component, OnInit, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { Gmb } from '../../../classes/gmb';
import { Business } from '../../../classes/business';
import { OwnershipRequest } from '../../../classes/ownership-request';
import { Observable } from 'rxjs';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-gmb-card',
  templateUrl: './gmb-card.component.html',
  styleUrls: ['./gmb-card.component.css']
})
export class GmbCardComponent implements OnInit {
  @ViewChild('verificationCodeModal') verificationCodeModal;
  @Input() now = new Date();
  @Input() gmb: Gmb;
  @Input() lostBusinessAddresses: Set<string> = new Set();
  @Input() allGmbs: Gmb[] = [];
  
  @Input() nameFilter;
  @Input() redOnly = false;
  @Input() lostOnly = false;

  @Input() bizFilter: any;

  @Output() onEdit = new EventEmitter();
  @Output() onUpdate = new EventEmitter();
  @Output() onCopyBusiness = new EventEmitter();
  @Output() onBusinessEmailUpdate = new EventEmitter<Business>();
  @Output() onViewContact = new EventEmitter();
  @Output() onPostcardRequested = new EventEmitter();
  @Output() onPostcardNotified = new EventEmitter();
  @Output() onPostcardCleared = new EventEmitter();

  @ViewChild('businessEditingModal') businessEditingModal;

  scanning = false;

  businessInEditing: Business = new Business();

  expandedBusinesses = [];

  // last retrieved verification email
  verification: any = {};

  constructor(private _api: ApiService) { }

  ngOnInit() {
    // refresh 'now' every 10 minutes
    setInterval(() => { this.now = new Date(); }, 1000 * 60 * 10);
  }

  viewContact(biz) {
    this.onViewContact.emit(biz);
  }

  isBizVisible(biz) {
    return this.bizFilter(biz);
  }

  isBizVisibleOld(biz) {
    return (this.nameFilter === undefined || this.nameFilter === null || this.nameFilter.length === 0 || biz.name.toLowerCase().indexOf(this.nameFilter.toLowerCase()) >= 0)
      && (!this.redOnly || biz.getStatus(this.now) === 'danger')
      && (!this.lostOnly || this.lostBusinessAddresses.has(biz.address));
  }

  toggleExpanded(biz: Business) {
    if (this.isExpanded(biz)) {
      this.expandedBusinesses = this.expandedBusinesses.filter(b => b.name !== biz.name);
    } else {
      this.expandedBusinesses.push(biz);
    }

  }

  getPublishedGmbAccount(address) {
    return this.allGmbs.find(gmb => (gmb.businesses || []).some(biz => biz.address === address && biz.isPublished)) || {};
  }

  isExpanded(biz: Business) {
    return this.expandedBusinesses.indexOf(biz) >= 0;
  }

  getSortedBusinesses(gmb: Gmb) {
    return (gmb.businesses || []).sort((b1, b2) => b1.name + b1.address > b2.name + b2.address ? 1 : -1);
  }

  getDaysAgo(date: Date) {
    return Math.round(Math.abs(this.now.valueOf() - date.valueOf()) / 8.64e7);
  }

  edit() {
    this.onEdit.emit(JSON.parse(JSON.stringify(this.gmb)));
  }

  emailTokens() {
    return (this.gmb.email || '').split('@');
  }

  getUnhandledRequests(biz: Business) {
    return (biz.ownershipRequests || []).filter(r => !r.isHandled);
  }

  getHandledRequests(biz: Business) {
    return (biz.ownershipRequests || []).filter(r => r.isHandled);
  }

  shouldShowMark(biz: Business, request: OwnershipRequest) {
    return !(biz.isPublished && this.getDaysAgo(request.date) < 9);
  }

  removeSpecialCharacters(input: string) {
    return input.replace(/[^a-zA-Z ]/g, "").replace(/\s/g, "");
  }

  scan() {
    this.scanning = true;
    this._api
      .post('http://localhost:3000/retrieveGmbRequests', { email: this.gmb.email, password: this.gmb.password, stayAfterScan: true })
      .subscribe(
        result => {
          this.scanning = false;
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
                this.gmb.businesses.some(biz => biz.ownershipRequests.some(r2 =>
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
          this.updateOwnershipRequests(finalRequests);
        },
        error => {
          this.scanning = false;
          alert('Error Scanning Email');
          console.log(error);
        });
  }

  editBusiness(biz: Business) {
    this.businessInEditing = new Business(biz);
    // let's give a good suggestion to start with first
    if (biz.homepage) {
      const matches = biz.homepage.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i);
      const domain = matches && matches[1];
      if (domain) {
        const topDomain = domain.split('.').slice(-2).join('.');
        this.businessInEditing.pop3Host = this.businessInEditing.pop3Host || 'mail.' + topDomain;
        this.businessInEditing.pop3Email = this.businessInEditing.pop3Email || 'info@' + topDomain;
      }
    }
    // force user to input a password
    this.businessInEditing.pop3Password = '';
    this.businessEditingModal.show();
  }

  doneEditingBusiness(business: Business) {
    // // replace existing business and do an update
    // this.gmb.businesses.map((biz, index, self) => {
    //   if (biz.equals(business) {
    //     self[index] = business;
    //   }
    // });
    // this.businessEditingModal.hide();
    // this.persist();
    this.businessEditingModal.hide();
    this.onBusinessEmailUpdate.emit(business);
  }

  refreshPublished() {
    //
    this.scanning = true;
    this._api
      .post('http://localhost:3000/retrievePublishedGmbLocations', { email: this.gmb.email, password: this.gmb.password })
      .subscribe(
        result => {
          this.scanning = false;
          this.updatePublishedLocations(result.map(b => new Business(b)));
        },
        error => {
          this.scanning = false;
          alert('Error Scanning Published Locations');
          console.log(error);
        });
  }

  updateOwnershipRequests(requests: OwnershipRequest[]) {

    requests.map(r => {
      this.gmb.businesses
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
    this.gmb.businesses.map(biz => {
      biz.ownershipRequests = biz.ownershipRequests || [];
      biz.ownershipRequests = biz.ownershipRequests.sort((or1, or2) => or1.date.valueOf() - or2.date.valueOf());
    });

    this.persist();
  }

  updatePublishedLocations(publishedLocations: any[]) {
    this.gmb.businesses.map(biz => {
      publishedLocations.map(pbiz => {
        if (pbiz.equals(biz)) {
          biz.homepage = pbiz.homepage;
        }
      });
    });
    // update published status
    this.gmb.businesses.map(biz => {
      biz.isPublished = publishedLocations.some(p => p.equals(biz));
    });

    // insert of it's not in
    publishedLocations.map(p => {
      if (!this.gmb.businesses.some(biz => biz.equals(p))) {
        const business = new Business();
        business.name = p.name;
        business.phone = p.phone;
        business.homepage = p.homepage;
        business.address = p.address;
        business.isPublished = true;
        this.gmb.businesses.push(business);
      }
    });
    this.persist();
  }

  persist() {
    this.onUpdate.emit(this.gmb);
  }

  canMarkAsHandled(biz: Business) {
    return (biz.ownershipRequests || []).some(r => !r.isHandled);
  }

  readEmail(biz: Business) {
    this.verification = {};
    this._api
      .post('http://localhost:3000/retrieveGodaddyEmailVerificationCode', { host: biz.pop3Host, email: biz.pop3Email, password: biz.pop3Password })
      .subscribe(
        result => {

          this.verification = {
            mismatch: biz.name !== result.name,
            business: result.name,
            minutesAgo: Math.floor((new Date().valueOf() - new Date(result.time).valueOf()) / (1000 * 60)),
            code: result.code,
            email: result.email
          };
          // alert(
          //   +
          //   'Time: ' + timeString + '\n' +
          //   'Biz: ' + result.name + '\n\n\n' +
          //   'Code: ' + result.code + '\n\n\n' +
          //   'GMB: ' + result.email);
          this.verificationCodeModal.show();
        },
        error => {
          this.verificationCodeModal.show();
          this.verification = {
            error: error._body
          };
          console.log(error);
        });
  }

  markAsHandled(biz: Business) {
    (biz.ownershipRequests || []).map(r => r.isHandled = true);
    this.persist();
  }

  markRequestAsHandled(request: OwnershipRequest) {
    request.isHandled = true;
    this.persist();
  }
  copyTo(biz) {
    this.onCopyBusiness.emit({ business: biz, gmb: this.gmb });
  };

  deleteFromListing(biz) {
    this.gmb.businesses = this.gmb.businesses.filter(b => b.name !== biz.name || b.address !== biz.address);
    this.persist();
  }
  deleteOwnership(biz) {
    this._api
      .post('http://localhost:3000/removeBusiness', { email: this.gmb.email, password: this.gmb.password, businessName: biz.name })
      .subscribe(
        result => {
          alert('Deleted');
        },
        error => {
          alert('FAILED\n' + error._body);
          console.log(error);
        });
  };
  requestOwnership(biz) {
    this._api
      .post('http://localhost:3000/requestOwnership', {
        email: this.gmb.email,
        password: this.gmb.password,
        businessName: biz.name,
        zipcode: biz.zipcode,
        pop3Email: biz.pop3Email,
        pop3Host: biz.pop3Host,
        pop3Password: biz.pop3Password
      })
      .subscribe(
        result => {
          alert('done');
        },
        error => {
          alert('FAILED\n' + error._body);
          console.log(error);
        });
  };

  postcardRequested(biz) {
    this.onPostcardRequested.emit(biz);
  }
  postcardNotified(biz) {
    this.onPostcardNotified.emit(biz);
  }
  postcardCleared(biz) {
    this.onPostcardCleared.emit(biz);
  }
  
}
