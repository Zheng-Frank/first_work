/**
 * GMB account
 */
export class GmbAccount {
    id: string;
    email: string;  // let's use this as key
    password: string;
    constructor(gmb?: any) {
        if (gmb) {
            // copy every fields
            gmb.id = gmb.id || gmb._id;
            for (const k in gmb) {
                if (gmb.hasOwnProperty(k)) {
                    this[k] = gmb[k];
                }
            }
        }
    }
}
