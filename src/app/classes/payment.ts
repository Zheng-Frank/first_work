/**
 * @description A payment is a form of money transfer from one party to another
 */

export class Payment {
    restaurant: any;    // {}
    amount: number;
    sentAt: Date;
    receivedAt: Date;
    clearedAt: Date;
    type: 'Cash' | 'Check' | 'Stripe';
}