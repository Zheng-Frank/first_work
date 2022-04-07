import { AlertType } from 'src/app/classes/alert-type';
import { environment } from 'src/environments/environment';
import { GlobalService } from './../../../services/global.service';
import { ApiService } from './../../../services/api.service';
import { Component, OnInit } from '@angular/core';

enum pmtCollectTypes {
  All = 'Payment Collect Type?',
  Cash = 'Cash',
  Key_In = 'Key-in',
  Rt_Stripe = 'RT Stripe',
  qMenu_Collect = 'qMenu Collect',
  Swipe_In_Person = 'Swipe in person'
}

enum printCCTypes {
  All = 'Print All CC Info?',
  Print_CC = 'Print CC',
  Don_Not_CC = 'Don not print CC'
}
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
}

const alphabet = (a, b) => (a || '').localeCompare(b || '');

@Component({
  selector: 'app-monitoring-rts-with-payment-collect',
  templateUrl: './monitoring-rts-with-payment-collect.component.html',
  styleUrls: ['./monitoring-rts-with-payment-collect.component.css']
})
export class MonitoringRtsWithPaymentCollectComponent implements OnInit {

  restaurants = [];
  restaurantsColumnDescriptors = [
    { label: '#' },
    { label: 'Restaurant', paths: ['name'], sort: alphabet },
    { label: 'Payment' },
  ];

  pmtCollectOptions = [pmtCollectTypes.All, pmtCollectTypes.Cash, pmtCollectTypes.Key_In, pmtCollectTypes.Rt_Stripe, pmtCollectTypes.qMenu_Collect, pmtCollectTypes.Swipe_In_Person];
  pmtCollectOption = pmtCollectTypes.All;
  printCCOptions = [printCCTypes.All, printCCTypes.Print_CC, printCCTypes.Don_Not_CC];
  printCCOption = printCCTypes.All;
  rows = [];
  filteredRows = [];

  constructor(private _api: ApiService, private _global: GlobalService) { }

  async ngOnInit() {
    this.populateRTsByPmtCollect();
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
            hidePrintingCCInfo: 1
          }
        },
        {
          $limit: 100000
        }
      ]
    }).toPromise();
    this.rows = restaurants;
    this.filterRTs();
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
      if (this.printCCOption === printCCTypes.Don_Not_CC) {
        this.filteredRows = this.filteredRows.filter(row => row.hidePrintingCCInfo);
      } else if (this.printCCOption === printCCTypes.Print_CC) {
        this.filteredRows = this.filteredRows.filter(row => !row.hidePrintingCCInfo);
      }
    }
  }

  async toggleEnabled(rt, event) {
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [
      {
        old: { _id: rt._id },
        new: { _id: rt._id, hidePrintingCCInfo: rt.hidePrintingCCInfo },
      }
    ]).subscribe(results => {
      this._global.publishAlert(AlertType.Success, `${rt.name} updated!`);
    },
    error => {
      this._global.publishAlert(AlertType.Danger, error);
    });
  }


}
