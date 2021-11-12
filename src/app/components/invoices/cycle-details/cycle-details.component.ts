import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertType } from 'src/app/classes/alert-type';
import { ApiService } from 'src/app/services/api.service';
import { GlobalService } from 'src/app/services/global.service';
import { environment } from 'src/environments/environment';
@Component({
  selector: 'app-cycle-details',
  templateUrl: './cycle-details.component.html',
  styleUrls: ['./cycle-details.component.css']
})
export class CycleDetailsComponent implements OnInit {

  isLastCycle = true;
  cycle;
  restaurantCycleList = [];
  invoiceList = [];
  restaurantInvoiceDict = {};

  activeBlockName;
  activeBlock;
  sortingColumn = 'balance';
  sortingDirection = 1;
  total = 0;
  nonCanceledTotal = 0;
  paidTotal = 0;
  sentTotal = 0;
  qmenuCollectedTotal = 0;
  commissionTotal = 0;
  ccFeeTotal = 0;
  creditAdjustmentTotal = 0;
  debitAdjustmentTotal = 0;
  skipAutoInvoicingRestaurants = new Set();

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

  invoiceProjection = {
    isCanceled: 1,
    isPaymentCompleted: 1,
    isPaymentSent: 1,
    isSent: 1,
    commission: 1,
    balance: 1,
    cycleId: 1,
    qMenuCcCollected: 1,
    "restaurant.id": 1,
    feesForQmenu: 1,
    stripeFee: 1,
    adjustment: 1
  };
  constructor(private _route: ActivatedRoute, private _api: ApiService, private _global: GlobalService) {
    this._route.params.subscribe(
      async params => {
        this.cycleId = params.id;
        await this.populatePaymentMeansAndDisabled();
        this.loadCycle();
        console.log(this.skipAutoInvoicingRestaurants)
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
      const message = await this._api.post(environment.invoicingApiUrl + 'invoicing/process', { invoiceId: row.invoice._id, restaurantCycleId: row.rcId }).toPromise();
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
      const message = await this._api.post(environment.invoicingApiUrl + 'invoicing/pay', { invoiceId: row.invoice._id, restaurantCycleId: row.rcId }).toPromise();
      console.log(message);
    } catch (error) {
      console.log(error);
    }
    await this.reloadInvoice(row.invoice._id);
    this.paying = false;
  }

  sending = false;
  async sendOne(row) {
    console.log(row);
    this.sending = true;
    try {
      const message = await this._api.post(environment.invoicingApiUrl + 'invoicing/send', { invoiceId: row.invoice._id, restaurantCycleId: row.rcId }).toPromise();
      console.log(message);
    } catch (error) {
      console.log(error);
    }
    await this.reloadInvoice(row.invoice._id);
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
      await this.loadCycle();

      const unprocessedRows = this.restaurantCycleList.filter(row => {
        const invoice = this.restaurantInvoiceDict[row.restaurant._id];
        return invoice && !['isCanceled', 'isPaymentCompleted', 'isPaymentSent', 'isSent'].some(state => invoice[state]);
      });

      this.processingMessages.unshift(`found ${unprocessedRows.length}`);
      // let's order by balance: so we process out sending ones first
      unprocessedRows.sort((row1, row2) => this.restaurantInvoiceDict[row1.restaurant._id].balance - this.restaurantInvoiceDict[row2.restaurant._id].balance);
      console.log(unprocessedRows);
      for (let row of unprocessedRows) {
        if (!this.processing) {
          break;
        }
        try {
          this.processingMessages.unshift(`processing ${row.restaurant.name}...`);
          const message = await this._api.post(environment.invoicingApiUrl + 'invoicing/process', { invoiceId: this.restaurantInvoiceDict[row.restaurant._id]._id, restaurantCycleId: row._id }).toPromise();
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
        await this.reloadInvoice(this.restaurantInvoiceDict[row.restaurant._id]._id);
      }
      await this.loadCycle();
      this.processingMessages.unshift(`ALL DONE!`);
      this.processing = false;
    }
  }

  async resetDangling() {
    const danglingErredRestaurants = this.blocks.ALL.rows.filter(rt => rt.error === 'dangling invoices found');
    // we just need to delete ALL restaurant-cycle of dangling
    if (danglingErredRestaurants.length > 0) {
      try {
        await this._api.delete(environment.qmenuApiUrl + 'generic', {
          resource: 'restaurant-cycle',
          ids: danglingErredRestaurants.map(d => d.rcId)
        }).toPromise();
        this._global.publishAlert(AlertType.Success, `Reset ${danglingErredRestaurants.length}`);
      } catch (error) {
        this._global.publishAlert(AlertType.Danger, JSON.stringify(error), 120000);
      }
    } else {
      this._global.publishAlert(AlertType.Danger, 'No dangling restaurants found');
    }
    this.loadCycle();
  }

  async populatePaymentMeansAndDisabled() {
    const rtPms = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      projection: {
        paymentMeans: 1,
        disabled: 1,
        skipAutoInvoicing: 1,
      },
      limit: 100000
    }).toPromise();
    rtPms.map(rt => {
      if (rt.skipAutoInvoicing) {
        this.skipAutoInvoicingRestaurants.add(rt._id);
      }
      if (rt.disabled) {
        this.disabledSet.add(rt._id);
      }
      const pms = rt.paymentMeans || [];
      const validPms = pms.filter(pm => {
        if (!pm.details || !pm.details.memo) {
          return true;
        }
        const isOneTime = ['one time', '一次'].some(t => pm.details.memo.toLowerCase().indexOf(t) >= 0);
        if (isOneTime) {
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
  async loadCycle() {
    const allCycles = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "cycle",
      query: {},
      projection: {
        createdAt: 1
      },
      limit: 1000000
    }).toPromise();

    allCycles.sort((c1, c2) => new Date(c1.createdAt).valueOf() - new Date(c2.createdAt).valueOf());
    this.isLastCycle = allCycles[allCycles.length - 1]._id === this.cycleId;
    const [existingCycle] = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "cycle",
      query: {
        _id: { $oid: this.cycleId }
      },
      projection: {
        restaurants: 0, // moved restaurants to new structure, so no need to load them!
      },
      limit: 1
    }).toPromise();

    this.cycle = existingCycle;

    const restaurantCycles = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: "restaurant-cycle",
      query: {
        "cycle._id": this.cycle._id
      },
      projection: {
        cycle: 0,
        "restaurant.error.screenshot": 0,
      }
    }, 7000); // assuming 7000

    // 02/01/2021: unfortunately, we've allowed duplicated restaurant-cycle in. So let's only keep the unique ones (first appearance)
    const appearedRestaurantIds = new Set();
    const uniqueOnes = restaurantCycles.filter(rc => {
      if (!appearedRestaurantIds.has(rc.restaurant._id)) {
        appearedRestaurantIds.add(rc.restaurant._id);
        return true;
      }
      return false;
    });
    this.restaurantCycleList = uniqueOnes;

    const invoices = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: "invoice",
      query: {
        "cycleId": this.cycle._id
      },
      projection: this.invoiceProjection,
    }, 7000); // assuming 7000
    this.invoiceList = invoices;

    this.invoiceList.map(invoice => {
      this.restaurantInvoiceDict[invoice.restaurant.id] = invoice;
    });
    // compute!
    this.computeAndSort();
  }

  private computeAndSort() {
    const allRows = this.restaurantCycleList.filter(rc => rc.restaurant).map(rc => ({ ...rc.restaurant, rcId: rc._id, invoice: this.restaurantInvoiceDict[rc.restaurant._id] }));
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
    this.blocks.SKIPPED_MANUAL.rows = allRows.filter(r => r.skipAutoInvoicing || this.skipAutoInvoicingRestaurants.has(r._id));
    this.sort();
  }

  async setActiveBlockName(blockName) {
    // await this.recalculate();
    this.activeBlockName = blockName;
    this.activeBlock = this.blocks[this.activeBlockName];
    this.filter();
  }

  sort(column?) {
    if (column) {
      if (this.sortingColumn === column) {
        this.sortingDirection *= -1;
      } else {
        this.sortingColumn = column;
      }
    }

    // perform sorting based on column and direction
    Object.keys(this.blocks).map(field => {
      this.blocks[field].rows.sort((r1, r2) => {
        switch (this.sortingColumn) {
          case 'balance':
            const b1 = (r1.invoice || {}).balance || 0;
            const b2 = (r2.invoice || {}).balance || 0;
            return this.sortingDirection * (b1 - b2);
          case 'name':
            return this.sortingDirection * (r1.name > r2.name ? 1 : -1);
          default:
            break;
        }
      });
    });

  }

  getPaymentMeans(row) {
    return this.paymentMeansDict[row._id + (row.invoice && row.invoice.balance > 0 ? 'Send' : 'Receive')];
  }

  isAutopay(row) {
    const item = this.paymentMeansDict[row._id + (row.invoice && row.invoice.balance > 0 ? 'Send' : 'Receive')];
    // return item.paymentMeans && item.paymentMeans.
  }

  isRowVisible(row) {
    const pmItem = this.getPaymentMeans(row) || {};
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
    this.qmenuCollectedTotal = 0;
    this.commissionTotal = 0;
    this.ccFeeTotal = 0;
    this.creditAdjustmentTotal = 0;
    this.debitAdjustmentTotal = 0;
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

          this.ccFeeTotal += row.invoice.stripeFee || 0;
          if (row.invoice.adjustment > 0) {
            this.creditAdjustmentTotal += row.invoice.adjustment;
          } else {
            this.debitAdjustmentTotal += row.invoice.adjustment;
          }

          this.total += balance;
          this.qmenuCollectedTotal += row.invoice.qMenuCcCollected || 0;
          const commission = (row.invoice.commission || 0) + (row.invoice.feesForQmenu || 0);
          this.commissionTotal += Math.abs(commission);
        }
      });
    }
  }

  private async reloadInvoice(invoiceId) {
    const [invoice] = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "invoice",
      query: {
        "_id": { $oid: invoiceId }
      },
      projection: this.invoiceProjection,
    }).toPromise(); // assuming 7000
    // update the invoiceList and restaurantInvoiceMap
    this.invoiceList = this.invoiceList.map(i => i._id === invoice._id ? invoice : i);
    this.restaurantInvoiceDict[invoice.restaurant.id] = invoice;
    this.computeAndSort();
  }

}
