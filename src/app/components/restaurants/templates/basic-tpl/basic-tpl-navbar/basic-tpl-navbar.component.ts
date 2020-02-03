import { Component, OnInit, Input, Output, ViewChild, EventEmitter } from "@angular/core";
import { Restaurant } from "@qmenu/ui";
import { ApiService } from "src/app/services/api.service";
import { GlobalService } from "src/app/services/global.service";
import { environment } from "src/environments/environment";
import { AlertType } from "src/app/classes/alert-type";

@Component({
  selector: "app-basic-tpl-navbar",
  templateUrl: "./basic-tpl-navbar.component.html",
  styleUrls: ["./basic-tpl-navbar.component.css"]
})
export class BasicTplNavbarComponent implements OnInit {
  @Input() restaurant: Restaurant;
  @Output() updateNavbarLinks = new EventEmitter<any>();
  @ViewChild("addLinkModal") addLinkModal;
  @ViewChild("editLinkModal") editLinkModal;
  @ViewChild("deleteLinkModal") deleteLinkModal;

  links = [];

  link = {
    label: '',
    url: ''
  };

  constructor(private _api: ApiService, private _global: GlobalService) { }

  async ngOnInit() {
    // Get most recent version of restaurant
    [this.restaurant] = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        _id: { $oid: this.restaurant._id }
      },
      projection: {
        'web.template.navbar.links': 1
      }
    }).toPromise();

    this.links = this.restaurant.web.template.navbar.links;
  }

  async updateLinks() {
    try {
      // Update to mDB
      const oldRestaurant = JSON.parse(JSON.stringify(this.restaurant));
      const newRestaurant = JSON.parse(JSON.stringify(this.restaurant));

      newRestaurant.web.template.navbar.links = this.links;

      const result = await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: oldRestaurant,
        new: newRestaurant
      }]).toPromise();

      this._global.publishAlert(AlertType.Success, 'Link updated suceesfuly');

    } catch (error) {
      this.links.unshift();
      console.error(error);
      this._global.publishAlert(AlertType.Danger, 'Error updating link');
    }
  }

  async addLink() {
    const newLinks = [];

    if (this.links.length > 0) {
      newLinks.push(...this.links);
    }

    if (!!this.link.label && !!this.link.url) {
      newLinks.push(this.link);
    }

    this.links = newLinks;

    await this.updateLinks();
    this.clearLink();
    this.addLinkModal.hide();
  }

  async editLink(event, label, url) {
    for(const [index, link] of this.links.entries()) {
      if (link.label === this.link.label) {
        this.links[index] = { label, url };
        break;
      }
    }

    console.log(this.links);

    await this.updateLinks();

    this.clearLink();
    this.editLinkModal.hide();
  }

  async deleteLink() {
    this.links = this.links.filter(l => l.label !== this.link.label);

    await this.updateLinks();

    this.deleteLinkModal.hide();
  }

  cancelDelete() {
    this.deleteLinkModal.hide();
  }

  clearLink() {
    this.link = {
      label: '',
      url: ''
    };
  }

  showAddLinkModal() {
    this.addLinkModal.title = "Add Link";
    this.addLinkModal.show();
    this.clearLink();
  }

  showEditLinkModal(event, link) {
    this.editLinkModal.title = "Edit Link";
    this.editLinkModal.show();
    this.link = link;
  }

  showDeleteLinkModal(event, link) {
    this.deleteLinkModal.title = "Delete Link";
    this.deleteLinkModal.show();
    this.link = link;
  }
}
