import * as deep from 'deep-diff';
const deepDiff = deep.default.diff;

export class DeepDiff {
    _id: string;
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

    static getDiff(_id, original, compared, ignoredFields?: string[]) {
        const originalClone = JSON.parse(JSON.stringify(original));
        const comparedClone = JSON.parse(JSON.stringify(compared));

        (ignoredFields || []).map(field => {
            delete originalClone[field];
            delete comparedClone[field];
        });
        const diffs = deepDiff(originalClone, comparedClone);
        return (diffs || []).map(d => {
            d._id = _id;
            // we should treat === undefined as deleting that field!
            if ((d.kind === 'E' || d.kind === 'N') && d.rhs === undefined) {
                d.kind = 'D';
            }
            return new DeepDiff(d);
        });
    }

    toMongo() {

        const mobj = {};
        const path = this.path.join('.');

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
                        break;
                    case 'D':
                        // noway to splice at index. So do this:
                        // $set a random value;
                        mobj['$set'] = {};
                        mobj['$set'][path + '.' + this.index] = '____randomgarbage';
                        // $pull that value out :(
                        mobj['$pull'] = {};
                        mobj['$pull'][path + '.' + this.index] = { $in: ['____randomgarbage'] };
                        break;
                    default:
                        throw { errorMessage: 'Terrible, not captured deepDiff!' };
                }
                break;
            default:
                throw { errorMessage: 'Terrible, not captured deepDiff!' };
        }
        return mobj;
    }
}
