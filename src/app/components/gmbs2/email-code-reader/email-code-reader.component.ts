import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from '../../../../environments/environment'
import { GlobalService } from '../../../services/global.service';
import { Helper } from 'src/app/classes/helper';
import { AlertType } from 'src/app/classes/alert-type';
import { CacheService } from 'src/app/services/cache.service';

enum socialMediaLinkTypes {
  FACEBOOK = 'Facebook',
  TWITTER = 'Twitter',
  INSTAGRAM = 'Instagram',
  WECHAT = 'WeChat',
  WHATSAPP = 'Whatsapp'
}

enum redirectTypes {
  BM_Site = 'BM Site',
  Other = 'Other'
}

@Component({
  selector: 'app-email-code-reader',
  templateUrl: './email-code-reader.component.html',
  styleUrls: ['./email-code-reader.component.css']
})

export class EmailCodeReaderComponent implements OnInit {

  @ViewChild('socialMediaLinksModal') socialMediaLinksModal: ModalComponent;
  @ViewChild('redirectModal') redirectModal: ModalComponent;
  
  @Input() readonly = false;
  @Input() restaurant;
  @Input() bmRT;

  submitClicked = false;
  retrievedObj: any;
  apiRequesting = false;

  now = new Date();
  templateNames = [];
  qmButtonTemplate = '';
  isCopiedToClipboard = false;
  showCompleteButtonSnippet = false;
  socialMediaLinks = [{ text: socialMediaLinkTypes.FACEBOOK, value: '' }, { text: socialMediaLinkTypes.TWITTER, value: '' }, { text: socialMediaLinkTypes.INSTAGRAM, value: '' }, { text: socialMediaLinkTypes.WECHAT, value: '' }, { text: socialMediaLinkTypes.WHATSAPP, value: '' }];
  existsSocialMediaLinks = [];
  showDetailSettings = false;
  redirectOptions = [redirectTypes.Other];
  redirectOption = redirectTypes.BM_Site;
  redirect = false;
  EXPIRY_DAYS_THRESHOLD = 60;
  INVOICE_DAYS_THRESHOLD = 30 * 6;
  domainMap;
  googleRank; // show beside with qmenu website
  domainRedirectUrl;
  currDomainRedirectUrl;
  constructor(private _api: ApiService, private _cache: CacheService, private _global: GlobalService) { }

  async ngOnInit() {
    if (this._cache.get('templateNames') && this._cache.get('templateNames').length > 0) {
      this.templateNames = this._cache.get('templateNames');
      return;
    } else {
      this.templateNames = await this._api.get(environment.qmenuApiUrl + 'utils/list-template').toPromise();
      // we like to move Chinese Restaurant Template to top

      const cindex = this.templateNames.indexOf('Chinese Restaurant Template');

      if (cindex > 0) {
        this.templateNames.splice(cindex, 1);
        this.templateNames.unshift('Chinese Restaurant Template');
      }
      this._cache.set('templateNames', this.templateNames, 300 * 60);
    }
    /**
     * this.restaurant.web.socialMediaLinks example:
     * [ {"Facebook": "111"},{"Twitter": "123"}]
     * 
     */
    await this.populateExistingSocialMedia();

  }

  get redirectTypes() {
    return redirectTypes;
  }

  async calcGoogleRank() {
    try {
      this._global.publishAlert(AlertType.Info, 'Scraping...');
      const ranks = await this._api.post(environment.appApiUrl + 'utils/menu', {
        name: 'google-rank',
        payload: {
          restaurantId: this.restaurant._id,
        }
      }).toPromise();
      this.googleRank = ((ranks || []).find(rank => rank.name === 'qmenu') || {}).rank;
      this._global.publishAlert(AlertType.Success, 'Google ranks scraped!');
    } catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, 'Error on retrieving google ranks');
    }
  }

  async populateGoogleRank() {
    const [googleRank] = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: "google-ranks",
      aggregate: [
        {
          $match: {
            restaurantId: this.restaurant._id,
            ranks: {
              $elemMatch: {
                name: 'qmenu'
              }
            },
            "ranks.rank": {
              $exists: true
            }
          }
        },
        {
          $project: {
            rank: {
              $arrayElemAt: [{
                $map: {
                  input: {
                    $filter: {
                      input: '$ranks',
                      as: 'rank',
                      cond: {
                        $eq: ['$$rank.name', 'qmenu']
                      }
                    }
                  },
                  as: 'r',
                  in: '$$r.rank'
                }
              }, 0]
            }
          }
        },
        {
          $sort: {
            _id: -1
          }
        },
        {
          $limit: 1
        }
      ]
    }, 1);
    this.googleRank = (googleRank || {}).rank;
  }

  needToRedirect() {
    const qmenuWebsite = (this.restaurant.web || {}).qmenuWebsite;
    return qmenuWebsite && qmenuWebsite.indexOf('qmenu.us') === -1;
  }

  async populateDomain() {
    // --- domains
    const qmenuWebsite = (this.restaurant.web || {}).qmenuWebsite;
    const rtDomain = qmenuWebsite.replace('http://', '').replace('https://', '').replace('www.', '').replace('/', '');
    const nextCoupleWeeks = new Date();
    nextCoupleWeeks.setDate(nextCoupleWeeks.getDate() + this.EXPIRY_DAYS_THRESHOLD);
    const [domain] = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'domain',
      query: {
        expiry: { $lte: { $date: nextCoupleWeeks } },
        name: { $eq: rtDomain }
      },
      limit: 1
    }, 1);
    if (domain) {
      this.domainMap = {
        _id: domain._id,
        domainName: domain.name,
        domainExpiry: domain.expiry,
        domainStatus: domain.status,
        domainType: domain.type,
        domainAutoRenew: domain.autoRenew,
        restaurantId: this.restaurant._id.toString(),
        restaurantName: this.restaurant.name,
        restaurantAlias: this.restaurant.alias,
        restaurantAddress: this.restaurant.googleAddress.formatted_address,
        restaurantDisabled: this.restaurant.disabled,
        restaurantWeb: this.restaurant.web
      }
      // --- Auto renew conditions
      const reasons = [];
      const domainWhiteList = [
        'myqmenu.com',
        'qdasher.com',
        'qmenu360.com',
        'qmenu365.com',
        'qmenu.biz',
        'qmenu.us',
        'qmenudemo.com',
        'qmenufood.com',
        'qmenuprint.com',
        'qmenuschoice.com',
        'qmenutest.com',
        'qmorders.com',
        '4043829768.com'
      ];
      // --- whitelist 
      if (domainWhiteList.includes(this.domainMap.domainName.replace('http://', '').replace('https://', '').replace('/', ''))) {
        reasons.push('Whitelisted domain');
        this.domainMap.isWhitelistDomain = true;
      }

      // --- rt disabled
      if (this.domainMap.restaurantDisabled && (this.domainMap.restaurantDisabled === true)) {
        reasons.push('Restaurant is disabled');
      }

      if ((this.domainMap.restaurantDisabled && this.domainMap.restaurantDisabled === false) || (!this.domainMap.restaurantDisabled)) {
        reasons.push('Restaurant is enabled');
      }

      // --- insisted website (rt uses its own domain)
      if ((this.domainMap.restaurantWeb || {}).useBizMenuUrl === true) {
        reasons.push('Insisted restaurant');
        this.domainMap.restaurantInsisted = true;
      }

      // --- insisted all
      if ((this.domainMap.restaurantWeb || {}).useBizWebsiteForAll === true) {
        reasons.push('Insisted website for all');
        this.domainMap.restaurantInsistedForAll = true;
      }

      // --- expiry time in upcoming expiryDaysTreshold days
      const now = new Date();
      const expiry = new Date(this.domainMap.domainExpiry);

      const diffTime = expiry.getTime() - now.getTime();
      const diffDays = Math.round(Math.abs(diffTime) / (1000 * 60 * 60 * 24));

      if (diffTime < 0) {
        reasons.push(`Expired ${diffDays} days ago`);
        this.domainMap.expired = true;
      }

      if (diffTime > 0) {
        if (diffDays <= this.EXPIRY_DAYS_THRESHOLD) {
          reasons.push(`Will expire in less than ${diffDays} days`);
          this.domainMap.expired = false;
        } else {
          reasons.push(`Will expire in more than ${diffDays} days`);
          this.domainMap.expired = false;
        }
      }

      // --- no invoices in the past 6 months
      // --- invoices
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setDate(sixMonthsAgo.getDate() - this.INVOICE_DAYS_THRESHOLD);

      const [invoice] = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'invoice',
        query: {
          "restaurant.id": this.restaurant._id,
          toDate: { $gte: { $date: sixMonthsAgo } },
        },
        projection: {
          "restaurant.id": 1,
        },
        limit: 1
      }).toPromise();

      const hasInvoiceInLastMonths = !!invoice;
      if (hasInvoiceInLastMonths) {
        reasons.push(`Have invoices for the past ${this.INVOICE_DAYS_THRESHOLD / 30} months`);
        this.domainMap.hasInvoicesInLast6Months = true;
      } else {
        reasons.push(`Do not have invoices for over ${this.INVOICE_DAYS_THRESHOLD / 30} months`);
        this.domainMap.hasInvoicesInLast6Months = false;
      }

      // --- no matching restaurant
      if (!this.domainMap.restaurantId) {
        reasons.push(`No restaurant linked to this domain`);
      }

      // --- should renew
      if (this.domainMap.restaurantDisabled || this.domainMap.restaurantInsisted || this.domainMap.restaurantInsistedForAll || !this.domainMap.hasInvoicesInLast6Months || !this.domainMap.restaurantId) {
        this.domainMap.shouldRenew = false;
      } else if (this.domainMap.hasInvoicesInLast6Months) {
        this.domainMap.shouldRenew = true;
      }
      this.domainMap.reasons = reasons;
    } else {
      this.domainMap = undefined;
    }
  }

  openRedirectModal() {
    this.redirect = false;
    this.redirectModal.show();
  }

  // change redirect checkbox in redirect modal will call this method 
  onChangeRedirectOtherUrl() {  
    if (this.redirect) {
      if (this.bmRT) {
        this.redirectOption = redirectTypes.BM_Site;
        this.redirectOptions = [redirectTypes.BM_Site, redirectTypes.Other];
        this.domainRedirectUrl = this.bmRT.CustomerDomainName ? this.bmRT.CustomerDomainName : this.bmRT.CustomerDomainName1 ? this.bmRT.CustomerDomainName1 : '';
      } else {
        this.redirectOption = redirectTypes.Other;
        this.redirectOptions = [redirectTypes.Other];
        this.domainRedirectUrl = '';
      }
    }
  }

  // redirect checkbox should be inited rather than set by default
  initRedirectDomainUrl() {
    this.currDomainRedirectUrl = (this.restaurant.web || {}).domainRedirectUrl;
    if (this.bmRT && ((this.bmRT.CustomerDomainName && Helper.areDomainsSame(this.domainRedirectUrl, this.bmRT.CustomerDomainName)) || (this.bmRT.CustomerDomainName1 && Helper.areDomainsSame(this.domainRedirectUrl, this.bmRT.CustomerDomainName1)))) {
      this.redirectOption = redirectTypes.BM_Site;
      this.redirectOptions = [redirectTypes.BM_Site, redirectTypes.Other];
      this.currDomainRedirectUrl = `${this.currDomainRedirectUrl} (BM Site)`;
    } else {
      this.redirectOption = redirectTypes.Other;
    }
  }

  async showRedirectDetailSettings() {
    this.showDetailSettings = !this.showDetailSettings;
    if (this.showDetailSettings) {
      await this.populateGoogleRank();
      await this.populateDomain();
      this.initRedirectDomainUrl();
    } else {
      this.domainMap = undefined;
    }
  }

  async applyAutoRenew(domain, shouldRenew) {
    if (confirm(`Are you sure ?`)) {
      try {
        const payload = {
          domain: domain.domainName,
          shouldRenew
        };

        const result = await this._api.post(environment.appApiUrl + 'utils/renew-aws-domain', payload).toPromise();

        await this._api.patch(environment.qmenuApiUrl + 'generic?resource=domain', [
          {
            old: { _id: domain._id },
            new: { _id: domain._id, autoRenew: shouldRenew },
          }
        ]).toPromise();

        await this.setAlias(domain.restaurantId, domain.restaurantAlias);


        this._global.publishAlert(AlertType.Success, `Domain Rewnewal status for ${domain.domainName} updated successfully.`);
      } catch (error) {
        console.error(error);
        this._global.publishAlert(AlertType.Danger, `Failed to update ${domain.domainName} renewal status.`);
      }
    }
  }

  async setAlias(restaurantId, restaurantAlias) {
    const aliasUrl = environment.customerUrl + '#/' + restaurantAlias;
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [
      {
        old: { _id: restaurantId, web: {} },
        new: { _id: restaurantId, web: { qmenuWebsite: aliasUrl } },
      }
    ]).toPromise();
  }

  async setRedirectUrl() {
    const domainRedirectUrl = this.redirect ? this.domainRedirectUrl : '';
    const restaurantId = this.restaurant._id;
    const urlValidRegex = /http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?/
    if (domainRedirectUrl && !urlValidRegex.test(domainRedirectUrl)) {
      return this._global.publishAlert(AlertType.Danger, 'Please input valid redirected website');
    }

    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [
      {
        old: { _id: restaurantId, web: {} },
        new: { _id: restaurantId, web: { domainRedirectUrl: domainRedirectUrl } },
      }
    ]).toPromise();
    (this.restaurant.web || {}).domainRedirectUrl = domainRedirectUrl;
    this.initRedirectDomainUrl();
  }

  // do an api call to republish website to AWS
  async executeRedirect() {
    if (confirm(`Are you sure ?`)) {
      this.redirectModal.hide();
      // 1. update redirect domain 
      await this.setRedirectUrl();
      // 2. republish to AWS
      if (this.redirect) {
        await this.injectWebsiteAws();
      }
    }
  }

  // need a existing social media link collection to check whether show input using to add media link 
  populateExistingSocialMedia() {
    this.existsSocialMediaLinks = [];
    if (!this.noSocialMediaLinks()) {
      this.restaurant.web.socialMediaLinks.forEach(link => {
        Object.keys(link).forEach(key => {
          if (this.existsSocialMediaLinks.indexOf(key) === -1) {
            this.existsSocialMediaLinks.push(key);
          }
        });
      });
    }
  }

  // Shouldn't show social media link, if it exists in web property of restaurant
  socialMediaLinkExists(linkText) {
    return !this.noSocialMediaLinks() ? this.existsSocialMediaLinks.some(link => link === linkText) : false;
  }

  // restaurant don't have any social media data
  noSocialMediaLinks() {
    return this.restaurant.web ? !this.restaurant.web.socialMediaLinks || (this.restaurant.web.socialMediaLinks && this.restaurant.web.socialMediaLinks.length === 0) : true;
  }

  // open socialLinkModal to add new social media links
  openSocialMediaLinkModal() {
    this.socialMediaLinks.forEach(link => link.value = '');
    this.socialMediaLinksModal.show();
  }

  async onEditSocialMediaLinks(event, field: string) {
    let updatedRT = JSON.parse(JSON.stringify(this.restaurant));
    // update social media links array of web of restaurant
    // update old exsiting one and delete empty value social media links 
    updatedRT.web.socialMediaLinks.forEach(link => {
      let key = Object.keys(link)[0];
      // it will add a "" to value of link,
      // if newValue of event reflecting boolean balue is false, which something is wrong
      if (key === field) {
        link[key] = event.newValue;
      }
    });
    updatedRT.web.socialMediaLinks = updatedRT.web.socialMediaLinks.filter(link => link[Object.keys(link)[0]]);
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
      old: { _id: this.restaurant._id },
      new: { _id: this.restaurant._id, web: updatedRT.web }
    }]).toPromise();

    // update this restaurant local value
    this.restaurant.web.socialMediaLinks = updatedRT.web.socialMediaLinks;
    this.populateExistingSocialMedia();
    this._global.publishAlert(AlertType.Success, 'Updated');

  }

  addSocialMediaLinks() {
    // contruct the social media links array which web property of restaurant need
    let updatedRT = JSON.parse(JSON.stringify(this.restaurant));
    if (this.noSocialMediaLinks()) {
      updatedRT.web.socialMediaLinks = [];
    }
    this.socialMediaLinks.forEach(link => {
      if (link.value) {
        let obj = {};
        obj[link.text] = link.value;
        // keep only unique social media link types
        updatedRT.web.socialMediaLinks.push(obj);
      }
    });
    // update social media links of web of this restaurant 
    this._api
      .patch(environment.qmenuApiUrl + "generic?resource=restaurant", [{
        old: {
          _id: this.restaurant._id
        }, new: {
          _id: this.restaurant._id,
          web: updatedRT.web
        }
      }])
      .subscribe(
        result => {
          // let's update original, assuming everything successful
          this.restaurant.web.socialMediaLinks = updatedRT.web.socialMediaLinks;
          this.populateExistingSocialMedia();
          this._global.publishAlert(
            AlertType.Success,
            "Add social media links successfully"
          );
        },
        error => {
          this._global.publishAlert(AlertType.Danger, "Error updating to DB! " + error.message);
        }
      );
    this.socialMediaLinksModal.hide();
  }

  cancelAddSocialMediaLinks() {
    this.socialMediaLinksModal.hide();
  }

  ngOnChanges() {
    this.qmButtonTemplate = this.getQmenuButtonTemplate(this.restaurant.alias);
  }

  getQmenuButtonTemplate(alias) {
    const fillTemplate = (stringLiteral, alias) => stringLiteral[0] + alias + stringLiteral[1];
    return fillTemplate`
<a style='
font-family: "Segoe UI",Roboto,"Helvetica Neue", Arial,"Noto Sans",sans-serif;
box-sizing: border-box;
text-decoration: none;
display: inline-block;
font-weight: 400;
line-height: 1.5;
overflow: hidden;
user-select: none;
-webkit-tap-highlight-color: transparent;
box-shadow: 0 2px 5px 0 rgba(0,0,0,.16),0 2px 10px 0 rgba(0,0,0,.12);
padding: .84rem 2.14rem;
font-size: .81rem;
transition: color .15s ease-in-out,background-color .15s ease-in-out,border-color .15s ease-in-out,box-shadow .15s ease-in-out;
margin: .375rem;
text-transform: uppercase;
white-space: normal;
background-color: #cd2730!important;
color: #fff;
border-radius: 10em;
cursor: pointer;
background-image: linear-gradient(to right,#cd2730,#fa4b00,#cd2730);' href="https://qmenu.us/#/${alias}">Order Online</a>
`.replace(/\n/g, "");
  }

  copyToClipcboard(text) {
    const handleCopy = (e: ClipboardEvent) => {
      // clipboardData 可能是 null
      e.clipboardData && e.clipboardData.setData('text/plain', text);
      e.preventDefault();
      // removeEventListener 要传入第二个参数
      document.removeEventListener('copy', handleCopy);
    };
    document.addEventListener('copy', handleCopy);
    document.execCommand('copy');
    this.isCopiedToClipboard = true;

    setTimeout(() => {
      this.isCopiedToClipboard = false;
    }, 1000);
  }

  getEmail() {
    if (this.restaurant && this.restaurant.web && this.restaurant.web.qmenuWebsite) {
      const domain = Helper.getTopDomain(this.restaurant.web.qmenuWebsite);
      return 'info@' + domain;
    }
  }

  async populateAlias() {
    const aliasUrl = environment.customerUrl + '#/' + this.restaurant.alias;
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [
      {
        old: { _id: this.restaurant._id, web: {} },
        new: { _id: this.restaurant._id, web: { qmenuWebsite: aliasUrl } },
      }
    ]).toPromise();

    this.restaurant.web = this.restaurant.web || {};
    this.restaurant.web.qmenuWebsite = aliasUrl;

  }

  async clickRetrieve() {
    this.retrievedObj = undefined;
    this.apiRequesting = true;
    this.submitClicked = true;

    try {
      // const result = await this._api.post(environment.autoGmbUrl + 'retrieveGodaddyEmailVerificationCode', { host: host, email: email, password: password }).toPromise();

      const result = await this._api.post(environment.appApiUrl + 'utils/read-godaddy-gmb-pin', { restaurantId: this.restaurant._id }).toPromise();


      this.apiRequesting = false;
      this.retrievedObj = result;
      this.retrievedObj.time = new Date(Date.parse(this.retrievedObj.time));
      this.now = new Date();
    } catch (error) {
      this.apiRequesting = false;
      alert('Error retrieving email');
    }
  }

  async onEdit(event, field: string) {
    const oldWeb = {};
    const newWeb = {};
    oldWeb[field] = event.oldValue;

    const newValue = (event.newValue || '').trim();

    if (field === 'qmenuPop3Password' && !this.restaurant.web.qmenuWebsite) {
      this._global.publishAlert(AlertType.Danger, 'Error: no qMenu managed website found. Please enter managed website before entering a password');
      return;
    }
    if (field === 'qmenuWebsite' && newValue) {
      try {
        await this._api.get(environment.appApiUrl + 'utils/check-url?url=' + newValue).toPromise();
      } catch {
        this._global.publishAlert(AlertType.Danger, 'Error: Please enter a valid qMenu managed website URL');
        return;
      }
    }

    try {
      newWeb[field] = newValue;
      if (field === 'qmenuPop3Password' && event.newValue && event.newValue.length < 20) {
        // reset password:
        alert("pop3 email is obsolete")
      }

      if (field === 'qmenuWebsite') {
        newWeb[field] = newWeb[field].toLowerCase();
      }

      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: { _id: this.restaurant._id, web: oldWeb },
        new: { _id: this.restaurant._id, web: newWeb }
      }]).toPromise();

      // update this object
      this.restaurant.web = this.restaurant.web || {};
      this.restaurant.web[field] = newWeb[field];

      this._global.publishAlert(AlertType.Success, 'Updated');
    } catch (error) {
      this._global.publishAlert(AlertType.Danger, error);
    }
  }

  async injectWebsite() {

    try {
      const domain = Helper.getTopDomain(this.restaurant.web.qmenuWebsite);
      const templateName = this.restaurant.web.templateName;

      if (!templateName || !domain) {
        return this._global.publishAlert(AlertType.Danger, 'Missing template name or website');
      }

      if (domain.indexOf('qmenu.us') >= 0) {
        return this._global.publishAlert(AlertType.Danger, 'Failed. Can not inject qmenu');
      }

      await this._api.post(environment.qmenuApiUrl + 'utils/publish-template', {
        domain: domain,
        templateName: this.restaurant.web.templateName,
        restaurantId: this.restaurant._id
      }).toPromise();
      this._global.publishAlert(AlertType.Success, 'Success');

    } catch (error) {
      this._global.publishAlert(AlertType.Danger, 'Failed: ' + JSON.stringify(error));
    }
  }

  async injectWebsiteAws() {

    try {
      const domain = Helper.getTopDomain(this.restaurant.web.qmenuWebsite);
      const templateName = this.restaurant.web.templateName;

      if (!templateName || !domain) {
        return this._global.publishAlert(AlertType.Danger, 'Missing template name or website');
      }

      if (domain.indexOf('qmenu.us') >= 0) {
        return this._global.publishAlert(AlertType.Danger, 'Failed. Can not inject qmenu');
      }

      await this._api.post(environment.qmenuApiUrl + 'utils/publish-website-s3', {
        domain: domain,
        templateName: this.restaurant.web.templateName,
        restaurantId: this.restaurant._id
      }).toPromise();
      this._global.publishAlert(AlertType.Success, 'Success');

      //Invalidate the domain cloudfront
      try {
        const result = await this._api.post(environment.appApiUrl + 'events', [{ queueUrl: `https://sqs.us-east-1.amazonaws.com/449043523134/events-v3`, event: { name: "invalidate-domain", params: { domain: domain } } }]).toPromise();
      } catch (error) {
        this._global.publishAlert(AlertType.Danger, JSON.stringify(error));
      }

    } catch (error) {
      this._global.publishAlert(AlertType.Danger, 'Failed: ' + JSON.stringify(error));
    }
  }

  domain;

  async createWebsite() {
    const domain = (this.domain || "").trim().toLowerCase();
    const templateName = this.restaurant.web.templateName;
    const restaurantId = this.restaurant._id;
    console.log(domain);
    console.log(templateName);
    console.log(restaurantId);
    if (!domain || !templateName || !restaurantId) {
      return alert('Need Domain Name and Website Template');
    }

    const postBody = {
      templateName: 'create-website',
      inputs: { domain, restaurantId, templateName }
    };
    console.log(postBody);
    const result = await this._api.post(environment.appApiUrl + 'workflows/templates', postBody).toPromise();

    alert('Workflow created! Please visit workflows to start.');

  }

  async syncGmb(categories) {
    try {
      await this._api.post(environment.appApiUrl + "gmb/generic", {
        name: "sync-one-rt",
        payload: {
          "rtId": this.restaurant._id,
          ...categories ? { categories: categories } : {},
          forceRecent: true,
          syncDisabled: true
        }
      }).toPromise();
      this._global.publishAlert(AlertType.Success, 'Synced');
    }
    catch (error) {
      console.error(`Error. Couldn't sync GMB`, error);
      return false;
    }
  }

}

