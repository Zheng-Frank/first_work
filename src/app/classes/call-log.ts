export class CallLog {
  phone: string;
  caller: string;
  callees: string[];
  time: Date;

  salesOutcome: string;
  rejectedReasons: string[];
  callbackTime;

  lineStatus: string; // badNumber, busy, connected, left message

  hangupImmediately: boolean;
  askedMoreInfo: boolean;
  ownerIsBusy: boolean;
  ownerIsAbsent: boolean;
  updatedLanguage: boolean;

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
      if (this.time && !(this.time instanceof Date)) {
        this.time = new Date(this.time);
      }

      // deep clone rejectedReasons
      if (this.rejectedReasons) {
        this.rejectedReasons = JSON.parse(JSON.stringify(this.rejectedReasons));
        if(!Array.isArray(this.rejectedReasons)) {
          console.log('ERROR IN DB');
          this.rejectedReasons = [];
        }
      }
    }
  }

  hasSameTimeAs(another) {
    return (
      this.time &&
      another &&
      another.time &&
      this.time.valueOf() === another.time.valueOf()
    );
  }
}
