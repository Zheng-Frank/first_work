import { GmbLocation } from "./gmb-location";

/**
 * GMB account
 */
export class GmbAccount {
    _id: string;
    email: string;  // let's use this as key
    password: string;
    gmbScannedAt: Date;
    emailScannedAt: Date;
    allLocations: number;
    published: number;
    suspended: number;
    pagerSize: number;
    comments: string;
    type:string;
    recoveryEmail:string;
    postcardId:string;
    locations: GmbLocation []; 
    suspendedInPastDay: number;
    disabled: boolean;
    isAgencyAcct = false;
    isYelpEmail = false;
    constructor(gmb?: any) {
        if (gmb) {
            // copy every fields
            for (const k in gmb) {
                if (gmb.hasOwnProperty(k)) {
                    this[k] = gmb[k];
                }
            }
            ['gmbScannedAt', 'emailScannedAt'].map(dateField => {
                if (gmb[dateField]) {
                    this[dateField] = new Date((Date.parse(gmb[dateField])));
                }
            });

            this.locations = (gmb.locations || []).map(loc => new GmbLocation(loc));
        }
    }

    getAccountScore(days) {
        return this.locations.map(loc => loc.getLocationScore(days)).reduce((prev, current) => prev + current, 0);
    }
}
