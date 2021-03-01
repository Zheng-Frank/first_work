export class TimezoneHelper {
    /** 
     * @param date
     * @param timezone
     * @returns a target date which would look like the same as your browser from that timezone 
     */
    static transformToTimezoneDate(date: Date, timezone: string) {
        const localeString = date.toLocaleString("us-en", { timeZone: timezone });
        console.log("localeString:"+localeString);
        const targetDate = new Date(localeString);
        console.log("targetDate:"+targetDate);
        const diff = targetDate.valueOf() - date.valueOf();
        targetDate.setMilliseconds(targetDate.getMilliseconds() + 2 * diff);
        return targetDate;
    }
}
