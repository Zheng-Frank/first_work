export class Transaction {
    _id?: string;
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
    logs?: object[];
    constructor(transaction?: any) {
        if (transaction) {
            // copy every fields
            ["_id", 'payer', 'payee', 'currency', 'means', 'description', 'inputUsername'].map(field => this[field] = transaction[field]);
            this.time = new Date(transaction.time);
            this.amount = +transaction.amount;
            this.exchangeRate = +transaction.exchangeRate;
            this.inputTime = new Date(transaction.inputTime);
            if (transaction.logs) {
              this.logs = transaction.logs.map(log => ({...log}));
            }
        }
    }
}
