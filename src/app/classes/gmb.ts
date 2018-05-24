import { Business } from './business';

export class Gmb {
    id: string;
    email: string;
    password: string;
    businesses: Business[];
    constructor(gmb?: any) {
        if (gmb) {
            // copy every fields
            gmb.id = gmb.id || gmb._id;
            for (const k in gmb) {
                if (gmb.hasOwnProperty(k)) {
                    this[k] = gmb[k];
                }
            }
            // convert businesses
            this.businesses = (this.businesses || []).map(b => new Business(b));
        }
    }
}
