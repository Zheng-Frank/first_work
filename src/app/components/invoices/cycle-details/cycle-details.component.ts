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
    ERROR_INVOICES: {
      label: '过程出错',
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

  cycleId;

  paymentMeansDict = {};
  constructor(private _route: ActivatedRoute, private _api: ApiService, private _global: GlobalService) {
    this._route.params.subscribe(
      params => {
        this.cycleId = params.id;
        this.loadCycle(params.id);
        this.populatePaymentMeans();
      });
  }
  ngOnInit() {
  }

  async populatePaymentMeans() {
    const rtPms = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      projection: {
        paymentMeans: 1
      },
      limit: 100000
    }).toPromise();
    rtPms.map(rt => {
      const pms = rt.paymentMeans || [];
      const validPms = pms.filter(pm => {
        if (!pm.details || !pm.details.memo) {
          return true;
        }
        if (['one time', '一次'].some(t => pm.details.memo.indexOf(t) >= 0)) {
          return false;
        }
        return true;
      });
      // group by send or receive
      const sendPms = validPms.filter(pm => pm.direction === 'Send');
      const receivePms = validPms.filter(pm => pm.direction === 'Receive');
      const getDisplayedText = function (pms) {
        if (pms.length === 0) {
          return 'MISSING';
        }
        if (pms.length === 1) {
          return pms[0].type;
        }
        return 'MULTIPLE';
      }
      this.paymentMeansDict[rt._id + 'Send'] = getDisplayedText(sendPms);
      this.paymentMeansDict[rt._id + 'Receive'] = getDisplayedText(receivePms);
    });
    console.log(rtPms);
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
    this.blocks.SKIPPED.rows = allRows.filter(r => !r.invoice && r.error);

    this.blocks.PAYOUT_INVOICES.rows = allRows.filter(r => r.invoice && r.invoice.balance < 0);
    this.blocks.NORMAL_INVOICES.rows = allRows.filter(r => r.invoice && r.invoice.balance > 0);
    this.blocks.CANCELED_INVOICES.rows = allRows.filter(r => r.invoice && r.invoice.isCanceled);
    this.blocks.ERROR_INVOICES.rows = allRows.filter(r => r.invoice && r.error);

    // inject sent and paid counter
    [this.blocks.PAYOUT_INVOICES, this.blocks.NORMAL_INVOICES, this.blocks.CANCELED_INVOICES].map(block => {
      block.sent = block.rows.filter(r => r.invoice.isSent).length;
      block.paid = block.rows.filter(r => r.invoice.isPaymentCompleted || r.invoice.isPaymentSent).length;
    });

    this.blocks.SKIPPED_TOO_SMALL.rows = allRows.filter(r => !r.invoice && r.error && r.error.balance);
    this.blocks.SKIPPED_0.rows = allRows.filter(r => !r.invoice && r.error && r.error.balance === 0);
    this.blocks.SKIPPED_ERROR.rows = allRows.filter(r => !r.invoice && r.error && !r.error.hasOwnProperty('balance'));
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
    // refresh cycle first
    await this.loadCycle(this.cycleId);
    // get ALL invoices
    const invoiceIdRowDict = {};
    this.cycle.restaurants.map(r => {
      if (r.invoice) {
        invoiceIdRowDict[r.invoice._id] = r.invoice;
      }
    });

    const allIds = Object.keys(invoiceIdRowDict);
    const batchSize = 150;
    let batchedIds = Array(Math.ceil(allIds.length / batchSize)).fill(0).map((i, index) => allIds.slice(index * batchSize, (index + 1) * batchSize));

    const invoices = [];
    for (let batch of batchedIds) {
      const batchedInvoices = await this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "invoice",
        query: {
          _id: { $in: batch.map(id => ({ $oid: id })) }
        },
        projection: {
          isCanceled: 1,
          isPaymentCompleted: 1,
          isPaymentSent: 1,
          isSent: 1
        },
        limit: 100000
      }).toPromise();
      invoices.push(...batchedInvoices);
    }

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
      this.loadCycle(this.cycleId);
    }
    console.log(updated);
    console.log(invoices);
  }

  getPaymentMeans(row) {
    return this.paymentMeansDict[row._id + (row.invoice && row.invoice.balance > 0 ? 'Send' : 'Receive')];
  }

  async fix() {
    // const idStrings = `5a865f4ea176e414008e1259
    // 5b237c0af377d814002be013
    // 5ae31eb54a831a14009c9a63
    // 5b74d19b15b23a140072bc61
    // 5cd265ee2c667c6b2eb45044
    // 5b76baa22975d714008b4ddb
    // 5b8f3345c1c1201400b07060
    // 5ae1cdcc8cc7d6140063f0fb
    // 5b3ec8d0b2689d1400659995
    // 5a6698a9beb29a1400cbce56
    // 5ad007188aad6414006912af
    // 5ae3f060cff49203174f4440
    // 5afd33f43913321400d9b5ee
    // 5ae31c6d4a831a14009c9a61
    // 5ba61095cf04a814008d9a36
    // 5a5db237ecb7931400500a1c
    // 5b5ede070c609414001f4866
    // 5aa75157ba22271400d0ecfd
    // 5cec7adc2c667c6b2eb451ba
    // 5b7287e7b35ba414005a48be
    // 5a67dfde5182611400ae8e7a
    // 5aab6b30aad892140095f36a
    // 5b46b56e140023140072de9b
    // 5cb72fd32c667c6b2eb44f6c
    // 5aa1f1735f93611400b4e4dc
    // 5a8661eba176e414008e125e
    // 5b8f71e0c1c1201400b07123
    // 5c8b25a52c667c6b2eb44cf8
    // 5b6027de9f49c91400b7bf3b
    // 5a7570a314cdc5140050b682
    // 5bc0024dbaaa111400ef3bcd
    // 5ac1703f9326b814005753d2
    // 5ab23ff7af32e21400fba329
    // 5c8b26f92c667c6b2eb44cf9
    // 58b8c6a92a60a61100055e37
    // 5a1bac56e9575314005d1f49
    // 5aa642a3ba22271400d0ec1e
    // 5b406b81853cf914001fbffe
    // 5ad70122cff49203174f4428
    // 5af6dffccff49203174f4b67
    // 5b5a9fc7c926a814000cd0fa
    // 5aa1145c5f93611400b4e42b
    // 5cadfe3c2c667c6b2eb44f2e
    // 5b2276bf1b1f65140057b3e6
    // 5c9a819d2c667c6b2eb44e6f
    // 5b74cd3f15b23a140072bc09
    // 5b73f5d5719c121400420f96
    // 5ad739e1ca38201400531831
    // 5bacbc2a24428e1400190ca4
    // 5ae97aa588716f1400705802
    // 5a696fe2c3908414002efc19
    // 5ae0a7b43323291400fbb9eb
    // 5b16073d0ab74c14002be942
    // 5b7d37be6751321400b8a245
    // 5b23434ff377d814002bdffa
    // 5a6144ae3270b6140009b5a7
    // 5a33c99f0dbc271400c0c151
    // 5d42d07ea45ea64ae6ee7185
    // 59f1b4a4ae34191200a945b8`;

    // const ids = idStrings.split('\n').map(id => id.trim());

    // // clear all processedAt and error
    // this.cycle.restaurants.map(r => {
    //   if(ids.indexOf(r._id) >= 0) {
    //     delete r.error;
    //     delete r.processedAt;
    //   }
    // });

    // await this._api.patch(environment.qmenuApiUrl + 'generic?resource=cycle', [
    //   {
    //     old: {
    //       _id: this.cycle._id
    //     },
    //     new: {
    //       _id: this.cycle._id,
    //       restaurants: this.cycle.restaurants
    //     }
    //   }
    // ]).toPromise();

  }
}
