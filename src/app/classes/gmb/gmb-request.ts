/**
 * An ownership request against a current ownership
 */
export class GmbRequest {
    id: string;
    againstOwnershipId: string;
    date: Date;
    requester: string;
    phone: string;
    email: string;
    constructor(request?: any) {
        if (request) {
            // copy every fields
            for (const k in request) {
                if (request.hasOwnProperty(k)) {
                    this[k] = request[k];
                }
            }
            // convert date to Date format
            this.date = new Date((Date.parse(request.date)));
        }
    }
}
