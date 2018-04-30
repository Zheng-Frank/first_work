/**
 * @description A payment is a dollar amount paid from restaurant to qMenu. If the amount is negative, then qMenu pays restaurant
 */
export interface InvoicePayment {
    time: Date;
    amount: number;
    paymentMethod: string;
}
