export class Log {
  time: Date;
  username: string;

  callerName: string;
  callerPhone: string;

  relatedOrderIds: string;

  problem: string;
  response: string;
  resolved: boolean;

  adjustmentAmount: number;
  adjustmentReason: string;
  adjustmentType: 'COMMISSION' | 'TRANSACTION';

  type: string;
  priorityDisplay?: boolean; // let log display at front of the table if it is true

  constructor(log?: any) {
    if (log) {
      // copy every fields
      for (const k in log) {
        if (log.hasOwnProperty(k)) {
          this[k] = log[k];
        }
      }

      // convert time string here!
      if (this.time && !(this.time instanceof Date)) {
        this.time = new Date(this.time);
      }
    }
  }
}
