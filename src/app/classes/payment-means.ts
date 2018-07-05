
export class PaymentMeans {
    type: 'Check' | 'Quickbooks Invoicing' | 'Quickbooks Direct Withdraw' | 'Creditcard' | 'Stripe' | 'Direct Deposit';
    direction: 'Receive' | 'Send';
    details: any;
    images: any[];
}
/** Some examples */
const check1 = {
    type: 'Check',
    direction: 'Send'
}
const check2 = {
    type: 'Check',
    direction: 'Receive',
    details: {
        payee: 'Chris LLC',
        memo: 'Amazon Inc',
        address: '12809 Grant Ave, Harrison, NJ 30019'
    }
}

const quickbooks1 = {
    type: 'Quickbooks-Invoice',
    direction: 'Send'
}
const quickbooks2 = {
    type: 'Quickbooks-Direct-Withdraw',
    direction: 'Send',
    details: {
        routingNumber: 'xxxxxx',
        accountNumber: 'xxxxxx',
        name: 'Alex and Mary',
        address: 'some address....'
    }
}

const creditcard = {
    type: 'Creditcard',
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
    type: 'DirectDeposit',
    direction: 'Receive',
    details: {
        routingNumber: 'xxxxxx',
        accountNumber: 'xxxxxx',
        name: 'Alex and Mary',
        address: 'some address....'
    }
}