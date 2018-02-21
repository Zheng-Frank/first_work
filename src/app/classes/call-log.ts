export class CallLog {
    phone: string;
    caller: string;
    callees: string[];
    time: Date;

    salesOutcome: string;
    rejectedReasons: string[];
    callbackTime;

    lineStatus: string; // busy, connected, left message

    askedMoreInfo: boolean;
    ownerIsBusy: boolean;
    ownerIsAbsent: boolean;

    comments: string;
    
    constructor(callog?: any) {
        if (callog) {
            // copy every fields
            for (const k in callog) {
                if (callog.hasOwnProperty(k)) {
                    this[k] = callog[k];
                }
            }

            // convert time string here!
            if (this.time) {
                this.time = new Date(Date.parse(this.time.toString()));
            }
        }
    }
}
