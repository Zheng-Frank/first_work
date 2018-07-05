import { PaymentMeans } from './payment-means';
/**
 * @description A payment is a form of money transfer from one party to another
 */

export class Payment {
    payer: any;
    payee: any;
    amount: number;
    sentAt: Date;
    receivedAt: Date;
    clearedAt: Date;
    means: PaymentMeans
}