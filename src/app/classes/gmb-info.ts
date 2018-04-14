export interface GmbInfo {
    name: string;
    rating: number;
    totalReviews: number;
    gmbVerified: boolean;
    orderOnlineUrl: string;
    gmbOpen: boolean;
    cuisine: string;
    address: any;
    phone: string;
    serviceProviders: string[];
    menuUrls: string[];
    gmbWebsite: string;
    website: string;
    reservations: string[];
    gmbOwner?: string;
    gmbAccountOwner?: string;
    closed: boolean;
}
