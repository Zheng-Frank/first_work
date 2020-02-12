import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { ApiService } from 'src/app/services/api.service';
import { environment } from 'src/environments/environment';
import { Helper } from 'src/app/classes/helper';
import { GlobalService } from 'src/app/services/global.service';
import { AlertType } from "src/app/classes/alert-type";

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



  navBarLinks = [{ label: '', url: '' }];
  headerSliderImages = [];
  specialtyImages = [];
  promoImages = [];

  link = { label: '', url: '' };

  headerImage;
  headerImageIndexToDelete = 0;

  specialtyImage;
  promoImage;

  restaurant;

  constructor(private _api: ApiService, private _global: GlobalService) { }

  async ngOnInit() {
    await this.init();
  }

  async init() {
    // Get most recent version of restaurant
    [this.restaurant] = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        _id: { $oid: this.restaurantId }
      },
      projection: {}
    }).toPromise();

    this.navBarLinks = this.restaurant.web.template.navbar.links;
    this.headerSliderImages = this.restaurant.web.template.headerSlider;
    this.specialtyImages = this.restaurant.web.template.specialties;
    this.promoImages = this.restaurant.web.template.promos;
  }

  clearLink() {
    this.link = {
      label: '',
      url: ''
    };
  }

  // --- Navbar Links
  async updateLinks() {
    try {
      this.hideLinksModals();

      // --- Update to mDB
      const oldRestaurant = JSON.parse(JSON.stringify(this.restaurant));
      const newRestaurant = JSON.parse(JSON.stringify(this.restaurant));

      newRestaurant.web.template.navbar.links = this.navBarLinks;

      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: { _id: this.restaurant['_id'] },
        new: newRestaurant
      }]).toPromise();

      this._global.publishAlert(AlertType.Success, 'Link saved succesfuly. Publishing to AWS now...');


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
      [{ name: 'invalidate-domain', params: { domain: domain } }]
      ).toPromise();

      console.log('invalidation result: ', result);

      this._global.publishAlert(AlertType.Success, 'Link published to AWS succesfuly');

    } catch (error) {
      await this.init();
      console.error(error);
      this._global.publishAlert(AlertType.Danger, 'Error publishing link');
    }
  }

  async addLink() {
    const newLinks = [];

    if (this.navBarLinks.length > 0) {
      newLinks.push(...this.navBarLinks);
    }

    if (!!this.link.label && !!this.link.url) {
      newLinks.push(this.link);
    }

    this.navBarLinks = newLinks;

    await this.updateLinks();
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

    await this.updateLinks();
    this.clearLink();
    this.editLinkModal.hide();
  }

  async deleteLink() {
    this.navBarLinks = this.navBarLinks.filter(l => l.label !== this.link.label);
    await this.updateLinks();
    this.deleteLinkModal.hide();
  }

  cancelDeleteLink() {
    this.deleteLinkModal.hide();
  }

  hideLinksModals() {
    this.editLinkModal.hide();
    this.addLinkModal.hide();
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

      const { Location: url }: any = await Helper.uploadImage(this.headerImage, this._api);
      this.headerSliderImages[index] = url;

      // --- Save to DB
      const newRestaurant = JSON.parse(JSON.stringify(this.restaurant));

      newRestaurant.web.template.headerSlider = this.headerSliderImages;

      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: { _id: this.restaurant['_id'] },
        new: newRestaurant
      }]).toPromise();

      this._global.publishAlert(AlertType.Success, 'Image uploaded suceesfuly. Publishing to AWS now...');


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

      this._global.publishAlert(AlertType.Success, 'Header Image(s) published to AWS succesfuly');

    } catch (error) {
      await this.init();
      this._global.publishAlert(AlertType.Danger, 'Error uploading image');
      console.error(error);
    }
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

      this._global.publishAlert(AlertType.Success, 'Header Image(s) published to AWS succesfuly');

    } catch (error) {
      await this.init();
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

      const { Location: url }: any = await Helper.uploadImage(this.specialtyImage, this._api);
      this.specialtyImages[index] = url;

      // --- Save to DB
      const newRestaurant = JSON.parse(JSON.stringify(this.restaurant));

      newRestaurant.web.template.specialties = this.specialtyImages;

      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: { _id: this.restaurant['_id'] },
        new: newRestaurant
      }]).toPromise();

      this._global.publishAlert(AlertType.Success, 'Image uploaded suceesfuly. Publishing to AWS now...');


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

      this._global.publishAlert(AlertType.Success, 'Specialty Image(s) published to AWS succesfuly');

    } catch (error) {
      await this.init();
      this._global.publishAlert(AlertType.Danger, 'Error uploading image');
      console.error(error);
    }
  }

  // --- Promo Images
  async uploadPromoImage(event, index = this.promoImages.length) {
    try {
      // --- Upload Image
      this.promoImage = event;

      const { Location: url }: any = await Helper.uploadImage(this.promoImage, this._api);
      this.promoImages[index] = url;

      // --- Save to DB
      const newRestaurant = JSON.parse(JSON.stringify(this.restaurant));

      newRestaurant.web.template.promos = this.promoImages;

      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: { _id: this.restaurant['_id'] },
        new: newRestaurant
      }]).toPromise();

      this._global.publishAlert(AlertType.Success, 'Order/Promo image uploaded suceesfuly. Publishing to AWS now...');


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

      this._global.publishAlert(AlertType.Success, 'Order/Promo Image(s) published to AWS succesfuly');

    } catch (error) {
      await this.init();
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

      this._global.publishAlert(AlertType.Success, 'Republishing to AWS was succesful');
    } catch (error) {
      await this.init();
      this._global.publishAlert(AlertType.Danger, 'Error republishing to AWS');
      console.error(error);
    }
  }

}
