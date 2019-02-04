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
    useBizWebsiteForAll: boolean;

    // qMenu related information (injected to listing once we have ownership)
    qmenuWebsite: string;
    qmenuPop3Email: string;
    qmenuPop3Host: string;
    qmenuPop3Password: string;

    score: number;
    agent: string;

    ignoreGmbOwnershipRequest: boolean;

    comments: string;
    closed?: boolean;

    crawledAt: Date;
    updatedAt: Date;
    createdAt: Date;

    disableAutoTask: boolean;


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
        }
    }

}
