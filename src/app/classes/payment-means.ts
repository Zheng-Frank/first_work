
export class PaymentMeans {
    type: 'CHECK' | 'QUICK_BOOK' | 'CREDIT_CARD' | 'STRIPE';
    /**
     * check: {images, accountNumber, routingNumber, accountAddress, account name}
     */
    details: any;

    images: any[];


}
