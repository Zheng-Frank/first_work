export class TimezoneHelper {
    /** 
     * @param date
     * @param timezone
     * @returns a target date which would look like the same as your browser from that timezone 
     */
    static transformToTimezoneDate(date: Date, timezone: string) {
        const localeString = date.toLocaleString("us-en", { timeZone: timezone });
        const targetDate = new Date(localeString);
        const diff = targetDate.valueOf() - date.valueOf();
        targetDate.setMilliseconds(targetDate.getMilliseconds() - diff);
        return targetDate;
    }
}
