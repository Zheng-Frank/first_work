/**
 * A step for transferring
 */
export class Step {
    name: string;
    performedAt?: Date;
    performedBy?: string;

    constructor(step?: any) {
        if (step) {
            // copy every fields
            for (const k in step) {
                if (step.hasOwnProperty(k)) {
                    this[k] = step[k];
                }
            }
            ['performedAt'].map(dateField => {
                if (this[dateField]) {
                    this[dateField] = new Date((Date.parse(this[dateField])));
                }
            });
        }
    }

}
