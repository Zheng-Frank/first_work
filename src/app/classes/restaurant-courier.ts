import { CallLog } from "./call-log";

export class RestaurantWithCourier {
  _id: string = null;
  restaurantId: string = null; // To match with the restaurant database.

  name: string = null;
  address: string = null;
  score: number = null;
  timeZone: string = null;

  disabled = false;

  courier: string = null;

  availability: string = null; // {"signed up", "available", "not available", "unknown", null}
  checkedAt: string = null; // ISO string of date and time.

  callLogs: CallLog[] = null; // For now, use caller, time and comments only. // Reverse chronological order
  callers: string[] = null; // Reverse chronological order. No duplicates.
  callLogNew: CallLog = null; // Temporary variable.
  comments: string = null; // Temporary variable.

  constructor(data?: any) {
    if (data) {
      for (let key in this) {
        if (this.hasOwnProperty(key) && data.hasOwnProperty(key)) {
          this[key] = JSON.parse(JSON.stringify(data[key]));
        }
      }
    }
    this.callLogs = (this.callLogs || []).map(log => new CallLog(log));
    this.callLogNew = new CallLog(this.callLogNew);
  }
}
