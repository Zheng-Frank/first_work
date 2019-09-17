import { GmbAccount } from "./gmb-account";
import { GmbRequest } from "./gmb-request";
import { GmbBiz } from "./gmb-biz";

/**
 * GMB account
 */
export class GmbTransfer {
    againstEmail: string;   // usually enemy's email causing transfer
    fromEmail: string;
    toEmail: string;

    requestedAt: Date;
    rejectedAt: Date;
    appealedAt: Date;
    bizNotifiedAt: Date;
    codeObtainedAt: Date;
    verifiedAt: Date;
    websiteUpdatedAt: Date;
    completedAt: Date;

    request: any; // {"place_id":"ChIJS3D31kqf9YgR8OmAsPZAJZc","arci":4465959,"id1":1534815972,"id2":401000000}
    appealId: string;
    locationName: string; // GMB's own location key "accounts/115758008298199238439/locations/15261144277233140818"
    verificationMethod: 'Text' | 'Call' | 'Postcard' | 'Email';
    code;
    result: 'Canceled' | 'Failed' | 'Succeeded';
    verificationOptions: any;

    constructor(transfer?: any) {
        if (transfer) {
            // copy every fields
            for (const k in transfer) {
                if (transfer.hasOwnProperty(k)) {
                    this[k] = transfer[k];
                }
            }
            
            ['requestedAt', 'rejectedAt', 'appealedAt', 'bizNotifiedAt', 'codeObtainedAt', 'verifiedAt', 'completedAt', 'websiteUpdatedAt'].map(dateField => {
                if (transfer[dateField]) {
                    this[dateField] = new Date((Date.parse(transfer[dateField])));
                }
            });
        }
    }

}
