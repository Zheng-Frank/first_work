export interface PhoneOrdering {
    _id?: string;
    restaurantNumber: string;
    proxyNumber: string;
    proxyServiceProvider?: string;
    ivrNumber: string;
    restaurantCallbackNumber?: string;
    disabledAt?: Date;
    createdAt?: Date;
}
