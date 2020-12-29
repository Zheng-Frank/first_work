import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import { AlertType } from 'src/app/classes/alert-type';
import { ApiService } from 'src/app/services/api.service';
import { GlobalService } from 'src/app/services/global.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-cloud-printing-settings',
  templateUrl: './cloud-printing-settings.component.html',
  styleUrls: ['./cloud-printing-settings.component.css']
})
export class CloudPrintingSettingsComponent implements OnInit {
  @Input() restaurant: Restaurant;
  @ViewChild("addOrderViewModal") addOrderViewModal: ModalComponent;
  @ViewChild("editOrderViewModal") editOrderViewModal: ModalComponent;

  printClients: any = [];

  selected: any = {
    menu: '',
    category: '',
    item: ''
  };

  printer: any = {};

  menus: any = [];
  categories: any = [];
  items: any = [];

  orderViews = [];
  orderView: any = {};
  orderViewIndex = -1;

  apiLoading = false;

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
    this.refresh();
  }

  async refresh() {
    this.apiLoading = true;

    const groupByKey = (array, key) => array.reduce((hash, obj) => ({ ...hash, [obj[key]]: (hash[obj[key]] || []).concat(obj) }), {});

    const [restaurantLatest] = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        _id: {
          $oid: this.restaurant._id
        }
      },
      projection: {
        printSettings: 1
      }
    }).toPromise();

    this.restaurant = { ...this.restaurant, ...restaurantLatest };

    const printers = this.restaurant['printSettings'].printers.map((printer, index) => ({
      ...printer,
      cid: index
    }));

    const printersGroupedByPrintClienId = groupByKey(printers, 'printClientId');
    this.printClients = Object.keys(printersGroupedByPrintClienId).map(key => ({ printClientId: key, printers: printersGroupedByPrintClienId[key] }));

    this.apiLoading = false;
  }

  clearOrderView() {
    this.orderView = {};
    this.orderViews = [];
    this.menus = [];
    this.selected = {};
    this.orderViewIndex = -1;
  }

  showAddOrderViewModal(printer) {
    this.printer = printer;
    this.addOrderViewModal.show();
    this.clearOrderView();
  }

  async addOrderView() {
    try {
      this.orderView = {
        copies: Number(this.orderView.copies),
        format: this.orderView.format,
        template: this.orderView.template,
        customizedRenderingStyles: this.orderView.customizedRenderingStyles,
        menus: this.menus
      };

      const oldPrinters = this.restaurant && this.restaurant['printSettings'] && this.restaurant['printSettings'].printers || [];
      const newPrinters = JSON.parse(JSON.stringify(oldPrinters));

      newPrinters[this.printer.cid].orderViews = [...newPrinters[this.printer.cid].orderViews, this.orderView];

      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [
        {
          old: { _id: this.restaurant._id, printSettings: { printers: oldPrinters } },
          new: { _id: this.restaurant._id, printSettings: { printers: newPrinters } }
        }
      ]).toPromise();

      this.menus = [];
      this.addOrderViewModal.hide();
      this.clearOrderView();
      this.refresh();

      this._global.publishAlert(AlertType.Success, "Order View Added successfuly");

    } catch (error) {
      console.error(error);
      this._global.publishAlert(AlertType.Danger, "Couldn't add Order View");
    }
  }

  cancelAddView() {
    this.addOrderViewModal.hide();
    this.clearOrderView();
  }

  onMenuSelected(menuName) {
    this.selected.menu = menuName;

    if (!this.selected.menu) {
      this.selected.category = this.selected.item = '';
      this.categories = [];
      this.items = [];
    }

    const menu = this.restaurant.menus.find(menu => menu.name === menuName);

    if (menu) {
      this.categories = menu.mcs || [];
      this.items = [];
    }
  }

  onCategorySelected(categoryName) {
    this.selected.category = categoryName;

    if (!this.selected.category) {
      this.items = [];
      this.selected.category = this.selected.item = '';
    }

    const menu = this.restaurant.menus.find(menu => menu.name === this.selected.menu)
    if (menu) {
      const categories = menu.mcs.find(cat => cat.name === categoryName);
      if (categories) {
        const items = categories.mis;
        if (items) {
          this.items = items;
        }
      }
    }
  }

  onItemSelected(itemName) {
    this.selected.item = itemName;
  }

  addMenus() {
    const menu: any = {};

    if (this.selected.menu) {
      menu.name = this.selected.menu;
      if (this.selected.category) {
        menu.mcs = [{ name: this.selected.category }];
        if (this.selected.item) {
          menu.mcs[0].mis = [{ name: this.selected.item }]
        }
      }
    }

    if (this.selected.menu) {
      this.menus = [...this.menus, menu];
    }

    this.selected.menu = this.selected.category = this.selected.item = '';
  }

  deleteMenu(menuName) {
    this.menus = this.menus.filter(menu => menu.name !== menuName);
  }

  async printTestOrder() {
    try {
      const format = this.orderView.format || 'png';
      const injectedStyles = this.orderView.customizedRenderingStyles || '';

      let url = `${environment.legacyApiUrl.replace('https', 'http')}utilities/order/${environment.testOrderId}?format=pos${injectedStyles ? ('&injectedStyles=' + encodeURIComponent(injectedStyles)) : ''}`;
      if (format === 'esc' || format === 'gdi' || format === 'pdf' || (this.printer.info && this.printer.info.version && +this.printer.info.version.split(".")[0] >= 3)) {
        url = `${environment.utilsApiUrl}renderer?orderId=${environment.testOrderId}&template=restaurantOrderPos&format=${format}${injectedStyles ? ('&injectedStyles=' + encodeURIComponent(injectedStyles)) : ''}`;
        if (format === 'pdf') {
          url = `${environment.utilsApiUrl}renderer?orderId=${environment.testOrderId}&template=restaurantOrderFax&format=${format}${injectedStyles ? ('&injectedStyles=' + encodeURIComponent(injectedStyles)) : ''}`;
        }
      }

      await this._api.post(environment.qmenuApiUrl + 'events/add-jobs', [{
        name: "send-phoenix",
        params: {
          printClientId: this.printer._id,
          data: {
            "type": "PRINT",
            data: {
              printerName: this.printer.printerName,
              format: format.toUpperCase(), // for back compatibility
              url: url,
              copies: this.orderView.copies || 0
            }
          }
        }
      }]).toPromise();
      this._global.publishAlert(AlertType.Info, "Print job sent");
    } catch (error) {
      console.error(error);
      this._global.publishAlert(AlertType.Danger, "Error while trying to print test order");
    }
  }

  cancelEditView() {
    this.editOrderViewModal.hide();
    this.clearOrderView();
  }

  showEditOrderViewModal(printer, orderView, orderViewIndex) {
    this.printer = printer;
    this.orderView = JSON.parse(JSON.stringify(orderView));
    this.menus = this.orderView.menus;
    this.orderViewIndex = orderViewIndex;
    this.editOrderViewModal.show();
  }

  async editOrderView() {
    try {
      this.orderView = {
        copies: Number(this.orderView.copies),
        format: this.orderView.format,
        template: this.orderView.template,
        customizedRenderingStyles: this.orderView.customizedRenderingStyles,
        menus: this.menus
      };

      const oldPrinters = this.restaurant && this.restaurant['printSettings'] && this.restaurant['printSettings'].printers || [];
      const newPrinters = JSON.parse(JSON.stringify(oldPrinters));

      newPrinters[this.printer.cid].orderViews[this.orderViewIndex] = this.orderView;

      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [
        {
          old: { _id: this.restaurant._id, printSettings: { printers: oldPrinters } },
          new: { _id: this.restaurant._id, printSettings: { printers: newPrinters } }
        }
      ]).toPromise();

      this.menus = [];
      this.editOrderViewModal.hide();
      this.clearOrderView();
      this.refresh();



      this._global.publishAlert(AlertType.Success, "Order View edited succesfully");
    } catch (error) {
      console.error(error);
      this._global.publishAlert(AlertType.Danger, "Error while trying to edit Order View");
    }

  }

  async deleteOrderView() {
    try {
      const oldPrinters = this.restaurant['printSettings'].printers;
      const newPrinters = JSON.parse(JSON.stringify(oldPrinters));

      newPrinters[this.printer.cid].orderViews.splice(this.orderViewIndex, 1);

      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [
        {
          old: { _id: this.restaurant._id, printSettings: { printers: oldPrinters } },
          new: { _id: this.restaurant._id, printSettings: { printers: newPrinters } }
        }
      ]).toPromise();

      this.menus = [];
      this.editOrderViewModal.hide();
      this.clearOrderView();
      this.refresh();

      this._global.publishAlert(AlertType.Success, "Order View deleted succesfully");
    } catch (error) {
      console.error(error);
      this._global.publishAlert(AlertType.Danger, "Error while trying to delete Order View");
    }
  }

}



