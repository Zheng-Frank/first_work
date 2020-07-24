// import { Address } from "@qmenu/ui"
import { CallLog } from "./call-log";

// Refer to: lead.ts

export class RestaurantWithCourier {
  _id: string;
  restaurantId: string; // To match with the restaurant database.
  cid: string;

  name: string;
  address: string;
  score: number;
  timeZone: string;
  agents: string[];

  courier: string;
  
  availability: string;
  checkedAt: string; // ISO string of date and time.

  callLogs: CallLog[]; //For now, use caller, time and comments only.

  constructor(data?: any, deepClone?: boolean){
    if(deepClone){
      if (data){
        for (let key in this){
          if (data.hasOwnProperty(key)){ // necessary???
            this[key] = JSON.parse(JSON.stringify(data[key]));
          }
        }
      }
    }
    else{
      if (data){
        for (let key in this){
          if (data.hasOwnProperty(key)){ // necessary???
            this[key] = data[key];
          }
        }
      }
    }
  }

  getLastCallLog() {
    if (this.callLogs && this.callLogs.length) {
      return this.callLogs[this.callLogs.length - 1];
    }
    return undefined;
  }
}
