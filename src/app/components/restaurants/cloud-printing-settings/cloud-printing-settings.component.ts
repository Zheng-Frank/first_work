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
  @ViewChild("orderViewModal") orderViewModal: ModalComponent;

  isEditing = true;

  printClients: any = [];
  apiLoading = false;

  useNewSettings;

  defaultOrderView = {
    copies: 1,
    customizedRenderingStyles: '',
    format: '',
    template: '',
    menus: [{
      mcs: [{
        mis: [{
        }]
      }]
    }]
  };

  printer: any = {};

  orderView: any = {};
  orderViewIndex = -1;
  printClient: any = {};

  menus: any = [];
  categories: any = [];
  items: any = [];

  selected: any = {
    menu: '',
    category: '',
    item: ''
  };


  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
    this.refresh();
  }

  async toggleUseNewSettings() {
    console.log(this.useNewSettings);
    try {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [
        {
          old: { _id: this.restaurant._id },
          new: { _id: this.restaurant._id, printSettings: { useNewSettings: this.useNewSettings } }
        }
      ]).toPromise();

      this._global.publishAlert(AlertType.Success, "Use New Settings toggled succesfully");

    } catch (error) {
      console.error(error);
      this._global.publishAlert(AlertType.Danger, "Error while toggling 'Use New Settings'");
    }

  }

  async refresh() {
    this.apiLoading = true;

    this.useNewSettings = (this.restaurant['printSettings'] || {}).useNewSettings;

    this.printClients = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'print-client',
      query: {
        "restaurant._id": this.restaurant._id.toString()
      },
      projection: {
        _id: 1,
        guid: 1,
        info: 1,
        printers: 1,
        restaurant: 1,
        type: 1,
      },
      limit: 100
    }).toPromise();

    this.printClients.map(printClient => (printClient.printers || []).map((printer, index) => {
      printer.cid = index;
    }));

    this.apiLoading = false;
  }

  clearOrderView() {
    this.menus = [];
    this.selected = {};
    this.orderViewIndex = -1;
  }

  onMenuSelected(menuName) {
    this.selected.menu = menuName;

    if (!this.selected.menu) {
      this.selected.category = this.selected.item = '';
      this.categories = this.items = [];
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

    this.selected = {};

    console.log(this.menus);
  }

  deleteMenu(menuIndex) {
    this.menus.splice(menuIndex, 1);
    console.log(this.menus);
  }

  async printTestOrder() {
    try {
      const format = this.orderView.format || 'png';
      const url = this.getTestOrderRenderingUrl();
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
              copies: this.orderView.copies || 1 // default to 1
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

  cancelOrderViewModal() {
    this.orderViewModal.hide();
    this.clearOrderView();
    console.log('cancelOrderViewModal()');
  }

  showOrderViewModal(printer, orderView, orderViewIndex, printClient, isEditing) {
    this.printer = printer;
    this.orderView = JSON.parse(JSON.stringify(orderView));
    this.orderViewIndex = orderViewIndex;
    this.printClient = printClient;

    const allMenus = [];
    (printClient.printers[this.printer.cid] && printClient.printers[this.printer.cid].orderViews || []).map(ov => {
      (ov.menus || []).map(menu => {
        allMenus.push(menu)
      });
    });
    this.isEditing = isEditing;
    this.menus = isEditing ? JSON.parse(JSON.stringify(orderView.menus)) : [];
    this.orderViewModal.show();
  }

  async saveChangesOrderView() {
    try {
      this.orderView = {
        copies: Number(this.orderView.copies),
        format: this.orderView.format,
        template: this.orderView.template,
        customizedRenderingStyles: this.orderView.customizedRenderingStyles,
        menus: this.menus
      };

      const printClientMatched = this.printClients.find(printClient => printClient.guid === this.printClient.guid)
      const oldPrinters = printClientMatched && printClientMatched.printers || [];
      const newPrinters = JSON.parse(JSON.stringify(oldPrinters));

      if (!printClientMatched) {
        this._global.publishAlert(AlertType.Danger, "No print client found!");
        return;
      }

      if (this.isEditing) {
        newPrinters[this.printer.cid].orderViews[this.orderViewIndex] = this.orderView;

        oldPrinters.map(oldPrinter => delete oldPrinter.cid);
        newPrinters.map(newPrinter => delete newPrinter.cid);

        await this._api.patch(environment.qmenuApiUrl + 'generic?resource=print-client', [
          {
            old: { _id: printClientMatched._id, printers: oldPrinters },
            new: { _id: printClientMatched._id, printers: newPrinters }
          }
        ]).toPromise();

        this.orderViewModal.hide();
        this.clearOrderView();
        this.refresh();

        this._global.publishAlert(AlertType.Success, "Order View edited succesfully");
      }

      if (!this.isEditing && printClientMatched) {
        newPrinters[this.printer.cid].orderViews = [...(newPrinters[this.printer.cid].orderViews || []), this.orderView];

        await this._api.patch(environment.qmenuApiUrl + 'generic?resource=print-client', [
          {
            old: { _id: printClientMatched._id, printers: oldPrinters },
            new: { _id: printClientMatched._id, printers: newPrinters }
          }
        ]).toPromise();

        this.orderViewModal.hide();
        this.clearOrderView();
        this.refresh();

        this._global.publishAlert(AlertType.Success, "Order View Added successfuly");
      }

    } catch (error) {
      console.error(error);
      this._global.publishAlert(AlertType.Danger, this.isEditing ? "Error while trying to Edit Order View" : "Error while trying to Add Order View");
    }

  }

  async deleteOrderView() {
    try {
      const printClientMatched = this.printClients.find(printClient => printClient.guid === this.printClient.guid)
      const oldPrinters = printClientMatched && printClientMatched.printers || [];
      const newPrinters = JSON.parse(JSON.stringify(oldPrinters));

      newPrinters[this.printer.cid].orderViews.splice(this.orderViewIndex, 1);

      if (!printClientMatched) {
        this._global.publishAlert(AlertType.Danger, "No print client found!");
        return;
      }

      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=print-client', [
        {
          old: { _id: printClientMatched._id, printers: oldPrinters },
          new: { _id: printClientMatched._id, printers: newPrinters }
        }
      ]).toPromise();

      this.orderViewModal.hide();
      this.clearOrderView();
      this.refresh();

      this._global.publishAlert(AlertType.Success, "Order View deleted succesfully");
    } catch (error) {
      console.error(error);
      this._global.publishAlert(AlertType.Danger, "Error while trying to delete Order View");
    }
  }

  getTestOrderRenderingUrl() {
    const format = this.orderView.format || 'png';
    const customizedRenderingStyles = encodeURIComponent(this.orderView.customizedRenderingStyles || '');
    const menus = encodeURIComponent(JSON.stringify(this.menus || []));
    const template = this.orderView.template === 'chef' ? 'restaurantOrderPosChef' : 'restaurantOrderPos';

    let url = `${environment.legacyApiUrl.replace('https', 'http')}utilities/order/${environment.testOrderId}?format=pos&injectedStyles=${customizedRenderingStyles}`;
    if (format === 'esc' || format === 'gdi' || format === 'pdf' || (this.printClient.info && this.printClient.info.version && +this.printClient.info.version.split(".")[0] >= 3)) {
      // ONLY newest phoenix support chef view so for now
      url = `${environment.utilsApiUrl}renderer?orderId=${environment.testOrderId}&template=${template}&format=${format}&customizedRenderingStyles=${customizedRenderingStyles}&menus=${menus}`;
      if (format === 'pdf') {
        url = `${environment.utilsApiUrl}renderer?orderId=${environment.testOrderId}&template=restaurantOrderFax&format=${format}&customizedRenderingStyles=${customizedRenderingStyles}`;
      }
    }
    return url;
  }

  previewTestOrder() {
    window.open(this.getTestOrderRenderingUrl(), "_blank", "scrollbars=yes,resizable=yes,top=500,left=500,width=400,height=400");
  }

  async pullPrinters(printClient) {

    switch (printClient.type) {
      case 'longhorn':
        try {
          this.apiLoading = true;
          const printers = await this._api.post(environment.legacyApiUrl + "restaurant/queryPrinters/" + this.restaurant._id).toPromise();
          if (printers.length > 0) {
            // preserve autoPrintCopies!
            (printClient.printers || []).map(oldP => printers.map(newP => {
              if (oldP.name === newP.name) {
                newP.autoPrintCopies = oldP.autoPrintCopies;
              }
            }));

            // upate here!
            await this._api.patch(environment.qmenuApiUrl + 'generic?resource=print-client', [
              {
                old: { _id: printClient._id },
                new: { _id: printClient._id, printers: printers }
              }
            ]).toPromise();
            this._global.publishAlert(AlertType.Success, 'Found ' + printers.length);
            printClient.printers = printers;

          } else {
            this._global.publishAlert(AlertType.Info, 'No printers found');

          }
          this.apiLoading = false;
        } catch (error) {
          this._global.publishAlert(AlertType.Danger, 'Error querying printers. Please make sure restaurant\'s computer is on and have software installed.');
          this.apiLoading = false;
        }
        break;

      case "phoenix":
        this.apiLoading = true;
        const jobs = await this._api.post(environment.qmenuApiUrl + 'events/add-jobs', [{
          name: "send-phoenix",
          params: {
            printClientId: printClient._id,
            data: {
              "type": "QUERY_PRINTERS",
              data: {
                "fake": "id"
              }
            }
          }
        }]).toPromise();

        const pollingInterval = 5000;
        const pollingCount = 6;
        const delay = t => new Promise(resolve => setTimeout(resolve, t));
        for (let i = 0; i < pollingCount; i++) {
          await delay(pollingInterval);
          const job = (await this._api.get(environment.qmenuApiUrl + 'generic', {
            resource: 'job',
            query: {
              _id: { $oid: jobs[0]._id }
            },
            projection: {
              "logs.data.printers.name": 1,
              "logs.data.status": 1,
              // Leonardo compatible
              "logs.data.name": 1
            },
            limit: 1
          }).toPromise())[0];

          if ((job.logs || []).some(log => log.data && log.data.printers)) {
            // await this.reloadRow(row);
            // this.busyRows = this.busyRows.filter(r => r !== row);
            this.apiLoading = false;
            await this.refresh();
            return this._global.publishAlert(AlertType.Success, "Success");
          }

          // leonardo compatible
          if ((job.logs || []).some(log => log.data && log.data.length > 0)) {
            const printers = job.logs.filter(log => log.data && log.data.length > 0)[0].data.map(p => ({ name: p.name, settings: {} }));
            await await this._api.patch(environment.qmenuApiUrl + 'generic?resource=print-client', [{
              old: { _id: printClient._id },
              new: { _id: printClient._id, printers: printers }
            }]).toPromise();
            // await this.reloadRow(row);
            // this.busyRows = this.busyRows.filter(r => r !== row);
            this.apiLoading = false;
            await this.refresh();
            return this._global.publishAlert(AlertType.Success, "Success");
          }


          if ((job.logs || []).some(log => log.data && log.data.status === 'error')) {
            // this.busyRows = this.busyRows.filter(r => r !== row);
            this.apiLoading = false;
            return this._global.publishAlert(AlertType.Danger, "Error occured on client's computer.");
          }


        }
        this.apiLoading = false;
        this._global.publishAlert(AlertType.Danger, "Timeout");
        break;
      default:
        alert('not implemented yet')
        break;
    }

  }

}



