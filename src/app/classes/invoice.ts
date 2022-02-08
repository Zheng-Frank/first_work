import { InvoicePayment } from "./invoice-payment";

export class Invoice {
  _id: string;
  id: string;
  fromDate: Date;
  toDate: Date;
  restaurant: any;      // a light weight restaurant obj containing necessary fields
  orders: any[];        // {id, time, order#, customer, type (Delivery/Dine/Pickup), subtotal, tax, tip, deliveryCharge, total,
  //  lastStatus, paymentType, payee}
  adjustments: any[];  // {name, amount}
  logs: any[];         // {time, user, ip, action}, action in [CREATED, SENT, PAID]
  payments: InvoicePayment[];
  // paymentMethod: CASH, CREDITCARD {object to be defined}
  isCanceled: boolean;
  isSent: 'boolean';
  isPaymentSent: 'boolean';
  isPaymentCompleted: 'boolean';

  // those fields values are for tracking things faster (need maintain integrity using computeDerivedValues())
  tax: number;
  tip: number;
  surcharge: number;
  deliveryCharge: number;
  thirdPartyDeliveryCharge: number;
  thirdPartyDeliveryTip: number;
  subtotal: number;
  adjustment: number;
  total: number;
  cashCollected: number;
  qMenuCcCollected: number;
  restaurantCcCollected: number;
  stripeFee: number;
  commission: number;
  ccProcessingFee: number; // customer paid as part of an order
  // balance: from restaurant to qMenu
  balance: number;
  rateAverage: number;
  totalPayments: number;

  paymentInstructions: string;

  feesForRestaurant: number;
  feesForQmenu: number;


  previousBalance: number;
  previousInvoiceId: string;

  createdAt: Date;
  constructor(invoice?: Invoice) {
    if (invoice) {
      // copy every fields
      for (const k in invoice) {
        if (invoice.hasOwnProperty(k)) {
          this[k] = invoice[k];
        }
      }
      // parse fromDate and toDate
      this.fromDate = new Date(invoice.fromDate);
      this.toDate = new Date(invoice.toDate);

      // parse logs
      if (this.logs) {
        this.logs.map(log => log.time = new Date(log.time));
      }
      // let's sort orders by id
      this.orders = this.orders || [];
      this.orders.sort((o1, o2) => new Date(o1.createdAt).valueOf() - new Date(o2.createdAt).valueOf());
      this.createdAt = new Date(invoice.createdAt);
    }
  }

  getPreviousPayments() {
    return (this.payments || []).filter(payment => !payment.date || new Date(payment.date) <= new Date(this.createdAt)).reduce((sum, o) => sum + (+(+o.amount).toFixed(2) || 0), 0);
  }

  hasCanceledOrders() {
    return (this.orders || []).some(o => o.canceled);
  }
}
