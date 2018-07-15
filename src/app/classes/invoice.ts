import { InvoicePayment } from "./invoice-payment";

export class Invoice {
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
  
  computeDerivedValues() {
    ['tax', 'tip', 'surcharge', 'deliveryCharge',
      'thirdPartyDeliveryCharge', 'thirdPartyDeliveryTip',
      'subtotal', 'adjustment', 'total', 'cashCollected',
      'qMenuCcCollected', 'restaurantCcCollected', 'ccProcessingFee',
      'stripeFee', 'commission', 'balance', 'rateAverage', 'totalPayments']
      .map(field => this[field] = this['get' + field[0].toUpperCase() + field.substr(1)]());
  }

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
      if(this.logs) {
        this.logs.map(log => log.time = new Date(log.time));
      }
      // let's sort orders by id
      this.orders = this.orders || [];
      this.orders.sort((o1, o2) => new Date(o1.createdAt).valueOf() - new Date(o2.createdAt).valueOf());
      this.createdAt = new Date(invoice.createdAt);
    }
  }

  getTax() {
    return (this.orders || []).reduce((sum, o) => sum + (+o.tax.toFixed(2) || 0) * (o.canceled ? 0 : 1), 0);
  }
  getTip() {
    return (this.orders || []).reduce((sum, o) => sum + (+(+o.tip).toFixed(2) || 0) * (o.canceled ? 0 : 1), 0);
  }

  getSurcharge() {
    return (this.orders || []).reduce((sum, o) => sum + (+(+o.surchargeAmount || 0).toFixed(2)) * (o.canceled ? 0 : 1), 0);
  }
  getSurchargeName() {
    for (let o of this.orders) {
      if (o.surchargeName) {
        return o.surchargeName;
      }
    }
    return 'surcharge';
  }
  getDeliveryCharge() {
    return (this.orders || []).reduce((sum, o) => sum + (+(+o.deliveryCharge).toFixed(2) || 0) * (o.canceled ? 0 : 1), 0);
  }

  getThirdPartyDeliveryCharge() {
    return (this.orders || []).reduce((sum, o) => sum + (o.deliveryBy ? (+(+o.deliveryCharge).toFixed(2) || 0) : 0) * (o.canceled ? 0 : 1), 0);
  }

  // right now driver takes 
  getThirdPartyDeliveryTip() {
    return (this.orders || []).reduce((sum, o) => sum + ((o.deliveryBy && o.paymentType === 'CREDITCARD') ? (+(+o.tip).toFixed(2) || 0) : 0) * (o.canceled ? 0 : 1), 0);
  }

  getSubtotal() {
    return (this.orders || []).reduce((sum, o) => sum + (+(+o.subtotal).toFixed(2) || 0) * (o.canceled ? 0 : 1), 0);
  }

  getAdjustment() {
    return (this.adjustments || []).reduce((sum, o) => sum + (+(+o.amount).toFixed(2) || 0), 0);
  }

  getTotal() {
    return (this.orders || []).reduce((sum, o) => sum + (+(+o.total).toFixed(2) || 0) * (o.canceled ? 0 : 1), 0);
  }

  getCashCollected() {
    // restaurant.creditCardProcessingMethod === 'Email' or order.paymentType === 'CASH'
    return (this.orders || []).reduce((sum, o) => sum + (o.paymentType === 'CASH' ? (+(+o.total).toFixed(2) || 0) : 0) * (o.canceled ? 0 : 1), 0);
  }

  getQMenuCcCollected() {
    return (this.orders || []).reduce((sum, o) => sum + ((o.paymentType === 'CREDITCARD' && o.payee === 'qMenu') ? (+(+o.total).toFixed(2) || 0) : 0) * (o.canceled ? 0 : 1), 0);
  }

  getRestaurantCcCollected() {
    return (this.orders || []).reduce((sum, o) => sum + ((o.paymentType === 'CREDITCARD' && o.payee === 'restaurant') ? (+(+o.total).toFixed(2) || 0) : 0) * (o.canceled ? 0 : 1), 0);
  }

  getStripeFee() {
    // restaurant.creditCardProcessingMethod === 'Email' or order.paymentType === 'CASH'
    return (this.orders || []).reduce((sum, o) => sum + ((o.paymentType === 'CREDITCARD' && o.payee === 'qMenu') ? (+((+(+o.total).toFixed(2)) * 0.029 + 0.30).toFixed(2) || 0) : 0) * (o.canceled ? 0 : 1), 0);
  }

  getCcProcessingFee() {
    return (this.orders || []).reduce((sum, o) => sum + (+(+o.ccProcessingFee).toFixed(2) || 0) * (o.canceled ? 0 : 1), 0);
  }

  getCommission() {
    return (this.orders || []).reduce((sum, o) => sum + ((+o.rate || 0) * +o.subtotal + (o.fixed ? o.fixed : 0)) * (o.canceled ? 0 : 1), 0);
  }

  // balance: from restaurant to qMenu
  getBalance() {
  
    return (this.previousBalance || 0) - this.getTotalPayments() + this.getStripeFee() - this.getQMenuCcCollected() + this.getCommission() - this.getAdjustment() + this.getThirdPartyDeliveryTip() + this.getThirdPartyDeliveryCharge();
  }

  hasCanceledOrders() {
    return (this.orders || []).some(o => o.canceled);
  }

  getRateAverage() {
    return this.getCommission() / this.getSubtotal();
  }

  getTotalPayments() {
    return (this.payments || []).reduce((sum, o) => sum + (+(+o.amount).toFixed(2) || 0), 0);
  }

}
