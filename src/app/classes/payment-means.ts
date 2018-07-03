
export class PaymentMeans {
    type: 'Check' | 'Quickbooks' | 'Creditcard' | 'Stripe';
    /**
     * check: {images, accountNumber, routingNumber, accountAddress, account name}
     */
    details: any;

    images: any[];


}
