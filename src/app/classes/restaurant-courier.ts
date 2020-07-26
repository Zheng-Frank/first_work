// import { Address } from "@qmenu/ui"
import { CallLog } from "./call-log";

// Refer to: lead.ts

export class RestaurantWithCourier {
  _id: string = null;
  restaurantId: string = null; // To match with the restaurant database.
  cid: string = null;

  name: string = null;
  address: string = null;
  score: number = null;
  timeZone: string = null;
  agents: string[] = null;

  courier: string = null;

  availability: string = null;
  checkedAt: string = null; // ISO string of date and time.

  callLogs: CallLog[] = null; //For now, use caller, time and comments only.
  callers: string[] = null;
  // callerMostRecent: string = null;
  callLogNew: CallLog = null;
  comments: string = null;
  // constructor1(data?: Partial<RestaurantWithCourier>){
  //   console.log(data);
  //   Object.assign(this, data);
  //   console.log(this);
  // }
  constructor(data?: any) {
    if (data) {
      for (let key in this) {
        if (this.hasOwnProperty(key) && data.hasOwnProperty(key)) { // necessary???
          // this[key] = this[key].constructor(data[key]);
          this[key] = JSON.parse(JSON.stringify(data[key]));
        }
      }
    }
    this.callLogs = (this.callLogs || []).map(log => new CallLog(log));
    this.callLogNew = new CallLog(this.callLogNew);
  }

  // getLastCallLog():CallLog {
  //   if (this.callLogs && this.callLogs.length) {
  //     return this.callLogs[this.callLogs.length - 1];
  //   }
  //   return undefined;
  // }
}
