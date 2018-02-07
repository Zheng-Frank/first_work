import { Address } from '@qmenu/ui/bundles/ui.umd';

export class Lead {
    _id: string;
    name: string;
    address: Address;
    email: string;
    phones: string[];
    website: string;

    classifications: string[];

    // from google crawling
    rating: number;
    totalReviews: number;
    gmbVerified: boolean;
    gmbOpen: boolean;
    orderOnlineUrl: string;
    cuisine: string;
    menuUrls: string[];

    gmbWebsite: string;
    menuUrl: string;
    reservations: string[];
    serviceProviders: any[];

    disabled = false;

    createdAt: Date;
    updatedAt: Date;

    constructor(resturant?: any) {

        if (resturant) {
            // copy every fields
            for (const k in resturant) {
                if (resturant.hasOwnProperty(k)) {
                    this[k] = resturant[k];
                }
            }

            // convert address to typeof Address
            this.address = new Address(this.address);

            // convert time string here!
            if (this.createdAt) {
                this.createdAt = new Date(Date.parse(this.createdAt.toString()));
            }
            if (this.updatedAt) {
                this.updatedAt = new Date(Date.parse(this.updatedAt.toString()));
            }
        }
    }
}
