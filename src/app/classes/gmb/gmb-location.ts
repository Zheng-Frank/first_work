/**
 * A listing in GMB account
 * cid: public accessible id, ideally one to one to physical store (but duplicated listings exist)
 * appealId: each cid may have multiple appealIds
 * URLs: those are MY desired values. publically, it's decided by cid listing
 */
export class GmbLocation {
    appealId: string;           // '03080565160710167196'
    name: string;               // 'Golden China'
    address: string;            // '4001 South Decatur Boulevard #28, Las Vegas, NV 89103'
    phone: string;              // '7027766599'
    cuisine: string;            // 'Chinese restaurant'
    website: string;            // 'http://goldenchinadecaturtogo.com/'
    place_id: string;           // 'ChIJfXlrqr_GyIARdwm13nJOW5I'
    cid: string;                // '10546109207687793015'
    reservations: string[];     // [ 'http://goldenchinadecaturtogo.com/' ]
    menuUrls: string[];         // [ 'http://goldenchinadecaturtogo.com/' ]
    orderAheadUrls: string[];   // [ 'http://goldenchinadecaturtogo.com/' ] 
    statusHistory: any[];       // [{time: 'zzzzz', status: 'Suspended'}, ....] // let's store time DESC for easier access

    // status: 'Published' | 'Duplicate' | 'Pending verification' | 'Verification required' | 'Suspended';
    status: string;

    constructor(obj?: any) {
        if (obj) {
            // copy every fields
            for (const k in obj) {
                if (obj.hasOwnProperty(k)) {
                    this[k] = obj[k];
                }
            }

            this.statusHistory = (obj.statusHistory || []).map(h => ({
                time: new Date(h.time),
                status: h.status
            }));
        }
    }

}
