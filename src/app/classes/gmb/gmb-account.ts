/**
 * GMB account
 */
export class GmbAccount {
    _id: string;
    email: string;  // let's use this as key
    password: string;
    gmbScannedAt: Date;
    emailScannedAt: Date;
    constructor(gmb?: any) {
        if (gmb) {
            // copy every fields
            for (const k in gmb) {
                if (gmb.hasOwnProperty(k)) {
                    this[k] = gmb[k];
                }
            }
            ['gmbScannedAt', 'emailScannedAt'].map(dateField => {
                if(gmb[dateField]) {
                    this[dateField] = new Date((Date.parse(gmb[dateField])));
                }
            });
        }
    }
}
