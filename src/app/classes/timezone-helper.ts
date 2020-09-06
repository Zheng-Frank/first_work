export class TimezoneHelper {
    /** 
     * @param date
     * @param timezone
     * @returns a target date which would look like the same as your browser from that timezone 
     */
    static transformToTimezoneDate(date: Date, timezone: string) {
        console.log('before', date, 'timzone', timezone);
        const localeString = date.toLocaleString("us-en", { timeZone: timezone });
        const targetDate = new Date(localeString);
        const diff = targetDate.valueOf() - date.valueOf();
        console.log('diff=', diff);
        targetDate.setMilliseconds(targetDate.getMilliseconds() + 2 * diff);
        console.log('target=', targetDate);
        return targetDate;
    }
}
