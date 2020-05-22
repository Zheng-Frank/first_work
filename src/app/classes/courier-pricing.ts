import { Hour } from "@qmenu/ui";
export class CourierPricing {
    base: number;
    perMile: number;
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
    }
}
