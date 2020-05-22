import { CourierPricing } from "./courier-pricing";
export class Courier {
    _id: string;
    name: string;
    pricing: CourierPricing[];

    constructor(courier: any) {
        if (courier) {
            // copy every fields
            for (const k in courier) {
                if (courier.hasOwnProperty(k)) {
                    this[k] = courier[k];
                }
            }
        }
        if (this.pricing) {
            this.pricing = this.pricing.map(p => new CourierPricing(p));
        }
    }
}
