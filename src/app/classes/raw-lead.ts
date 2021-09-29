import { Campaign } from "./campaign";

export class RawLead {
    _id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zipcode: string;

    latitude?: number;
    longitude?: number;
    phone: string;
    crawledAt?: Date;
    googleListing?: any;
    // ... a lot to be added
    restaurant: any;
    contacts?: string[];

    // more fields during campaign/sales process
    assignee?: string;
    assignedAt?: Date;
    campaigns?: Campaign[];
    constructor(lead?: any) {
        if (lead) {
            // copy every fields
            for (const k in lead) {
                if (lead.hasOwnProperty(k)) {
                    this[k] = lead[k];
                }
            }

            // convert all date fields
            ['crawledAt'].map(df => {
                if (this[df]) {
                    this[df] = new Date(this[df]);
                }
            });
        }
    }
}
