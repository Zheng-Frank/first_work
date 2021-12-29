export class User {
  _id: string;
  username: string;
  password: string;
  manager: string;
  roles: string[];
  createdAt: Date;
  updatedAt: Date;
  disabled: boolean;
  languages: string;
  ivrUsername?: string;
  notes: string; // record some managed info of a user includes  Paypal username, Label, Email, Phone, Skype, Notes limit 1000 characters

  constructor(user?: any) {
    if (user) {
      // copy every fields
      for (const k in user) {
        if (user.hasOwnProperty(k)) {
          this[k] = user[k];
        }
      }
      // convert time string here!
      if (this.createdAt && !(this.createdAt instanceof Date)) {
        this.createdAt = new Date(this.createdAt);
      }
      if (this.updatedAt && !(this.updatedAt instanceof Date)) {
        this.updatedAt = new Date(this.updatedAt);
      }
    }
  }
}
