import { AlertType } from 'src/app/classes/alert-type';
import { environment } from 'src/environments/environment';
import { GlobalService } from './../../../services/global.service';
import { ApiService } from './../../../services/api.service';
import { Component, OnInit, ViewChild } from '@angular/core';
import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import { RouterLinkWithHref } from '@angular/router';
declare var $: any;
enum pmtCollectTypes {
  All = 'Payment Collect Type?',
  Cash = 'Cash',
  Key_In = 'Key-in',
  Rt_Stripe = 'RT Stripe',
  qMenu_Collect = 'qMenu Collect',
  Swipe_In_Person = 'Swipe in person'
};

enum pciDisplayTypes {
  All = 'Select PCI Settings Filter',
  Hide_Non_PCI = 'PCI Compliant RTs',
  Show_Non_PCI = 'PCI Non-Compliant RTs'
};

enum feieDisplayTypes {
  All = 'Select fei-e Settings Filter',
  Feie_Enabled = 'RTs with fei-e printing',
  Feie_Disabled = 'RTs without fei-e printing'
};

enum printCCTypes {
  All = 'Select CC Print Filter',
  Print_CC = 'Print CC',
  Dont_Print_CC = 'Do not print CC'
};
// paymentDescriptionMap = {
//   'CASH': 'Cash',
//   'IN_PERSON': 'Credit card: swipe in-person',
//   'QMENU': 'Credit card: let qMenu collect on behalf of restaurant',
//   'KEY_IN': 'Credit card: send numbers to restaurant for key-in',
//   'STRIPE': 'Credit card: deposit to restaurant\'s account directly (configure below)'
// };
enum pmyMethodTypes {
  Cash = 'CASH',
  In_Person = 'IN_PERSON',
  Qmenu = 'QMENU',
  Key_In = 'KEY_IN',
  Stripe = 'STRIPE'
};

enum languageTypes {
  All = 'Language?',
  English = 'ENGLISH',
  Chinese = 'CHINESE',
  None = 'NONE'
}

enum sendBroadcastTypes {
  All = 'Send Broadcast?',
  Sent = 'Sent',
  Not_Sent = 'Not sent'
}

const sortAlphabetical = (a, b) => (a || '').localeCompare(b || '');

@Component({
  selector: 'app-monitoring-rts-with-payment-collect',
  templateUrl: './monitoring-rts-with-payment-collect.component.html',
  styleUrls: ['./monitoring-rts-with-payment-collect.component.css']
})
export class MonitoringRtsWithPaymentCollectComponent implements OnInit {
  @ViewChild('bulkActionModal') bulkActionModal: ModalComponent;
  restaurants = [];
  restaurantsColumnDescriptors = [
    { label: '#' },
    { label: 'Restaurant', paths: ['name'], sort: sortAlphabetical },
    { label: 'Payment' },
  ];

  pmtCollectOptions = [pmtCollectTypes.All, pmtCollectTypes.Cash, pmtCollectTypes.Key_In, pmtCollectTypes.Rt_Stripe, pmtCollectTypes.qMenu_Collect, pmtCollectTypes.Swipe_In_Person];
  pmtCollectOption = pmtCollectTypes.All;
  printCCOptions = [printCCTypes.All, printCCTypes.Print_CC, printCCTypes.Dont_Print_CC];
  printCCOption = printCCTypes.All;
  pciDisplayOptions = [pciDisplayTypes.All, pciDisplayTypes.Hide_Non_PCI, pciDisplayTypes.Show_Non_PCI];
  pciDisplayOption = pciDisplayTypes.All;
  feieDisplayOptions = [feieDisplayTypes.All, feieDisplayTypes.Feie_Enabled, feieDisplayTypes.Feie_Disabled];
  feieDisplayOption = feieDisplayTypes.All;
  languageOptions = [languageTypes.All, languageTypes.English, languageTypes.Chinese, languageTypes.None];
  languageOption = languageTypes.All;
  sendBroadcastOptions = [sendBroadcastTypes.All, sendBroadcastTypes.Sent, sendBroadcastTypes.Not_Sent];
  sendBroadcastOption = sendBroadcastTypes.All;

  rows = [];
  filteredRows = [];
  broadcasts = [];
  broadcast = '';
  paymentBroadcast = '';
  bulkShowPrintingCCInfo = true;
  bulkShowNonPCIData = true;

  constructor(private _api: ApiService, private _global: GlobalService) { }

  async ngOnInit() {
    $("[data-toggle='tooltip']").tooltip();
    await this.populateRTsByPmtCollect();
    await this.populatePrintClients();
    this.filterRTs();
  }

  copyRTIDs() {
    let rtIDs = this.filteredRows.map(row => row._id).join(', ');
    let text = `${rtIDs}`;
    const handleCopy = (e: ClipboardEvent) => {
      // clipboardData maybe null
      e.clipboardData && e.clipboardData.setData('text/plain', text);
      e.preventDefault();
      // removeEventListener should input second params
      document.removeEventListener('copy', handleCopy);
    };
    document.addEventListener('copy', handleCopy);
    document.execCommand('copy');
    this._global.publishAlert(AlertType.Success, 'the data of order has copyed to your clipboard ~', 1000);
  }

  openBulkActionModal() {
    this.bulkShowNonPCIData = true;
    this.bulkShowPrintingCCInfo = true;
    this.bulkActionModal.show();
  }

  async populateRTsByPmtCollect() {
    const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      aggregate: [
        { $match: { disabled: { $ne: true } } },
        {
          $project: {
            name: 1,
            serviceSettings: 1,
            hidePrintingCCInfo: 1,
            hideNonPCIData: 1,
            preferredLanguage: 1,
            broadcasts: 1
          }
        },
        {
          $limit: 100000
        }
      ]
    }).toPromise();
    this.rows = restaurants;
    // populate existing broadcasts of our system
    this.broadcasts = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'broadcast',
      aggregate: [
        {
          $project: {
            name: 1
          }
        },
        {
          $limit: 100000
        }
      ]
    }).toPromise();
    this.broadcasts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    this.paymentBroadcast = this.broadcasts.find(b => b.name === "Restaurant Payment Broadcast")._id;
    // add a temp new property showPrintingCCInfo to control q-toggle
    this.rows.forEach(row => {
      row.showPrintingCCInfo = !row.hidePrintingCCInfo;
      row.showNonPCIData = !row.hideNonPCIData;
    });
  }

  filterRTs() {
    this.filteredRows = this.rows;
    // filter by pmtCollectOption
    if (this.pmtCollectOption !== pmtCollectTypes.All) {
      if (this.pmtCollectOption === pmtCollectTypes.Cash) {
        this.filteredRows = this.filteredRows.filter(row => (row.serviceSettings || []).some(service => (service.paymentMethods || []).includes(pmyMethodTypes.Cash)));
      } else if (this.pmtCollectOption === pmtCollectTypes.Key_In) {
        this.filteredRows = this.filteredRows.filter(row => (row.serviceSettings || []).some(service => (service.paymentMethods || []).includes(pmyMethodTypes.Key_In)));
      } else if (this.pmtCollectOption === pmtCollectTypes.Rt_Stripe) {
        this.filteredRows = this.filteredRows.filter(row => (row.serviceSettings || []).some(service => (service.paymentMethods || []).includes(pmyMethodTypes.Stripe)));
      } else if (this.pmtCollectOption === pmtCollectTypes.Swipe_In_Person) {
        this.filteredRows = this.filteredRows.filter(row => (row.serviceSettings || []).some(service => (service.paymentMethods || []).includes(pmyMethodTypes.In_Person)));
      } else if (this.pmtCollectOption === pmtCollectTypes.qMenu_Collect) {
        this.filteredRows = this.filteredRows.filter(row => (row.serviceSettings || []).some(service => (service.paymentMethods || []).includes(pmyMethodTypes.Qmenu)));
      }
    }
    // filter by printCCOption
    if (this.printCCOption !== printCCTypes.All) {
      if (this.printCCOption === printCCTypes.Dont_Print_CC) {
        this.filteredRows = this.filteredRows.filter(row => !row.showPrintingCCInfo);
      } else if (this.printCCOption === printCCTypes.Print_CC) {
        this.filteredRows = this.filteredRows.filter(row => row.showPrintingCCInfo);
      }
    }

    // filter by PCI status
    if (this.pciDisplayOption !== pciDisplayTypes.All) {
      if (this.pciDisplayOption === pciDisplayTypes.Show_Non_PCI) {
        this.filteredRows = this.filteredRows.filter(row => row.showNonPCIData);
      } else if (this.pciDisplayOption === pciDisplayTypes.Hide_Non_PCI) {
        this.filteredRows = this.filteredRows.filter(row => !row.showNonPCIData);
      }
    }

    // filter by feie printing
    if (this.feieDisplayOption !== feieDisplayTypes.All) {
      if (this.feieDisplayOption === feieDisplayTypes.Feie_Enabled) {
        this.filteredRows = this.filteredRows.filter(row => row.hasFeiePrinting);
      } else if (this.feieDisplayOption === feieDisplayTypes.Feie_Disabled) {
        this.filteredRows = this.filteredRows.filter(row => !row.hasFeiePrinting);
      }
    }

    // filter by language
    if (this.languageOption !== languageTypes.All) {
      if (this.languageOption === languageTypes.English) {
        this.filteredRows = this.filteredRows.filter(row => row.preferredLanguage === languageTypes.English);
      } else if (this.languageOption === languageTypes.Chinese) {
        this.filteredRows = this.filteredRows.filter(row => row.preferredLanguage === languageTypes.Chinese);
      } else if (this.languageOption === languageTypes.None) {
        this.filteredRows = this.filteredRows.filter(row => !row.preferredLanguage);
      }
    }

    // filter by send broadcast
    if (this.sendBroadcastOption !== sendBroadcastTypes.All) {
      if (this.sendBroadcastOption === sendBroadcastTypes.Sent) {
        this.filteredRows = this.filteredRows.filter(row => (row.broadcasts || []).some(b => b._id === this.paymentBroadcast));
      } else if (this.sendBroadcastOption === sendBroadcastTypes.Not_Sent) {
        this.filteredRows = this.filteredRows.filter(row => !(row.broadcasts || []).some(b => b._id === this.paymentBroadcast));
      }
    }

    // filter by which broadcast
    if (this.broadcast !== '') {
      this.filteredRows = this.filteredRows.filter(row => (row.broadcasts || []).some(b => b._id === this.broadcast));
    }
  }

  async toggleEnabledForRow(rt, property) {
    rt[property] = !rt[property];
    const oldNewPatchData = {
      old: { _id: rt._id },
      new: { _id: rt._id }
    };
    oldNewPatchData.new[property] = rt[property];

    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [
      oldNewPatchData
    ]).subscribe(results => {
      this._global.publishAlert(AlertType.Success, `${rt.name} updated!`);
    },
      error => {
        this._global.publishAlert(AlertType.Danger, error);
      });

    // RT may have changed category after the toggle, so we should re-filter
    this.filterRTs();
  }

  // bulk toggle update
  async bulkToggleEnabled() {
    let oldNewPairs = [];
    this.filteredRows.forEach(row => {
      let oldNewPatchData = {
        old: { _id: row._id },
        new: { _id: row._id }
      }
      oldNewPatchData.new['hidePrintingCCInfo'] = !this.bulkShowPrintingCCInfo;
      oldNewPatchData.new['hideNonPCIData'] = !this.bulkShowNonPCIData;
      // update filter row
      row['hidePrintingCCInfo'] = !this.bulkShowPrintingCCInfo;
      row['hideNonPCIData'] = !this.bulkShowNonPCIData;
      row['showPrintingCCInfo'] = this.bulkShowPrintingCCInfo;
      row['showNonPCIData'] = this.bulkShowNonPCIData;
      // update origin row
      let index = this.rows.findIndex(r => r._id === row._id);
      this.rows[index]['hidePrintingCCInfo'] = !this.bulkShowPrintingCCInfo;
      this.rows[index]['hideNonPCIData'] = !this.bulkShowNonPCIData;
      this.rows[index]['showPrintingCCInfo'] = this.bulkShowPrintingCCInfo;
      this.rows[index]['showNonPCIData'] = this.bulkShowNonPCIData;
      oldNewPairs.push(oldNewPatchData);
    });

    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', oldNewPairs).subscribe(results => {
      this._global.publishAlert(AlertType.Success, `Bulk updated!`);
    },
      error => {
        this._global.publishAlert(AlertType.Danger, error);
      });
    this.bulkActionModal.hide();
    // RT may have changed category after the toggle, so we should re-filter
    this.filterRTs();
  }

  async populatePrintClients() {
    const feieClients = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'print-client',
      query: { type: 'fei-e' },
      projection: { _id: 1, "restaurant._id": 1 }
    }).toPromise();

    for (let row of this.rows) {
      row.hasFeiePrinting = false;

      const rtMatch = feieClients.filter(client => client.restaurant._id === row._id);
      if ((rtMatch || []).length) {
        row.hasFeiePrinting = true;
      }
    }
  }

  displayFeieMessage(r) {
    if (r.hasFeiePrinting === true) {
      return 'ENABLED';
    }
    return 'Not enabled'
  }
}
