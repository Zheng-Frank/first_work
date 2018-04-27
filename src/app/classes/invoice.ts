export class Invoice {
  id: string;
  fromDate: Date;
  toDate: Date;
  restaurant: any;      // a light weight restaurant obj containing necessary fields
  orders: any[];        // {id, time, order#, customer, type (Delivery/Dine/Pickup), subtotal, tax, tip, deliveryCharge, total, 
  //  lastStatus, paymentType, payee}
  adjustments: any[];  // {name, amount}
  logs: string[];         // {time, user, ip, action}, action in [CREATED, SENT, PAID]
  payments: any[];     // {time, payor, payee, amount, paymentMethod} currently we will have one payment but maybe more for each billing in future
  // paymentMethod: CASH, CREDITCARD {object to be defined}
  payee: string;
  isCanceled: boolean;
  isSent: 'boolean';
  isPaymentSent: 'boolean';
  isPaymentCompleted: 'boolean';
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
      // let's sort orders by id
      this.orders = this.orders || [];
      this.orders.sort((o1, o2) => new Date(o1.createdAt).valueOf() - new Date(o2.createdAt).valueOf());
      this.createdAt = new Date(invoice.createdAt);
    }
  }
  getTax() {
    return (this.orders || []).reduce((sum, o) => sum + (+o.tax.toFixed(2)) * (o.canceled ? 0 : 1), 0);
  }
  getTip() {
    return (this.orders || []).reduce((sum, o) => sum + (+(+o.tip).toFixed(2)) * (o.canceled ? 0 : 1), 0);
  }
  getTmeTip() {
    return (this.orders || []).reduce((sum, o) => sum + ((o.type === 'DELIVERY' && o.paymentType === 'CREDITCARD') ? +(+o.tip).toFixed(2) : 0) * (o.canceled ? 0 : 1), 0);
  }
  getSurcharge() {
    return (this.orders || []).reduce((sum, o) => sum + (+(+o.surchargeAmount).toFixed(2)) * (o.canceled ? 0 : 1), 0);
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
    return (this.orders || []).reduce((sum, o) => sum + (+(+o.deliveryCharge).toFixed(2)) * (o.canceled ? 0 : 1), 0);
  }
  getTmeDeliveryCharge() {
    return (this.orders || []).reduce((sum, o) => sum + ((o.type === 'DELIVERY') ? +(+o.deliveryCharge).toFixed(2) : 0) * (o.canceled ? 0 : 1), 0);
  }
  getSubtotal() {
    return (this.orders || []).reduce((sum, o) => sum + (+(+o.subtotal).toFixed(2)) * (o.canceled ? 0 : 1), 0);
  }
  getAdjustment() {
    return (this.adjustments || []).reduce((sum, o) => sum + (+(+o.amount).toFixed(2)), 0);
  }
  getTotal() {
    return (this.orders || []).reduce((sum, o) => sum + (+(+o.total).toFixed(2)) * (o.canceled ? 0 : 1), 0);
  }

  getCashCollected() {
    // restaurant.creditCardProcessingMethod === 'Email' or order.paymentType === 'CASH'
    return (this.orders || []).reduce((sum, o) => sum + (o.paymentType === 'CASH' ? +(+o.total).toFixed(2) : 0) * (o.canceled ? 0 : 1), 0);
  }

  getQMenuCollected() {
    return (this.orders || []).reduce((sum, o) => sum + ((o.paymentType === 'CREDITCARD' && o.payee === 'qMenu') ? +(+o.total).toFixed(2) : 0) * (o.canceled ? 0 : 1), 0);
  }

  getEmailCollected() {
    return (this.orders || []).reduce((sum, o) => sum + ((o.paymentType === 'CREDITCARD' && o.payee === 'restaurant') ? +(+o.total).toFixed(2) : 0) * (o.canceled ? 0 : 1), 0);
  }

  getStripeFee() {
    // restaurant.creditCardProcessingMethod === 'Email' or order.paymentType === 'CASH'
    return (this.orders || []).reduce((sum, o) => sum + ((o.paymentType === 'CREDITCARD' && o.payee === 'qMenu') ? +((+(+o.total).toFixed(2)) * 0.029 + 0.30).toFixed(2) : 0) * (o.canceled ? 0 : 1), 0);
  }

  getCommission() {
    return (this.orders || []).reduce((sum, o) => sum + (+o.rate * +o.subtotal + (o.fixed ? o.fixed : 0)) * (o.canceled ? 0 : 1), 0);
  }
  // balance: from restaurant to qMenu
  getBalance() {
    return this.getStripeFee() - this.getQMenuCollected() + this.getCommission() - this.getAdjustment();
  }
  getBalanceWithTme() {
    return this.getStripeFee() - this.getQMenuCollected() + this.getCommission() - this.getAdjustment() + this.getTmeTip() + this.getDeliveryCharge();
  }

  hasCanceledOrders() {
    return (this.orders || []).some(o => o.canceled);
  }

  getRateAverage() {
    return this.getCommission() / this.getSubtotal();
  }
}
