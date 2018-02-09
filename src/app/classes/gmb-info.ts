export interface GmbInfo {
    rating: number;
    totalReviews: number;
    gmbVerified: boolean;
    orderOnlineUrl: string;
    gmbOpen: boolean;
    cuisine: string;
    address: string;
    phone: string;
    serviceProviders: string[];
    menuUrls: string[];
    gmbWebsite: string;
    website: string;
    reservations: string[];
    gmbOwner?: string;
    closed: boolean;
}
