import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from 'src/app/services/api.service';
import { GlobalService } from 'src/app/services/global.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-cycle-details',
  templateUrl: './cycle-details.component.html',
  styleUrls: ['./cycle-details.component.css']
})
export class CycleDetailsComponent implements OnInit {

  cycle;

  activeBlockName;
  activeBlock;
  sortingColumn;

  blocks = {
    ALL: {
      label: '餐馆总数',
      rows: []
    },
    INVOICES: {
      label: '产生账单商家数',
      rows: []
    },
    PAYOUT_INVOICES: {
      label: '需要支出',
      rows: [],
      sent: 0,
      paid: 0
    },
    NORMAL_INVOICES: {
      label: '正常收款',
      rows: [],
      sent: 0,
      paid: 0
    },
    CANCELED_INVOICES: {
      label: '取消的',
      rows: [],
      sent: 0,
      paid: 0
    },
    SKIPPED: {
      label: '未产生账单商家数',
      rows: []
    },
    SKIPPED_TOO_SMALL: {
      label: '太小',
      rows: []
    },
    SKIPPED_MANUAL: {
      label: '手动',
      rows: []
    },
    SKIPPED_0: {
      label: '$0',
      rows: []
    },
    SKIPPED_ERROR: {
      label: '出错',
      rows: []
    }
  };
  constructor(private _route: ActivatedRoute, private _api: ApiService, private _global: GlobalService) {
    this._route.params.subscribe(
      params => {
        this.loadCycle(params.id);
      });
  }
  ngOnInit() {
  }

  async loadCycle(id) {
    const existingCycles = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "cycle",
      query: {
        _id: { $oid: id }
      },
      limit: 1
    }).toPromise();
    this.cycle = existingCycles[0];

    // compute!
    const allRows = this.cycle.restaurants.slice(0);
    this.blocks.ALL.rows = allRows;
    this.blocks.INVOICES.rows = allRows.filter(r => r.invoice);
    this.blocks.SKIPPED.rows = allRows.filter(r => r.error);

    this.blocks.PAYOUT_INVOICES.rows = allRows.filter(r => r.invoice && r.invoice.balance < 0);
    this.blocks.NORMAL_INVOICES.rows = allRows.filter(r => r.invoice && r.invoice.balance > 0);
    this.blocks.CANCELED_INVOICES.rows = allRows.filter(r => r.invoice && r.invoice.isCanceled);
    // inject sent and paid counter
    [this.blocks.PAYOUT_INVOICES, this.blocks.NORMAL_INVOICES, this.blocks.CANCELED_INVOICES].map(block => {
      block.sent = block.rows.filter(r => r.invoice.isSent).length;
      block.paid = block.rows.filter(r => r.invoice.isPaymentCompleted || r.invoice.isPaymentSent).length;
    });

    this.blocks.SKIPPED_TOO_SMALL.rows = allRows.filter(r => r.error && r.error.balance);
    this.blocks.SKIPPED_0.rows = allRows.filter(r => r.error && r.error.balance === 0);
    this.blocks.SKIPPED_ERROR.rows = allRows.filter(r => r.error && !r.error.hasOwnProperty('balance'));
    this.blocks.SKIPPED_MANUAL.rows = allRows.filter(r => r.skipAutoInvoicing);
  }

  setActiveBlockName(blockName) {
    this.activeBlockName = blockName;
    this.activeBlock = this.blocks[this.activeBlockName];
  }

  sort(column) {
    Object.keys(this.blocks).map(field => {
      if (this.sortingColumn === column) {
        this.blocks[field].rows.reverse();
      } else {
        this.blocks[field].rows.sort((r1, r2) => {
          switch (column) {
            case 'balance':
              const b1 = (r1.invoice || {}).balance || 0;
              const b2 = (r2.invoice || {}).balance || 0;
              return b1 - b2;
            case 'name':
              return r1.name > r2.name ? 1 : -1;
            default:
              break;
          }
        });
      }
    });

    this.sortingColumn = column;

  }

  async recalculate() {
    // get ALL invoices
    const invoiceIdRowDict = {};
    this.cycle.restaurants.map(r => {
      if (r.invoice) {
        invoiceIdRowDict[r.invoice._id] = r.invoice;
      }
    });
    const invoices = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "invoice",
      query: {
        _id: { $in: Object.keys(invoiceIdRowDict).map(id => ({ $oid: id })) }
      },
      projection: {
        isCanceled: 1,
        isPaymentCompleted: 1,
        isPaymentSent: 1,
        isSent: 1
      },
      limit: 100000
    }).toPromise();
    let updated = false;
    ['isCanceled', 'isPaymentCompleted', 'isPaymentSent', 'isSent'].map(field => {
      invoices.map(invoice => {
        const cycleInvoice = invoiceIdRowDict[invoice._id];
        if (cycleInvoice[field] !== invoice[field]) {
          updated = true;
          cycleInvoice[field] = invoice[field];
          if (invoice[field] === undefined) {
            delete cycleInvoice[field];
          }
        }
      });
    });
    if (updated) {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=cycle', [
        {
          old: {
            _id: this.cycle._id
          },
          new: {
            _id: this.cycle._id,
            restaurants: this.cycle.restaurants
          }
        }
      ]).toPromise();
    }
    console.log(updated);
    console.log(invoices);
  }
}
