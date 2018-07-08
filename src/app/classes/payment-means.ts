
export class PaymentMeans {
    type: 'Check' | 'Quickbooks Invoicing' | 'Quickbooks Bank Withdraw' | 'Credit Card' | 'Stripe' | 'Direct Deposit' | 'Check Deposit';
    direction: 'Receive' | 'Send';
    details: any = {};
    images: any[];

    constructor(paymentMeans?: any) {
        if (paymentMeans) {
            // copy every fields
            for (const k in paymentMeans) {
                if (paymentMeans.hasOwnProperty(k)) {
                    this[k] = paymentMeans[k];
                }
            }
        }
        // at least have an empty body for easier data binding of UI elements
        this.details = this.details || {};
    }
}
/** Some examples */
const check1 = {
    type: 'Check',
    direction: 'Send'
}


const quickbooks1 = {
    type: 'Quickbooks Invoicing',
    direction: 'Send'
}
const quickbooks2 = {
    type: 'Quickbooks Bank Withdraw',
    direction: 'Send',
    details: {
        routingNumber: 'xxxxxx',
        accountNumber: 'xxxxxx',
        name: 'Alex and Mary',
        address: 'some address....'
    }
}

const creditcard = {
    type: 'Credit Card',
    direction: 'Send',
    details: {
        cardNumber: 'encryptednumber',
        cvv: 'encryptedCvv',
        expiry: '12/30/2018',
        nameOnCard: 'Alex Lee'
    }
}

const stripe = {
    type: 'Stripe',
    direction: 'Send'
}

const directDeposit = {
    type: 'Direct Bank Deposit',
    direction: 'Receive',
    details: {
        routingNumber: 'xxxxxx',
        accountNumber: 'xxxxxx',
        name: 'Alex and Mary',
        address: 'some address....'
    }
}

const check2 = {
    type: 'Check Deposit',
    direction: 'Receive',
    details: {
        payee: 'Chris LLC',
        memo: 'Amazon Inc',
        address: '12809 Grant Ave, Harrison, NJ 30019'
    }
}