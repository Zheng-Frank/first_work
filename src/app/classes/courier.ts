import { CourierPricing } from "./courier-pricing";
export class Courier {
    _id: string;
    name: string;
    pricings: CourierPricing[];
    drivers: any[];
    constructor(courier: any) {
        if (courier) {
            // copy every fields
            for (const k in courier) {
                if (courier.hasOwnProperty(k)) {
                    this[k] = courier[k];
                }
            }
        }
        if (this.pricings) {
            this.pricings = this.pricings.map(p => new CourierPricing(p));
        }
    }
}
