import { Component, OnInit, ViewChild } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from 'src/app/classes/alert-type';
import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';

@Component({
  selector: 'app-monitoring-printers',
  templateUrl: './monitoring-printers.component.html',
  styleUrls: ['./monitoring-printers.component.css']
})
export class MonitoringPrintersComponent implements OnInit {
  @ViewChild('editingModal') editingModal: ModalComponent;
  rows = [];
  printerType;
  filteredRows = [];

  printerInEditing: any = {};
  formFieldDescriptors = [{
    field: 'type',
    label: 'Printer Type',
    inputType: "single-select",
    items: [
      { object: "fei-e", text: "fei-e", selected: false },
      { object: "longhorn", text: "longhorn", selected: false },
    ],
    required: true
  }

  ];
  constructor(private _api: ApiService, private _global: GlobalService) { }

  now = new Date();

  busyRows = [];

  ngOnInit() {
    this.populate();
  }
  addNewPrinter() {
    this.printerInEditing = {};
    this.editingModal.show();
  }

  async formSubmit(event) {
    try {
      const printers = [];
      if (this.printerInEditing.sn) {
        printers.push(
          {
            name: this.printerInEditing.sn,
            key: this.printerInEditing.key,
            autoPrintCopies: 1
          }
        );
      }
      await this._api.post(environment.qmenuApiUrl + 'generic?resource=print-client',
        [
          {
            type: this.printerInEditing.type,
            printers: printers,
            createdAt: new Date().valueOf()
          }
        ]
      ).toPromise();
      this.populate();
      event.acknowledge(null);
      this.editingModal.hide();
    } catch (error) {
      event.acknowledge(JSON.stringify(error));
    }
  }

  getStatusClass(status) {
    if (status && status.status.indexOf('online') >= 0) {
      // 10 minutes ago, we want to show as warning
      return this.now.valueOf() - new Date(status.time).valueOf() > 600000 ? 'text-warning' : 'text-success';
    } else {
      return 'text-danger';
    }
  }

  async updateAutoPrintCopies(event, row, printer) {
    const newAutoPrintCopies = +event.newValue;
    if (confirm(`Are you sure to change auto-print copies to ${newAutoPrintCopies} for ${printer.name}?`)) {
      const oldPrinters = row.printers.map(p => ({}));
      const newPrinters = row.printers.map(p => ({}));
      newPrinters[row.printers.indexOf(printer)].autoPrintCopies = newAutoPrintCopies;
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=print-client', [
        {
          old: { _id: row._id, printers: oldPrinters },
          new: { _id: row._id, printers: newPrinters },
        }
      ]).toPromise();
      printer.autoPrintCopies = newAutoPrintCopies;
    }
  }

  async togglePrinter(event, row, printer) {
    const newAutoPrintCopies = printer.autoPrintCopies ? 0 : 1;
    if (confirm(`Are you sure to ${newAutoPrintCopies ? 'ENABLE' : 'DISABLE'} ${printer.name}?`)) {
      // to keep same structure for delta computing in backend
      const oldPrinters = row.printers.map(p => ({}));
      const newPrinters = row.printers.map(p => ({}));
      newPrinters[row.printers.indexOf(printer)].autoPrintCopies = newAutoPrintCopies;
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=print-client', [
        {
          old: { _id: row._id, printers: oldPrinters },
          new: { _id: row._id, printers: newPrinters },
        }
      ]).toPromise();
      printer.autoPrintCopies = newAutoPrintCopies;
    } else {
      event.preventDefault();
    }
  }

  async pullPrinters(row) {
    this.busyRows.push(row);
    switch (row.type) {
      case 'longhorn':
        try {
          const printers = await this._api.post(environment.legacyApiUrl + "restaurant/queryPrinters/" + row.restaurant._id).toPromise();
          if (printers.length > 0) {
            // preserve autoPrintCopies!
            (row.printers || []).map(oldP => printers.map(newP => {
              if (oldP.name === newP.name) {
                newP.autoPrintCopies = oldP.autoPrintCopies;
              }
            }));

            // upate here!
            await this._api.patch(environment.qmenuApiUrl + 'generic?resource=print-client', [
              {
                old: { _id: row._id },
                new: { _id: row._id, printers: printers }
              }
            ]).toPromise();
            this._global.publishAlert(AlertType.Success, 'Found ' + printers.length);
            row.printers = printers;

          } else {
            this._global.publishAlert(AlertType.Info, 'No printers found');

          }
        } catch (error) {
          this._global.publishAlert(AlertType.Danger, 'Error querying printers. Please make sure restaurant\'s computer is on and have software installed.');
        }

        break;
      case "phoenix":

        const jobs = await this._api.post(environment.qmenuApiUrl + 'events/add-jobs', [{
          name: "send-phoenix",
          params: {
            printClientId: row._id,
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
            await this.reloadRow(row);
            this.busyRows = this.busyRows.filter(r => r !== row);
            return this._global.publishAlert(AlertType.Success, "Success");
          }

          // leonardo compatible
          if ((job.logs || []).some(log => log.data && log.data.length > 0)) {
            const printers = job.logs.filter(log => log.data && log.data.length > 0)[0].data.map(p => ({ name: p.name, settings: {} }));
            await await this._api.patch(environment.qmenuApiUrl + 'generic?resource=print-client', [{
              old: { _id: row._id },
              new: { _id: row._id, printers: printers }
            }]).toPromise();
            await this.reloadRow(row);
            this.busyRows = this.busyRows.filter(r => r !== row);
            return this._global.publishAlert(AlertType.Success, "Success");
          }


          if ((job.logs || []).some(log => log.data && log.data.status === 'error')) {
            this.busyRows = this.busyRows.filter(r => r !== row);
            return this._global.publishAlert(AlertType.Danger, "Error occured on client's computer.");
          }
        }
        this._global.publishAlert(AlertType.Danger, "Timeout");
        break;
      default:
        alert('not implemented yet')
        break;
    }
    this.busyRows = this.busyRows.filter(r => r !== row);
  }

  async reloadRow(row) {
    const client = (await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'print-client',
      query: {
        _id: { $oid: row._id }
      },
      limit: 1
    }).toPromise())[0];
    console.log(this.rows.indexOf(row));
    console.log(client);
    this.rows[this.rows.indexOf(row)] = client;
    this.filter();
  }

  async refreshStatus(row) {
    const patchedPairs = [];
    const clientStatusItems = [];
    switch (row.type) {
      case 'longhorn':
        // we can only get ALL status
        const result = await this._api.get(environment.legacyApiUrl + 'utilities/getPrintWizard?password=dayinji').toPromise();
        const connectedRestaurantIds = Object.keys(result).filter(id => id !== 'initialized' && result[id].pendingRequests.length > 0);
        // update status history!
        // 1. new status change;
        // 2. disconnected status change
        const connectedRestaurantIdsSet = new Set(connectedRestaurantIds);
        this.rows.map(client => {
          if (client.type === row.type) {
            const connectionStatus = connectedRestaurantIdsSet.has((client.restaurant || {})._id) ? 'online' : 'offline';
            clientStatusItems.push({
              client: client,
              status: connectionStatus
            });
          } // end longhorn
        }); // end each client iteration
        break;
      case 'fei-e':
        // ALWAYS only one priner, so use 0th to find sn and key
        const feiEResult = await this._api.get(environment.qmenuApiUrl + 'utils/fei-e', {
          sn: row.printers[0].name,
          key: row.printers[0].key
        }).toPromise();
        const connectionStatus = feiEResult.msg;
        clientStatusItems.push({
          client: row,
          status: connectionStatus
        });
        break;
      case 'phoenix':
        // phoenix will be self-reporting. So we only need to pull this client
        await this.reloadRow(row);
        break;
      default:
        alert('Not supported yet');
        break;

    }

    clientStatusItems.map(item => {

      const client = item.client;

      const statusHistory = client.statusHistory || [];
      const zeroHistory = statusHistory.length === 0;
      const flippedHistory = !zeroHistory && statusHistory[0].status !== item.status;
      if (zeroHistory || flippedHistory) {
        statusHistory.unshift({
          time: new Date(),
          status: item.status
        });
        // cut history length
        if (statusHistory.length > 4) {
          statusHistory.length = 4;
        }
        patchedPairs.push({
          old: { _id: client._id },
          new: { _id: client._id, statusHistory: statusHistory }
        });
      } // end not same status
    })

    if (patchedPairs.length > 0) {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=print-client', patchedPairs).toPromise();
      this.populate();
      this._global.publishAlert(AlertType.Success, 'updated ' + patchedPairs.length);
    } else {
      this._global.publishAlert(AlertType.Info, 'Nothing updated');
    }

    this.filter();
  }

  async suspendConnection(row) {
    const jobs = await this._api.post(environment.qmenuApiUrl + 'events/add-jobs', [{
      name: "send-phoenix",
      params: {
        printClientId: row._id,
        data: {
          "type": "SUSPEND",
          data: {
            value: 60 * 1000
          }
        }
      }
    }]).toPromise();
  }

  async emulateUpdate(row) {
    const jobs = await this._api.post(environment.qmenuApiUrl + 'events/add-jobs', [{
      name: "send-phoenix",
      params: {
        printClientId: row._id,
        data: {
          "type": "UPDATE",
          data: {
            path: "/src",
            filename: "app.config.js",
            payload: `const Path = require('path');

            module.exports = {
              APP_VERSION: '0.2.1',
              
              RECONNECT_INTERVAL: 5 * (1000),
              PING_INTERVAL: 1 * (60 * 1000),
              PING_INTERVAL_TRESHOLD_MULTIPLIER: 1.5,
              APP_PATH: Path.join(Path.dirname(process.execPath)),
              SHORTID_PATH: Path.join(Path.dirname(process.execPath), '../cloud.bin'),
              PRINTERS_EXE_PATH: Path.join(Path.dirname(process.execPath), '../dist/printers.exe'),
              PRINT_EXE_PATH: Path.join(Path.dirname(process.execPath), '../dist/print.exe')
            };`,
            version: '0.2.1'
          }
        }
      }
    }]).toPromise();
  }



  async printTestOrder(row) {
    // find printer
    const printers = row.printers.filter(p => p.autoPrintCopies > 0);
    if (printers.length === 0) {
      return this._global.publishAlert(AlertType.Info, 'No enabled printers found');
    }

    for (let printer of printers) {
      switch (row.type) {
        case 'fei-e':
          await this._api.post(environment.qmenuApiUrl + 'events/add-jobs', [{
            name: "send-order-fei-e",
            params: {
              sn: printer.name,
              key: printer.key,
              orderId: environment.testOrderId,
              copies: printer.autoPrintCopies || 1
            }
          }]).toPromise();
          this._global.publishAlert(AlertType.Info, "Print job sent");
          break;
        case 'longhorn':
          await this._api.post(environment.qmenuApiUrl + 'events/add-jobs', [{
            name: "send-order-longhorn",
            params: {
              printerName: printer.name,
              orderId: environment.testOrderId,
              copies: printer.autoPrintCopies || 1,
              format: printer.settings.DefaultPageSettings.PrintableArea.Width > 480 ? 'pdf' : 'png'
            }
          }]).toPromise();
          this._global.publishAlert(AlertType.Info, "Print job sent");
          break;
        case 'phoenix':
          await this._api.post(environment.qmenuApiUrl + 'events/add-jobs', [{
            name: "send-phoenix",
            params: {
              printClientId: row._id,
              data: {
                "type": "PRINT",
                data: {
                  printerName: printer.name,
                  format: "PNG",
                  url: "http://api.myqmenu.com/utilities/order/" + environment.testOrderId + "?format=pos",
                  copies: printer.autoPrintCopies || 1
                }
              }
            }
          }]).toPromise();
          this._global.publishAlert(AlertType.Info, "Print job sent");
          break;
        default:
          alert('not yet impelemented');
      }
    }

  }

  async populate() {
    // all restaurant stubs
    const allClients = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'print-client',
      limit: 200000
    }).toPromise();

    const allRestaurants = await this._global.getCachedVisibleRestaurantList();

    const restaurantDict = allRestaurants.reduce((map, r) => (map[r._id] = r, map), {});
    allClients.map(client => {
      client.restaurant = restaurantDict[(client.restaurant || {})._id];
    });

    this.rows = allClients;
    this.rows.sort((r1, r2) => (r1.restaurant || {}).name > (r2.restaurant || {}).name ? 1 : ((r1.restaurant || {}).name < (r2.restaurant || {}).name ? -1 : 0));
    this.filter();
    this.now = new Date();
  }

  filter() {
    this.filteredRows = this.rows;
    this.filteredRows = this.filteredRows.filter(row => !this.printerType || this.printerType === row.type);
  }


  async remove(row) {
    if (confirm("Are you absolutely sure to delete this printer?")) {
      await this._api.delete(environment.qmenuApiUrl + 'generic', {
        resource: 'print-client',
        ids: [row._id]
      }).toPromise();
      this._global.publishAlert(AlertType.Success, "Removeded!");
      this.rows = this.rows.filter(r => r !== row);
      this.filter();
    }
  }



  async onEditRestaurantId(event, row) {
    if (confirm("Are you sure?")) {
      const allRestaurants = await this._global.getCachedVisibleRestaurantList();
      const restaurant = allRestaurants.filter(r => r._id === event.newValue.trim())[0];
      await this._api.patch(environment.qmenuApiUrl + "generic?resource=print-client", [
        {
          old: { _id: row._id },
          new: { _id: row._id, restaurant: { name: restaurant.name, _id: restaurant._id } }
        }
      ]);
      row.restaurant = restaurant;
      // trigger a REPORT event to client if type is phoenix!
      if (row.type === 'phoenix') {
        await this._api.post(environment.qmenuApiUrl + 'events/add-jobs', [{
          name: "send-phoenix",
          params: {
            printClientId: row._id,
            data: {
              "type": "REPORT",
              data: {
                "restaurantName": restaurant.name,
                "restaurantId": restaurant._id
              }
            }
          }
        }]).toPromise();

      }
    }
  }

  discovering = false;
  async syncExistingPrinters() {
    this.discovering = true;
    try {
      const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'restaurant',
        projection: {
          name: 1,
          printerSN: 1,
          printerKey: 1,
          autoPrintOnNewOrder: 1,
          printCopies: 1,
          printers: 1,
          autoPrintVersion: 1
        },
        limit: 100000
      }).toPromise();

      const printingClients = [];
      restaurants.map(r => {
        if (r.printerSN && r.printerKey && r.printerKey.trim() && r.printerSN.trim()) {
          printingClients.push({
            restaurant: {
              name: r.name,
              _id: r._id
            },
            type: "fei-e",
            printers: [
              {
                name: r.printerSN.trim(),
                key: r.printerKey.trim(),
                autoPrintCopies: (r.printCopies || 1) * (r.autoPrintOnNewOrder ? 1 : 0)
              }
            ]
          });
        }

        // case of legacy or longhorn
        if (r.printers && r.printers.length > 0) {
          printingClients.push({
            restaurant: {
              name: r.name,
              _id: r._id
            },
            type: (r.autoPrintVersion || 'legacy').toLowerCase(),
            printers: r.printers.map(p => {
              p.autoPrintCopies = (r.printCopies || 1) * (r.autoPrintOnNewOrder ? 1 : 0)
              return p;
            })
          });
        }
      });

      // all restaurant stubs
      const allExistingClients = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'print-client',
        limit: 200000
      }).toPromise();

      const newClients = printingClients.filter(c => {
        // fei-e ==> sn or name match
        // lecacy/longhorn ==> restaurant._id match
        if (c.type === 'fei-e') {
          return !allExistingClients.some(client => client.type === 'fei-e' && (client.printers || [].some(p => p.name = c.name)));
        } else {
          return !allExistingClients.some(client => client.type === c.type && (client.restaurant && client.restaurant._id === (c.restaurant || {})._id));
        }
      });

      if (newClients.length > 0) {
        await this._api.post(environment.qmenuApiUrl + 'generic?resource=print-client', newClients).toPromise();
        this.populate();
        this._global.publishAlert(AlertType.Success, 'Found new clients: ' + newClients.length);
      } else {
        this._global.publishAlert(AlertType.Info, 'No new client found');
      }

    } catch (error) {

    }
    this.discovering = false;
  }
}
