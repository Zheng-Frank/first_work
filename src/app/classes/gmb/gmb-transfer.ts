import { GmbAccount } from "./gmb-account";
import { GmbRequest } from "./gmb-request";
import { GmbBiz } from "./gmb-biz";

/**
 * GMB account
 */
export class GmbTransfer {
    fromEmail: string;
    toEmail: string;

    requestedAt: Date;
    rejectedAt: Date;
    appealedAt: Date;
    bizNotifiedAt: Date;
    codeObtainedAt: Date;
    verifiedAt: Date;
    completedAt: Date;

    request: any; // {"place_id":"ChIJS3D31kqf9YgR8OmAsPZAJZc","arci":4465959,"id1":1534815972,"id2":401000000}
    appealId: string;
    verificationMethod: 'Text' | 'Call' | 'Postcard' | 'Email';
    code;
    result: 'Failed' | 'Succeeded';

    constructor(transfer?: any) {
        if (transfer) {
            // copy every fields
            for (const k in transfer) {
                if (transfer.hasOwnProperty(k)) {
                    this[k] = transfer[k];
                }
            }
            
            ['requestedAt', 'rejectedAt', 'appealedAt', 'bizNotifiedAt', 'codeObtainedAt', 'verifiedAt', 'completedAt'].map(dateField => {
                if (transfer[dateField]) {
                    this[dateField] = new Date((Date.parse(transfer[dateField])));
                }
            });
        }
    }

}
