import { Hour } from "@qmenu/ui";
import { CourierPricingItem } from "./courier-pricing-item";
export class CourierPricing {
    items: CourierPricingItem[];
    hours: Hour[];

    constructor(cp: any) {
        if (cp) {
            // copy every fields
            for (const k in cp) {
                if (cp.hasOwnProperty(k)) {
                    this[k] = cp[k];
                }
            }
        }
        // convert hours to Hours type
        if (this.hours) {
            this.hours = this.hours.map(h => new Hour(h));
        }
        if (this.items) {
            this.items = this.items.map(i => new CourierPricingItem(i));
        }
    }
}
