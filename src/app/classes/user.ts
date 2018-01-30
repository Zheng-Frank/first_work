export class User {
    _id: string;
    username: string;
    manager: string;
    roles: string[];
    createdAt: Date;
    updatedAt: Date;

    constructor(user?: any) {
        if (user) {
            // copy every fields
            for (const k in user) {
                if (user.hasOwnProperty(k)) {
                    this[k] = user[k];
                }
            }
            // convert time string here!
            if (this.createdAt) {
                this.createdAt = new Date(Date.parse(this.createdAt.toString()));
            }
            if (this.updatedAt) {
                this.updatedAt = new Date(Date.parse(this.updatedAt.toString()));
            }
        }
    }
}
