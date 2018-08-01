/**
 * 
 */
export class Ownership {
    id: string;        // every ownership has an id, which is generated from appealing. If granted, id won't change
    possessedOn : Date;
    gmbRequestId: string;
    email: string;  // the holder
    isQmenu: boolean;

    constructor(biz?: any) {
        if (biz) {
            // copy every fields
            for (const k in biz) {
                if (biz.hasOwnProperty(k)) {
                    this[k] = biz[k];
                }
            }
            // convert date to Date format
            this.possessedOn = new Date((Date.parse(biz.possessedOn)));
        }
    }
}
