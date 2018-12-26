export class Transaction {
    time: Date;
    payer: string;
    payee: string;
    amount: number;
    currency: string;
    exchangeRate: number;
    means: string;
    description: string;
    inputUsername: string;
    inputTime: Date;
    constructor(transaction?: any) {
        if (transaction) {
            // copy every fields
            ['payer', 'payee', 'currency', 'means', 'description', 'inputUsername'].map(field => this[field] = transaction[field]);
            this.time = new Date(transaction.time);
            this.amount = +transaction.amount;
            this.exchangeRate = +transaction.exchangeRate;
            this.inputTime = new Date(transaction.inputTime);
        
        }
    }
}