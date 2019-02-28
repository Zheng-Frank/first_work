import { Component, OnInit } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from 'src/app/classes/alert-type';

@Component({
  selector: 'app-monitoring-printers',
  templateUrl: './monitoring-printers.component.html',
  styleUrls: ['./monitoring-printers.component.css']
})
export class MonitoringPrintersComponent implements OnInit {
  rows = [];
  printerType;
  filteredRows = [];

  constructor(private _api: ApiService, private _global: GlobalService) { }

  now = new Date();

  ngOnInit() {
    this.populate();
  }

  async refreshStatus(row, printer) {
    const patchedPairs = [];
    const printerStatusItems = [];
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
            client.printers.map((printer, index) => {
              const connectionStatus = connectedRestaurantIdsSet.has(client.restaurantId) ? 'online' : 'offline';
              printerStatusItems.push({
                client: client,
                printer: printer,
                status: connectionStatus,
                index: index
              });
            }); // end each printer
          } // end longhorn
        }); // end each client iteration
        break;
      case 'fei-e':
        const feiEResult = await this._api.get(environment.qmenuApiUrl + 'utils/fei-e', {
          sn: printer.name,
          key: printer.key
        }).toPromise();
        const connectionStatus = feiEResult.msg;
        row.printers.map((printer, index) => {
          printerStatusItems.push({
            index: index,
            client: row,
            printer: printer,
            status: connectionStatus
          });
        });
        break;
      default:
        break;
    }

    console.log(printerStatusItems)
    printerStatusItems.map(item => {

      const printer = item.printer;
      const client = item.client;
      const index = item.index;

      const statusHistory = printer.statusHistory || [];
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

        const printers = client.printers.map(p => ({}));
        const updated = JSON.parse(JSON.stringify(printers));
        updated[index].statusHistory = statusHistory;
        patchedPairs.push({
          old: { _id: client._id, printers: printers },
          new: { _id: client._id, printers: updated }
        });
      } // end not same status
    })

    console.log(patchedPairs);
    if (patchedPairs.length > 0) {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=print-client', patchedPairs).toPromise();
      this.populate();
      this._global.publishAlert(AlertType.Success, 'updated ' + patchedPairs.length);
    } else {
      this._global.publishAlert(AlertType.Info, 'Nothing updated');
    }

  }

  printLastOrder(row, printer) {

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
      client.restaurant = restaurantDict[client.restaurantId];
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

  isStatusHealthy(status) {
    return status.indexOf('online') >= 0;
  }

  async onEditRestaurantId(event, row) {
    if (confirm("Are you sure?")) {
      await this._api.patch(environment.qmenuApiUrl + "generic?resource=print-client", [
        {
          old: { _id: row._id },
          new: { _id: row._id, restaurantId: event.newValue.trim() }
        }
      ]);

      const allRestaurants = await this._global.getCachedVisibleRestaurantList();
      row.restaurant = allRestaurants.filter(r => r._id === event.newValue.trim())[0];
    }
  }

  discovering = false;
  async syncExistingPrinters() {
    this.discovering = true;
    try {
      const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'restaurant',
        projection: {
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
            restaurantId: r._id,
            type: "fei-e",
            printers: [
              {
                name: r.printerSN.trim(),
                notifications: r.autoPrintOnNewOrder ? ['Order'] : [],
                key: r.printerKey.trim(),
                autoPrintCopies: r.printCopies || 1
              }
            ]
          });
        }

        if (r.printers && r.printers.length > 0) {
          printingClients.push({
            restaurantId: r._id,
            type: (r.autoPrintVersion || 'legacy').toLowerCase(),
            printers: r.printers.map(p => {
              p.notifications = r.autoPrintOnNewOrder ? ['Order'] : [];
              return p;
            })
          });
        }
      });

      console.log(printingClients);

      // all restaurant stubs
      const allExistingClients = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'print-client',
        limit: 200000
      }).toPromise();

      const newClients = printingClients.filter(c => {
        // fei-e ==> sn or name match
        // lecacy/longhorn ==> restaurantId match
        if (c.type === 'fei-e') {
          return !allExistingClients.some(client => client.type === 'fei-e' && (client.printers || [].some(p => p.name = c.name)));
        } else {
          return !allExistingClients.some(client => client.type === c.type && client.restaurantId === c.restaurantId);
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
