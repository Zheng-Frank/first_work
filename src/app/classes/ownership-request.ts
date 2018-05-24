export class OwnershipRequest {
    id: string;
    business: string;
    date: Date;
    isReminder: boolean;
    requester: string;
    phone: string;
    email: string;
    isHandled: boolean;
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
