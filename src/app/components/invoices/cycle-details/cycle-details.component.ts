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
  total = 0;
  nonCanceledTotal = 0;
  paidTotal = 0;
  sentTotal = 0;

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
  processing = false;
  processingMessages = [];

  paymentMeansDict = {};
  disabledSet = new Set();
  paymentMeansFilter = "select payment means...";
  paymentFrequencyFilter = "select usage frequency...";

  constructor(private _route: ActivatedRoute, private _api: ApiService, private _global: GlobalService) {
    this._route.params.subscribe(
      params => {
        this.cycleId = params.id;
        this.loadCycle(params.id);
        this.populatePaymentMeansAndDisabled();
      });
  }
  ngOnInit() {
  }

  getBlockAmount(block) {
    const balances = block.rows.filter(r => r.invoice && r.invoice.isPaymentCompleted && !r.invoice.isCanceled).map(r => +r.invoice.balance);
    // balances.sort((b1, b2) => b1 - b2);
    // console.log(balances);
    // console.log(balances.reduce((sum, i) => sum + (+i), 0));
    // let sum = 0;
    // const sums = balances.map(b =>(sum += b, b + sum));
    // console.log(sums);
    return (block.rows || []).reduce((total, row) => total + (row.invoice && !row.invoice.isCanceled && row.invoice.isPaymentCompleted ? (row.invoice.balance) : 0), 0);
  }

  async processOne(row) {
    console.log(row);
    try {
      const message = await this._api.post(environment.invoicingApiUrl + 'invoicing/process', { invoiceId: row.invoice._id, cycleId: this.cycleId }).toPromise();
      console.log(message);
    } catch (error) {
      console.log(error);
    }
  }

  paying = false;
  async payOne(row) {
    console.log(row);
    this.paying = true;
    try {
      const message = await this._api.post(environment.invoicingApiUrl + 'invoicing/pay', { invoiceId: row.invoice._id, cycleId: this.cycleId }).toPromise();
      console.log(message);
    } catch (error) {
      console.log(error);
    }
    await this.recalculate();
    this.paying = false;
  }

  sending = false;
  async sendOne(row) {
    console.log(row);
    this.sending = true;
    try {
      const message = await this._api.post(environment.invoicingApiUrl + 'invoicing/send', { invoiceId: row.invoice._id, cycleId: this.cycleId }).toPromise();
      console.log(message);
    } catch (error) {
      console.log(error);
    }
    await this.recalculate();
    this.sending = false;
  }

  async processAll() {
    if (this.processing) {
      this.processing = false;
      this.processingMessages.unshift('stopped');
    } else {
      this.processing = true;
      this.processingMessages.unshift('finding unprocessed...');
      // first, recalculate all
      await this.recalculate();
      const unprocessedRestaurants = this.cycle.restaurants.filter(r => r.invoice && !['isCanceled', 'isPaymentCompleted', 'isPaymentSent', 'isSent'].some(state => r.invoice[state]));
      this.processingMessages.unshift(`found ${unprocessedRestaurants.length}`);
      // let's order by balance: so we process out sending ones first
      unprocessedRestaurants.sort((rt1, rt2) => rt1.invoice.balance - rt2.invoice.balance);
      console.log(unprocessedRestaurants);
      for (let rt of unprocessedRestaurants) {
        if (!this.processing) {
          break;
        }
        try {
          this.processingMessages.unshift(`processing ${rt.name}...`);
          const message = await this._api.post(environment.invoicingApiUrl + 'invoicing/process', { invoiceId: rt.invoice._id, cycleId: this.cycleId }).toPromise();
          console.log(message);
          this.processingMessages.unshift(`done: ${message}`);
        } catch (error) {
          console.log(error);
          let myError = (error.error || {}).message || error.error || error.message || error;
          if (typeof myError !== 'string') {
            myError = JSON.stringify(myError);
          }
          this.processingMessages.unshift(`result: ${myError}`);
          if (this.processingMessages.length > 20) {
            this.processingMessages.length = 20;
          }
        }
      }
      await this.recalculate();
      this.processingMessages.unshift(`ALL DONE!`);
      this.processing = false;
    }
  }

  async resetDangling() {
    const danglingErredRestaurants = this.cycle.restaurants.filter(rt => rt.error === 'dangling invoices found');
    // const danglingErredRestaurants = this.cycle.restaurants.filter(rt => rt.error === "start date is too old to auto process");
    // const newRestaurants = JSON.parse(JSON.stringify(this.cycle.restaurants));
    for (let rt of danglingErredRestaurants) {
      delete rt.error;
    }
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

  async populatePaymentMeansAndDisabled() {
    const rtPms = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      projection: {
        paymentMeans: 1,
        disabled: 1
      },
      limit: 100000
    }).toPromise();
    rtPms.map(rt => {
      if (rt.disabled) {
        this.disabledSet.add(rt._id);
      }
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
      this.paymentMeansDict[rt._id + 'Send'] = {
        text: getDisplayedText(sendPms),
        paymentMeans: sendPms[0]
      };

      this.paymentMeansDict[rt._id + 'Receive'] = {
        text: getDisplayedText(receivePms),
        paymentMeans: receivePms[0]
      };
    });
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
    const allRows = this.cycle.restaurants.filter(r => r).slice(0);
    this.blocks.ALL.rows = allRows;
    this.blocks.INVOICES.rows = allRows.filter(r => r.invoice);
    this.blocks.SKIPPED.rows = allRows.filter(r => !r.invoice && r.error);

    this.blocks.PAYOUT_INVOICES.rows = allRows.filter(r => r.invoice && r.invoice.balance < 0);
    this.blocks.NORMAL_INVOICES.rows = allRows.filter(r => r.invoice && r.invoice.balance > 0);
    this.blocks.CANCELED_INVOICES.rows = allRows.filter(r => r.invoice && r.invoice.isCanceled);
    const excludedErrors = ['last invoice end time was within 2 days', 'No CC details', 'dangling invoices found'];
    this.blocks.ERROR_INVOICES.rows = allRows.filter(r => r.invoice && r.error && !excludedErrors.some(e => e === r.error) && !r.invoice.isPaymentCompleted);

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

  async setActiveBlockName(blockName) {
    // await this.recalculate();
    this.activeBlockName = blockName;
    this.activeBlock = this.blocks[this.activeBlockName];
    this.filter();
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
      if (r && r.invoice) {
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
          isSent: 1,
          commission: 1
        },
        limit: 100000
      }).toPromise();
      invoices.push(...batchedInvoices);
    }

    let updated = false;
    ['isCanceled', 'isPaymentCompleted', 'isPaymentSent', 'isSent', 'commission'].map(field => {
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
  }

  getPaymentMeans(row) {
    return this.paymentMeansDict[row._id + (row.invoice && row.invoice.balance > 0 ? 'Send' : 'Receive')];
  }

  isAutopay(row) {
    const item = this.paymentMeansDict[row._id + (row.invoice && row.invoice.balance > 0 ? 'Send' : 'Receive')];
    // return item.paymentMeans && item.paymentMeans.
  }

  isRowVisible(row) {
    const pmItem = this.getPaymentMeans(row);
    const paymentMeansOk = this.paymentMeansFilter === 'select payment means...' || pmItem.text === this.paymentMeansFilter;
    const details = (pmItem.paymentMeans || {}).details || {};
    const hasCardNumberOrRoutingNumber = details.cardNumber || details.routingNumber;
    const isOneTime = ['one time', '一次'].some(t => (details.memo || '').toLowerCase().indexOf(t) >= 0);
    const frequencyOk = this.paymentFrequencyFilter === 'select usage frequency...' || (
      this.paymentFrequencyFilter === 'One Time' ?
        isOneTime :
        (hasCardNumberOrRoutingNumber && !isOneTime)
    );
    return paymentMeansOk && frequencyOk;
  }

  filter() {
    // angular auto triggers repaint
    this.total = 0;
    this.nonCanceledTotal = 0;
    this.paidTotal = 0;
    this.sentTotal = 0;
    if (this.activeBlock && this.activeBlock.rows) {
      this.activeBlock.rows.map(row => {
        if (this.isRowVisible(row) && row.invoice) {
          // const commission = Math.abs(row.invoice.commission || 0);
          const balance = Math.abs(row.invoice.balance || 0);
          if (row.invoice.isSent) {
            this.sentTotal += balance;
          }
          if (row.invoice.isPaymentCompleted) {
            this.paidTotal += balance;
          }
          if (!row.invoice.isCanceled) {
            this.nonCanceledTotal += balance;
          }
          this.total += balance;
        }
      });
    }
  }

}
