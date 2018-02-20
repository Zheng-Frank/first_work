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
      this.address = new Address(this.address);

      // convert address to typeof Address
      this.callLogs = (this.callLogs || []).map(log => new CallLog(log));
      // convert time string here!
      if (this.createdAt) {
        this.createdAt = new Date(Date.parse(this.createdAt.toString()));
      }
      if (this.updatedAt) {
        this.updatedAt = new Date(Date.parse(this.updatedAt.toString()));
      }
    }
  }

  getSalesOutcome() {
    const sortedLogs = (this.callLogs || []).sort(
      (log1, log2) => log1.time.valueOf() - log2.time.valueOf()
    );
    if (sortedLogs.length > 0) {
      return sortedLogs[sortedLogs.length - 1].salesOutcome;
    }
    return undefined;
  }
}
