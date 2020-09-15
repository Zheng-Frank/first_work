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
            return 0;
        }
    }
    
    getOffsetNumber(timezone: string) {
        if (timezone) {
            const now = new Date();
            const offset = (new Date(now.toLocaleString('en-US', { timeZone: timezone })).valueOf() 
                            - new Date(now.toLocaleString('en-US')).valueOf()) / 3600000;
            if (offset > 0) {
                return "+" + offset;
            } else {
                return offset;
            }
        } else {
            return "+0";
        }
    }

    transformToTargetTime(date: any, timezone: string) {
        const clone = new Date(date);
        const temp = new Date(clone.toLocaleString('en-US', { timeZone: timezone }));
        const offset = clone.getHours() - temp.getHours() + (clone.getDate() - temp.getDate()) * 24;
        clone.setHours(clone.getHours() + offset);
        return clone;
    }

    transformToTargetTimeUsingCurrentOffset(date: any, timezone: string) {
        const clone = new Date(date);
        const temp1 = new Date();
        const temp2 = new Date(new Date().toLocaleString('en-US', { timeZone: timezone }));
        const offset = temp1.getHours() - temp2.getHours() + (temp1.getDate() - temp2.getDate()) * 24;
        clone.setHours(clone.getHours() + offset);
        return clone;
    }
}
