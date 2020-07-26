export class CourierPricingItem {
    distance: number;
    orderMinimum: number;
    charge: number;

    constructor(i: any) {
        if (i) {
            // copy every fields
            for (const k in i) {
                if (i.hasOwnProperty(k)) {
                    this[k] = i[k];
                }
            }
        }
    }
}
