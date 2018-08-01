import { Ownership } from "./ownership";

/**
 * A business at google
 */
export class Biz {
    cid: string;        // listing id, can be obtained from listing page
    place_id: string;   // place_id, can be obtained from listing page
    qmenuId: string;

    id: string; // restaurant id
    name: string;
    phone: string;
    zipcode: string;
    homepage: string;
    address: string;  

    // qMenu related information (injected to listing once we have ownership)
    qWebsite: string;
    qPop3Email: string;
    qPop3Host: string;
    qPop3Password: string;

    score: number;

    ownerships: Ownership[] =[];

    constructor(biz?: any) {
        if (biz) {
            // copy every fields
            for (const k in biz) {
                if (biz.hasOwnProperty(k)) {
                    this[k] = biz[k];
                }
            }
            if(this.ownerships && this.ownerships.length > 0) {
                this.ownerships = this.ownerships.map(o => new Ownership(o));
            }
        }
    }
}
