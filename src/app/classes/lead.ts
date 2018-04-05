import { Address } from "@qmenu/ui/bundles/qmenu-ui.umd";
import { CallLog } from "./call-log";

export class Lead {
  _id: string;
  name: string;
  oldName: string;
  address: Address;
  email: string;
  fax: string;
  phones: string[];
  contacts: string[];
  website: string;
  language: string;

  classifications: string[];

  // from google crawling
  rating: number;
  totalReviews: number;
  gmbVerified: boolean;
  gmbOpen: boolean;
  orderOnlineUrl: string;
  cuisine: string;
  menuUrls: string[];

  gmbWebsite: string;
  gmbScanned: boolean;
  gmbAccountOwner: string;
  inQmenu: boolean;
  gmbOwner: string;
  menuUrl: string;
  reservations: string[];
  serviceProviders: any[];

  closed: boolean; // some permanently closed!

  disabled = false;

  saleStatus: string;

  assignee: string;

  callLogs: CallLog[];

  createdAt: Date;
  updatedAt: Date;

  constructor(resturant?: any) {
    if (resturant) {
      // copy every fields
      for (const k in resturant) {
        if (resturant.hasOwnProperty(k)) {
          this[k] = resturant[k];
        }
      }

      // convert address to typeof Address
      if (typeof this.address === "string") {
        this.address = new Address({
          formatted_address: this.address
        });
      } else {
        this.address = new Address(this.address);
      }

      // convert address to typeof Address
      this.callLogs = (this.callLogs || []).map(log => new CallLog(log));
      // convert time string here!
      if (this.createdAt && !(this.createdAt instanceof Date)) {
        this.createdAt = new Date(this.createdAt);
      }
      if (this.updatedAt && !(this.updatedAt instanceof Date)) {
        this.updatedAt = new Date(this.updatedAt);
      }
    }
  }

  getDescSortedCallLogs() {
    const cloned = [...(this.callLogs || [])];
    return cloned.reverse();
  }

  getSalesOutcome() {
    const lastCallLog = this.getLastCallLog();
    if (lastCallLog) {
      return lastCallLog.salesOutcome;
    }
    return undefined;
  }

  getLastCallLog() {
    if (this.callLogs && this.callLogs.length > 0) {
      return this.callLogs[this.callLogs.length - 1];
    }
    return undefined;
  }
}
