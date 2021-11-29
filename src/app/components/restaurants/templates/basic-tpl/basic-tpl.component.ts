import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {ApiService} from 'src/app/services/api.service';
import {environment} from 'src/environments/environment';
import {Helper} from 'src/app/classes/helper';
import {GlobalService} from 'src/app/services/global.service';
import {AlertType} from 'src/app/classes/alert-type';
import {HttpClient} from '@angular/common/http';
import {CacheService} from 'src/app/services/cache.service';
import {CrawlTemplateService} from '../../../../services/crawl-template.service';

@Component({
  selector: 'app-basic-tpl',
  templateUrl: './basic-tpl.component.html',
  styleUrls: ['./basic-tpl.component.css']
})
export class BasicTplComponent implements OnInit {

  @Input() restaurantId: String;

  @ViewChild('addLinkModal') addLinkModal;
  @ViewChild('editLinkModal') editLinkModal;
  @ViewChild('deleteLinkModal') deleteLinkModal;

  @ViewChild('deleteHeaderSliderImageModal') deleteHeaderSliderImageModal;

  templateNames = [];
  currentTemplateName = '';

  navBarLinks = [{ label: '', url: '' }];
  headerSliderImages = [];

  sectionATitle = '';
  sectionAslogan = '';
  sectionBTitle = '';
  SectionBImageCaption1 = '';
  SectionBImageCaption2 = '';
  SectionBImageCaption3 = '';
  sectionCTitle1 = '';
  sectionCTitle2 = '';
  sectionCTitle3 = '';
  sectionDTitle = '';
  sectionDSubtext = '';
  sectionElinkText = '';
  sectionEphone = '';
  privacyPolicyText;
  privacyPolicyLink;

  isCustomTemplate = false;

  specialtyImages = [];
  promoImages = [];

  link = { label: '', url: '' };

  headerImage;
  headerImageIndexToDelete = 0;

  specialtyImage;
  promoImage;

  restaurant;

  constructor(private _api: ApiService,
              private _crawl: CrawlTemplateService,
              private _global: GlobalService,
              private _http: HttpClient,
              private _cache: CacheService) { }

  ngOnInit() {
    this.refresh().then(() => {
      this.republishToAWS();
    });
    this.refreshTemplateList();
  }

  async refreshTemplateList() {
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
  }

  async refresh() {
    // Get most recent version of restaurant
    [this.restaurant] = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        _id: { $oid: this.restaurantId }
      },
      projection: {}
    }).toPromise();

    this.currentTemplateName = this.restaurant.web.templateName;

    this.navBarLinks = this.restaurant.web.template.navbar.links;
    this.headerSliderImages = this.restaurant.web.template.headerSlider;
    this.specialtyImages = (this.restaurant.web.template.specialties || []).map(img => {
      if (img.startsWith('/assets')) {
        return `https://${this.restaurant.web.qmenuWebsite.replace('http://', '').replace('https://', '').replace('/', '')}${img}`;
      } else {
        return img;
      }
    });

    this.promoImages = (this.restaurant.web.template.promos || []).map(img => {
      if (img.startsWith('/assets')) {
        return `https://${this.restaurant.web.qmenuWebsite.replace('http://', '').replace('https://', '').replace('/', '')}${img}`;
      } else {
        return img;
      }
    });

    this.sectionATitle = this.desanitizeText(this.restaurant.web.template.sectionATitle);
    this.sectionAslogan = this.desanitizeText(this.restaurant.web.template.sectionAslogan);
    this.sectionBTitle = this.desanitizeText(this.restaurant.web.template.sectionBTitle);
    this.SectionBImageCaption1 = this.desanitizeText(this.restaurant.web.template.SectionBImageCaption1);
    this.SectionBImageCaption2 = this.desanitizeText(this.restaurant.web.template.SectionBImageCaption2);
    this.SectionBImageCaption3 = this.desanitizeText(this.restaurant.web.template.SectionBImageCaption3);
    this.sectionCTitle1 = this.desanitizeText(this.restaurant.web.template.sectionCTitle1);
    this.sectionCTitle2 = this.desanitizeText(this.restaurant.web.template.sectionCTitle2);
    this.sectionCTitle3 = this.desanitizeText(this.restaurant.web.template.sectionCTitle3);
    this.sectionDTitle = this.desanitizeText(this.restaurant.web.template.sectionDTitle);
    this.sectionDSubtext = this.desanitizeText(this.restaurant.web.template.sectionDSubtext);
    this.sectionElinkText = this.desanitizeText(this.restaurant.web.template.sectionElinkText);
    this.sectionEphone = this.desanitizeText(this.restaurant.web.template.sectionEphone);
    this.privacyPolicyText = this.desanitizeText(this.restaurant.web.template.privacyPolicyText);
    this.privacyPolicyLink = this.desanitizeText(this.restaurant.web.template.privacyPolicyLink);
  }

  clearLink() {
    this.link = {
      label: '',
      url: ''
    };
  }

  // --- Navbar Links
  async addLink() {
    const newLinks = [];

    if (this.navBarLinks.length > 0) {
      newLinks.push(...this.navBarLinks);
    }

    if (!!this.link.label && !!this.link.url) {
      newLinks.push(this.link);
    }

    this.navBarLinks = newLinks;

    this.clearLink();
    this.addLinkModal.hide();
  }

  async editLink(event, label, url) {
    for (const [index, link] of this.navBarLinks.entries()) {
      if (link.label === this.link.label) {
        this.navBarLinks[index] = { label, url };
        break;
      }
    }

    this.clearLink();
    this.editLinkModal.hide();
  }

  async deleteLink() {
    this.navBarLinks = this.navBarLinks.filter(l => l.label !== this.link.label);
    this.deleteLinkModal.hide();
  }

  cancelDeleteLink() {
    this.deleteLinkModal.hide();
  }

  showEditLinkModal(event, link) {
    this.editLinkModal.title = 'Edit Link';
    this.editLinkModal.show();
    this.link = link;
  }

  showDeleteLinkModal(event, link) {
    this.deleteLinkModal.title = 'Delete Link';
    this.deleteLinkModal.show();
    this.link = link;
  }

  showAddLinkModal() {
    this.addLinkModal.title = 'Add Link';
    this.addLinkModal.show();
    this.clearLink();
  }

  // --- Header Slider Image
  async uploadHeaderImage(event, index = this.headerSliderImages.length) {
    try {
      // --- Upload Image
      this.headerImage = event;

      const { Location: url }: any = await Helper.uploadImage(this.headerImage, this._api, this._http);
      this.headerSliderImages[index] = url;

      // --- Save to DB
      const newRestaurant = JSON.parse(JSON.stringify(this.restaurant));

      newRestaurant.web.template.headerSlider = this.headerSliderImages;

      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: { _id: this.restaurant['_id'] },
        new: newRestaurant
      }]).toPromise();

      this._global.publishAlert(AlertType.Success, 'Image uploaded successfully. Publishing to AWS now...');

      await this.republishToAWS();

      this._global.publishAlert(AlertType.Success, 'Header Slider Image(s) published to AWS successfully');

    } catch (error) {
      await this.refresh();
      this._global.publishAlert(AlertType.Danger, 'Error uploading image');
      console.error(error);
    }

    // try {
    //   // --- Upload Image
    //   this.headerImage = event;
    //
    //   const { Location: url }: any = await Helper.uploadImage(this.headerImage, this._api, this._http);
    //   this.headerSliderImages[index] = url;
    //
    //   // --- Save to DB
    //   const newRestaurant = JSON.parse(JSON.stringify(this.restaurant));
    //
    //   newRestaurant.web.template.headerSlider = this.headerSliderImages;
    //
    //   await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
    //     old: { _id: this.restaurant['_id'] },
    //     new: newRestaurant
    //   }]).toPromise();
    //
    //   this._global.publishAlert(AlertType.Success, 'Image uploaded suceesfuly. Publishing to AWS now...');
    //
    //
    //   // --- Re publish changes
    //   const domain = Helper.getTopDomain(this.restaurant.web.qmenuWebsite);
    //   const templateName = this.restaurant.web.templateName;
    //   const restaurantId = this.restaurant._id;
    //
    //   if (!templateName || !domain) {
    //     return this._global.publishAlert(AlertType.Danger, 'Missing template name or website');
    //   }
    //
    //   if (domain.indexOf('qmenu.us') >= 0) {
    //     return this._global.publishAlert(AlertType.Danger, 'Failed. Can not inject qmenu');
    //   }
    //
    //   await this._api.post(environment.qmenuApiUrl + 'utils/publish-website-s3', {
    //     domain,
    //     templateName,
    //     restaurantId
    //   }).toPromise();
    //
    //   // --- Invalidate domain
    //   const result = await this._api.post(environment.appApiUrl + 'events',
    //     [{ queueUrl: `https://sqs.us-east-1.amazonaws.com/449043523134/events-v3`, event: { name: 'invalidate-domain', params: { domain: domain } } }]
    //   ).toPromise();
    //
    //   console.log('uploadHeaderImage() nvalidation result:', result);
    //
    //   this._global.publishAlert(AlertType.Success, 'Header Image(s) published to AWS successfully');
    //
    // } catch (error) {
    //   await this.refresh();
    //   this._global.publishAlert(AlertType.Danger, 'Error uploading image');
    //   console.error(error);
    // }
  }

  async deleteHeaderSliderImage() {

    this.deleteHeaderSliderImageModal.hide();

    this.headerSliderImages.splice(this.headerImageIndexToDelete, 1);
    const newRestaurant = JSON.parse(JSON.stringify(this.restaurant));

    newRestaurant.web.template.headerSlider = this.headerSliderImages;

    try {
      // --- Save to mDB
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: { _id: this.restaurant['_id'] },
        new: newRestaurant
      }]).toPromise();

      // --- Re publish changes
      const domain = Helper.getTopDomain(this.restaurant.web.qmenuWebsite);
      const templateName = this.restaurant.web.templateName;
      const restaurantId = this.restaurant._id;

      if (!templateName || !domain) {
        return this._global.publishAlert(AlertType.Danger, 'Missing template name or website');
      }

      if (domain.indexOf('qmenu.us') >= 0) {
        return this._global.publishAlert(AlertType.Danger, 'Failed. Can not inject qmenu');
      }

      await this._api.post(environment.qmenuApiUrl + 'utils/publish-website-s3', {
        domain,
        templateName,
        restaurantId
      }).toPromise();

      // --- Invalidate domain
      const result = await this._api.post(environment.appApiUrl + 'events',
        [{ queueUrl: `https://sqs.us-east-1.amazonaws.com/449043523134/events-v3`, event: { name: 'invalidate-domain', params: { domain: domain } } }]
      ).toPromise();

      console.log('deleteHeaderSliderImage() nvalidation result:', result);

      this._global.publishAlert(AlertType.Success, 'Header Image(s) published to AWS successfully');

    } catch (error) {
      await this.refresh();
      this._global.publishAlert(AlertType.Danger, 'Error deleting image');
      console.error(error);
    }

  }

  showDeleteHeaderSliderImage(index) {
    this.deleteHeaderSliderImageModal.itle = 'Remove Image';
    this.headerImageIndexToDelete = index;
    this.deleteHeaderSliderImageModal.show();
  }

  // --- Specialty Images
  async uploadSpecialtyImage(event, index = this.specialtyImages.length) {
    try {
      // --- Upload Image
      this.specialtyImage = event;

      const { Location: url }: any = await Helper.uploadImage(this.specialtyImage, this._api, this._http);
      this.specialtyImages[index] = url;

      // --- Save to DB
      const newRestaurant = JSON.parse(JSON.stringify(this.restaurant));

      newRestaurant.web.template.specialties = this.specialtyImages;

      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: { _id: this.restaurant['_id'] },
        new: newRestaurant
      }]).toPromise();

      this._global.publishAlert(AlertType.Success, 'Image uploaded successfully. Publishing to AWS now...');

      await this.republishToAWS();

      this._global.publishAlert(AlertType.Success, 'Specialty Image(s) published to AWS successfully');

    } catch (error) {
      await this.refresh();
      this._global.publishAlert(AlertType.Danger, 'Error uploading image');
      console.error(error);
    }
  }

  // --- Promo Images
  async uploadPromoImage(event, index = this.promoImages.length) {
    try {
      // --- Upload Image
      this.promoImage = event;

      const { Location: url }: any = await Helper.uploadImage(this.promoImage, this._api, this._http);
      this.promoImages[index] = url;

      // --- Save to DB
      const newRestaurant = JSON.parse(JSON.stringify(this.restaurant));

      newRestaurant.web.template.promos = this.promoImages;

      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: { _id: this.restaurant['_id'] },
        new: newRestaurant
      }]).toPromise();

      this._global.publishAlert(AlertType.Success, 'Order/Promo image uploaded successfully. Publishing to AWS now...');

      await this.republishToAWS();

      this._global.publishAlert(AlertType.Success, 'Order/Promo Image(s) published to AWS successfully');

    } catch (error) {
      await this.refresh();
      this._global.publishAlert(AlertType.Danger, 'Error uploading image');
      console.error(error);
    }
  }

  async republishToAWS() {
    try {
      // --- Re publish changes
      const domain = Helper.getTopDomain(this.restaurant.web.qmenuWebsite);
      const templateName = this.restaurant.web.templateName;
      const restaurantId = this.restaurant._id;

      if (!templateName || !domain) {
        return this._global.publishAlert(AlertType.Danger, 'Missing template name or website');
      }

      if (domain.indexOf('qmenu.us') >= 0) {
        return this._global.publishAlert(AlertType.Danger, 'Failed. Can not inject qmenu');
      }

      await this._api.post(environment.qmenuApiUrl + 'utils/publish-website-s3', {
        domain,
        templateName,
        restaurantId
      }).toPromise();

      // --- Invalidate domain
      const result = await this._api.post(environment.appApiUrl + 'events',
        [{ queueUrl: `https://sqs.us-east-1.amazonaws.com/449043523134/events-v3`, event: { name: 'invalidate-domain', params: { domain: domain } } }]
      ).toPromise();

      console.log('republishToAWS() nvalidation result:', result);

      this._global.publishAlert(AlertType.Success, 'Republishing to AWS was succesful');
    } catch (error) {
      await this.refresh();
      this._global.publishAlert(AlertType.Danger, 'Error republishing to AWS');
      console.error(error);
    }
  }

  async onChangeTemplate(event) {

    this.currentTemplateName = event.newValue;

    const oldWeb = {};
    const newWeb = {};
    oldWeb['templateName'] = event.oldValue;
    newWeb['templateName'] = (event.newValue || '').trim();

    try {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: { _id: this.restaurant._id, web: oldWeb },
        new: { _id: this.restaurant._id, web: newWeb }
      }]).toPromise();

      this.restaurant.web = this.restaurant.web || {};
      this.restaurant.web['templateName'] = newWeb['templateName'];

      this._global.publishAlert(AlertType.Success, 'Template has been updated');
    } catch (error) {
      this._global.publishAlert(AlertType.Danger, 'Error while trying to update template');
      console.error(error);
    }

  }

  async toggleCustomTemplate(isCustomTemplate) {
    console.error('this.toggleCustomTemplate()', event);

    const oldTemplate = {...this.restaurant.web.template} || {};
    const newTemplate = {...this.restaurant.web.template} || {};

    newTemplate.isCustomTemplate = isCustomTemplate;

    try {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: { _id: this.restaurant._id, 'web.template': oldTemplate },
        new: { _id: this.restaurant._id, 'web.template': newTemplate }
      }]).toPromise();

      this.restaurant.web.template = this.restaurant.web.template || {};
      this.restaurant.web.template = newTemplate;

      console.log('Custom template flag set');
    } catch (error) {
      console.error('Error while setting custom flag');
      console.error(error);
    }
  }

  async crawlTemplate() {
    this.currentTemplateName = await this._crawl.crawlTemplate(this.restaurant);
    await this.refresh();
  }

  async savePartA() {
    const oldTemplate = {...this.restaurant.web.template} || {};
    const newTemplate = {...this.restaurant.web.template} || {};

    newTemplate.sectionATitle = this.sanitizeText(this.sectionATitle);
    newTemplate.sectionAslogan = this.sanitizeText(this.sectionAslogan);
    newTemplate.navbar = {};
    newTemplate.navbar.links = this.navBarLinks;

    try {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: { _id: this.restaurant._id, 'web.template': oldTemplate },
        new: { _id: this.restaurant._id, 'web.template': newTemplate }
      }]).toPromise();

      this.restaurant.web.template = this.restaurant.web.template || {};
      this.restaurant.web.template = newTemplate;

      await this.republishToAWS();

      this._global.publishAlert(AlertType.Success, 'Part A saved');
    } catch (error) {
      this._global.publishAlert(AlertType.Danger, 'Error while saving Part A');
      console.error(error);
    }
  }

  async savePartB() {
    const oldTemplate = {...this.restaurant.web.template} || {};
    const newTemplate = {...this.restaurant.web.template} || {};

    newTemplate.sectionBTitle = this.sanitizeText(this.sectionBTitle);
    newTemplate.SectionBImageCaption1 = this.sanitizeText(this.SectionBImageCaption1);
    newTemplate.SectionBImageCaption2 = this.sanitizeText(this.SectionBImageCaption2);
    newTemplate.SectionBImageCaption3 = this.sanitizeText(this.SectionBImageCaption3);
    newTemplate.specialties = this.specialtyImages;

    try {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: { _id: this.restaurant._id, 'web.template': oldTemplate },
        new: { _id: this.restaurant._id, 'web.template': newTemplate }
      }]).toPromise();

      this.restaurant.web.template = this.restaurant.web.template || {};
      this.restaurant.web.template = newTemplate;

      await this.republishToAWS();

      this._global.publishAlert(AlertType.Success, 'Part B saved');
    } catch (error) {
      this._global.publishAlert(AlertType.Danger, 'Error while saving Part B');
      console.error(error);
    }
  }

  async savePartC() {
    const oldTemplate = {...this.restaurant.web.template} || {};
    const newTemplate = {...this.restaurant.web.template} || {};

    newTemplate.sectionCTitle1 = this.sanitizeText(this.sectionCTitle1);
    newTemplate.sectionCTitle2 = this.sanitizeText(this.sectionCTitle2);
    newTemplate.sectionCTitle3 = this.sanitizeText(this.sectionCTitle3);

    try {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: { _id: this.restaurant._id, 'web.template': oldTemplate },
        new: { _id: this.restaurant._id, 'web.template': newTemplate }
      }]).toPromise();

      this.restaurant.web.template = this.restaurant.web.template || {};
      this.restaurant.web.template = newTemplate;

      await this.republishToAWS();

      this._global.publishAlert(AlertType.Success, 'Part C saved');
    } catch (error) {
      this._global.publishAlert(AlertType.Danger, 'Error while saving Part C');
      console.error(error);
    }
  }

  async savePartD() {
    const oldTemplate = {...this.restaurant.web.template} || {};
    const newTemplate = {...this.restaurant.web.template} || {};

    newTemplate.sectionDTitle = this.sanitizeText(this.sectionDTitle);
    newTemplate.sectionDSubtext = this.sanitizeText(this.sectionDSubtext);

    try {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: { _id: this.restaurant._id, 'web.template': oldTemplate },
        new: { _id: this.restaurant._id, 'web.template': newTemplate }
      }]).toPromise();

      this.restaurant.web.template = this.restaurant.web.template || {};
      this.restaurant.web.template = newTemplate;

      await this.republishToAWS();

      this._global.publishAlert(AlertType.Success, 'Part D saved');
    } catch (error) {
      this._global.publishAlert(AlertType.Danger, 'Error while saving Part D');
      console.error(error);
    }
  }

  async savePartE() {
    const oldTemplate = {...this.restaurant.web.template} || {};
    const newTemplate = {...this.restaurant.web.template} || {};

    newTemplate.sectionElinkText = this.sanitizeText(this.sectionElinkText);
    newTemplate.sectionEphone = this.sanitizeText(this.sectionEphone);

    try {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: { _id: this.restaurant._id, 'web.template': oldTemplate },
        new: { _id: this.restaurant._id, 'web.template': newTemplate }
      }]).toPromise();

      this.restaurant.web.template = this.restaurant.web.template || {};
      this.restaurant.web.template = newTemplate;

      await this.republishToAWS();

      this._global.publishAlert(AlertType.Success, 'Part E saved');
    } catch (error) {
      this._global.publishAlert(AlertType.Danger, 'Error while saving Part E');
      console.error(error);
    }
  }

  async savePartF() {
    const oldTemplate = {...this.restaurant.web.template} || {};
    const newTemplate = {...this.restaurant.web.template} || {};

    newTemplate.privacyPolicyText = this.sanitizeText(this.privacyPolicyText);
    newTemplate.privacyPolicyLink = this.sanitizeText(this.privacyPolicyLink);

    try {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: { _id: this.restaurant._id, 'web.template': oldTemplate },
        new: { _id: this.restaurant._id, 'web.template': newTemplate }
      }]).toPromise();

      this.restaurant.web.template = this.restaurant.web.template || {};
      this.restaurant.web.template = newTemplate;

      await this.republishToAWS();

      this._global.publishAlert(AlertType.Success, 'Part F saved');
    } catch (error) {
      this._global.publishAlert(AlertType.Danger, 'Error while saving Part F');
      console.error(error);
    }
  }

  sanitizeText(text) {
    return (text || '')
      .replace(/\t/g, '')
      .replace(/\n/g, '')
      .replace(/'/g, '&apos;')
      .replace(/&/g, '&amp;');
  }

  desanitizeText(text) {
    return (text || '')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&');
  }

  async revertToDefaults() {
    const oldTemplate = {...this.restaurant.web.template} || {};
    const newTemplate = {...this.restaurant.web.template} || {};

    newTemplate.isCustomTemplate = this.isCustomTemplate;
    ((newTemplate || {}) || {}).navbar = [
      { label: 'Hpme', url: '/#home'},
      { label: 'Menu', url: '/menu/'},
      { label: 'Order Online', url: `https://qmenu.us/#/${this.restaurant.alias}`},
      { label: 'Contact Us', url: '/#contact'},
    ];
    (newTemplate || {}).headerSlider = [ '/assets/images/slider1.jpg', '/assets/images/slider2.jpg'];
    (newTemplate || {}).sectionATitle = this.restaurant.name;
    (newTemplate || {}).sectionAslogan = 'Best Food, Great Value';
    (newTemplate || {}).sectionBTitle = 'Our Specialties';
    (newTemplate || {}).sectionBImageCaption1 = 'Serving with Love';
    (newTemplate || {}).sectionBImageCaption2 = 'Tasty Products';
    (newTemplate || {}).sectionBImageCaption3 = 'Wide Range Flavors';
    (newTemplate || {}).specialties = [
      '/assets/images/1.jpg',
      '/assets/images/2.jpg',
      '/assets/images/3.jpg',
      '/assets/images/4.jpg',
      '/assets/images/5.jpg',
      '/assets/images/6.jpg',
    ];
    (newTemplate || {}).sectionCTitle1 = 'Have you ever';
    (newTemplate || {}).sectionCTitle2 = 'Ordered';
    (newTemplate || {}).sectionCTitle3 = 'Online';
    (newTemplate || {}).sectionDTitle = 'People are saying';
    (newTemplate || {}).sectionDSubtext = 'Everything has just been fantastic! I would recommend this restaurant ...';
    (newTemplate || {}).sectionElinkText = 'Open In Maps';

    let phone = (this.restaurant.channels || []).filter(c => c.type === 'Phone' && (c.notifications || []).some(n => n === 'Business')).map(c => c.value)[0] || '';
    const _formatted_phone = phone.substring(0, 3) + '-' + phone.substring(3, 6) + '-' + phone.substr(6, 10);
    (newTemplate || {}).sectionEPhone = _formatted_phone;

    (newTemplate || {}).privacyPolicyText = '';
    (newTemplate || {}).privacyPolicyLink = null;

    try {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: { _id: this.restaurant._id, 'web.template': oldTemplate },
        new: { _id: this.restaurant._id, 'web.template': newTemplate }
      }]).toPromise();

      this.restaurant.web.template = this.restaurant.web.template || {};
      this.restaurant.web.template = newTemplate;

      await this.republishToAWS();

      this._global.publishAlert(AlertType.Success, 'Reverted to defaults succesfully');
    } catch (error) {
      this._global.publishAlert(AlertType.Danger, 'Error while reverting to defaults');
      console.error(error);
    }
  }

  buildImagePath(url) {
    if (!url.includes('qmenu.us')) {
      return 'https://' + url.replace('https://', '').replace('http://', '').replace('/', '');
    }
  }
}
