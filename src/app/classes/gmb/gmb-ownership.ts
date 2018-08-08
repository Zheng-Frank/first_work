/**
 * 
 */
export class GmbOwnership {
    oid: string;        // every ownership has an id, which is generated from appealing. If granted, id won't change
    possessedAt : Date;
    gmbRequestId: string;
    email: string;  // the holder

    constructor(obj?: any) {
        if (obj) {
            // copy every fields
            for (const k in obj) {
                if (obj.hasOwnProperty(k)) {
                    this[k] = obj[k];
                }
            }
            // convert date to Date format
            this.possessedAt = new Date((Date.parse(obj.possessedAt)));
        }
    }
}
