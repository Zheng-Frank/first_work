import { OrderType } from "./order-type";
import { OrderPaymentMethod } from "./order-payment-method";
import { ChargeBasis } from "./charge-basis";

export class FeeSchedule {
    payer: 'CUSTOMER' | 'RESTAURANT' | 'QMENU';
    payee: string;
    fromTime: Date;
    toTime?: Date;
    name?: string;
    chargeBasis: ChargeBasis;
    createdBy?: string;
    createdAt?: number;

    constructor(fs?: any) {
        if (fs) {
            // copy every fields
            for (const k in fs) {
                if (fs.hasOwnProperty(k)) {
                    this[k] = fs[k];
                }
            }
        }

        // convert to Date type
        ['fromTime', 'toTime'].map(timeField => {
            if (this[timeField]) {
                this[timeField] = new Date(this[timeField]);
            }
        });

        // make deep copy
        ['orderTypes', 'orderPaymentMethods'].map(constraint => {
            if (this[constraint]) {
                this[constraint] = this[constraint].slice(0);
            }
        });
    }

    // the following fields are all optional
    rate?: number;
    amount?: number;
    monthlyAmount?: number;

    // constraints
    orderTypes?: OrderType[];
    orderPaymentMethods?: OrderPaymentMethod[];

}
