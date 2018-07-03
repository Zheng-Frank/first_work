export class Log {
    time: Date;
    user: string;
    
    customerName: string;
    customerPhone: string;
    relatedOrderIds: string[];

    problem: string;
    response: string;
    resolved: boolean; // deterines stickiness
  
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
  