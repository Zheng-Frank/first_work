import { GmbOwnership } from "./gmb-ownership";

/**
 * A business at google
 */
export class GmbBiz {
    _id: string;        // mongodb id
    cid: string;        // listing id, can be obtained from listing page
    place_id: string;   // place_id, can be obtained from listing page
    appealId: string;
    qmenuId: string;    // restaurant id

    origin: string;     // first scanned from GMB account
    name: string;
    phone: string;

    address: string;
    zipcode: string;

    gmbOwner: string;
    gmbWebsite: string;
    gmbOpen: boolean;
    menuUrls: string[];

    // 
    bizManagedWebsite: string;
    useBizWebsite: boolean;
    // qMenu related information (injected to listing once we have ownership)
    qmenuWebsite: string;
    qmenuPop3Email: string;
    qmenuPop3Host: string;
    qmenuPop3Password: string;

    score: number;
    agent: string;

    gmbOwnerships: GmbOwnership[] = [];

    ignoreGmbOwnershipRequest: boolean;

    comments: string;
    closed?: boolean;

    crawledAt: Date;
    updatedAt: Date;
    createdAt: Date;

    constructor(biz?: any) {
        if (biz) {
            // copy every fields
            for (const k in biz) {
                if (biz.hasOwnProperty(k)) {
                    this[k] = biz[k];
                }
            }
            ['createdAt', 'updatedAt', 'crawledAt'].map(dateField => {
                if (this[dateField]) {
                    this[dateField] = new Date((Date.parse(this[dateField])));
                }
            });
            if (this.gmbOwnerships && this.gmbOwnerships.length > 0) {
                this.gmbOwnerships = this.gmbOwnerships.map(o => new GmbOwnership(o));
            }
        }
    }

    /** test if the last ownership is one of the given emails */
    publishedIn(emails) {
        const lastOwnership = this.getLastGmbOwnership();
        return lastOwnership && (lastOwnership.status === 'Published' || !lastOwnership.status) && emails.indexOf(lastOwnership.email) >= 0;
    }
    suspendedIn(emails) {
        const lastOwnership = this.getLastGmbOwnership();
        return lastOwnership && lastOwnership.status === 'Suspended' && emails.indexOf(lastOwnership.email) >= 0;
    }
    getAccountEmail() {
        return (this.getLastGmbOwnership() || {})['email'];
    }

    getLastGmbOwnership() {
        if (this.gmbOwnerships && this.gmbOwnerships.length > 0) {
            return this.gmbOwnerships[this.gmbOwnerships.length - 1];
        }
        return undefined;
    }
}
