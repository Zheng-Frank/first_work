/**
 * A service for pruning objects and performing minimal patch
 */
import { Injectable } from '@angular/core';

@Injectable()
export class TimezoneService {
    constructor() { }

    getOffsetToEST(restaurantTimezone: string) {
        if (restaurantTimezone) {
            const now = new Date();
            return (new Date(now.toLocaleString('en-US', { timeZone: restaurantTimezone })).valueOf() 
                        - new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' })).valueOf()) / 3600000;
        } else {
            return 0
        }
    }    
}
