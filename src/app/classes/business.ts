import { OwnershipRequest } from './ownership-request';
import { PostcardAction } from './postcard-action';

export class Business {
    id: string;
    name: string;
    website: string;
    pop3Email: string;
    pop3Host: string;
    pop3Password: string;
    phone: string;
    zipcode: string;
    homepage: string;
    address: string;
    isPublished: boolean;
    ownershipRequests: OwnershipRequest[];
    postcardActions: PostcardAction[]; // {time, action, result}
    constructor(biz?: any) {
        if (biz) {
            // copy every fields
            for (const k in biz) {
                if (biz.hasOwnProperty(k)) {
                    this[k] = biz[k];
                }
            }
            // convert businesses
            this.ownershipRequests = (this.ownershipRequests || []).map(o => new OwnershipRequest(o));
            
            // convert postcardActions
            this.postcardActions = (this.postcardActions || []).map(p => new PostcardAction(p));
        }
    }

    getDaysAgo(now: Date, date: Date) {
        return Math.round(Math.abs(now.valueOf() - date.valueOf()) / 8.64e7);
    }

    equals(another: Business) {
        return this.name === another.name && this.address === another.address && this.phone === another.phone;
    }

    getStatus(now: Date) {

        if ((this.isPublished && this.ownershipRequests || []).some(r => !r.isHandled && (this.getDaysAgo(now, r.date) >= 5 || r.isReminder))) {
            return 'danger';
        }

        if ((this.isPublished && this.ownershipRequests || []).some(r => r.isReminder && !r.isHandled && this.getDaysAgo(now, r.date) >= 3)) {
            return 'danger';
        }

        if ((this.isPublished && this.ownershipRequests || []).some(r => !r.isHandled && this.getDaysAgo(now, r.date) >= 3)) {
            return 'warning';
        }
        if ((this.isPublished && this.ownershipRequests || []).some(r => !r.isHandled && this.getDaysAgo(now, r.date) >= 0)) {
            return 'info';
        }

        if (this.isPublished) {
            return 'success';
        }
        return 'secondary';
    }
}
