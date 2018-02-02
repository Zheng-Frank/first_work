import * as deep from 'deep-diff';
const deepDiff = deep.default.diff;

export class DeepDiff {

    kind: string; // NDEA => New, Delete, Edit, Array 
    path: any[];
    lhs: any;
    rhs: any;
    index?: number;
    item?: any; // {kind: 'NDEA', rhs:, lhs}

    constructor(diff?: any) {
        if (diff) {
            // copy every fields
            for (const k in diff) {
                if (diff.hasOwnProperty(k)) {
                    this[k] = diff[k];
                }
            }
        }
    }

    static getDiff(original, compared) {
        return deepDiff(original, compared).map(d => new DeepDiff(d));
    }

    toMongo() {

        const mobj = {};
        let path = this.path.join('.');

        switch (this.kind) {
            case 'N':   // new
            case 'E':   // edit ==> update
                // if however undefined as value, we should treat that as delete?
                if (this.rhs === undefined) {
                    mobj['$unset'] = {};
                    mobj['$unset'][path] = '';
                } else {
                    mobj['$set'] = {};
                    mobj['$set'][path] = this.rhs;
                }
                break;
            case 'D':
                mobj['$unset'] = {};
                mobj['$unset'][path] = '';
                break;
            case 'A':   // array situation!
                switch (this.item.kind) {
                    case 'N':   // new
                        mobj['$push'] = {};
                        mobj['$push'][path] = this.item.rhs;
                        break;
                    case 'E':   // edit ==> update
                        mobj['$set'] = {};
                        mobj['$set'][path + '.' + this.index] = this.item.rhs;
                    case 'D':
                        // noway to splice at index. So do this:
                        // $set a random value;
                        // $pull that value out :(
                        throw 'not yet implemented'
                        break;
                    default:
                        throw 'Terrible, not captured deepDiff!';
                }
                break;
            default:
                throw 'Terrible, not captured deepDiff!';
        }
        return mobj;
    }
}
