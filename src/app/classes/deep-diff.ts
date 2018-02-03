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


    static test() {
        const original = {
            root1: 1,
            rootA: [1, 2],
            path: {
                p1: 1,
                pA: [1, 2],
            }
        };

        const print = function (label, compared) {
            // print variable name
            console.log(label);
            const diffs = DeepDiff.getDiff('_id', original, compared);
            console.log(diffs);
            diffs.map(diff => console.log(diff.toMongo()));
        };

        const compareSame = JSON.parse(JSON.stringify(original));
        print('same', compareSame);

        const compareN = JSON.parse(JSON.stringify(original));
        compareN.root2 = 2;
        print('N', compareN);

        const compareE = JSON.parse(JSON.stringify(original));
        compareE.root1 = 11;
        print('E', compareE);

        const compareD = JSON.parse(JSON.stringify(original));
        delete compareD.root1;
        print('D', compareD);

        const compareAN = JSON.parse(JSON.stringify(original));
        compareAN.rootA.push(3);
        print('AN', compareAN);

        const compareAE = JSON.parse(JSON.stringify(original));
        compareAE.rootA[0] = 11;
        print('AE', compareAE);

        const compareAD = JSON.parse(JSON.stringify(original));
        compareAD.rootA.pop();
        print('AD', compareAD);
        // on a path

        const comparePN = JSON.parse(JSON.stringify(original));
        comparePN.path.p2 = 2;
        print('PN', comparePN);

        const comparePE = JSON.parse(JSON.stringify(original));
        comparePE.path.p1 = 11;
        print('PE', comparePE);

        const comparePD = JSON.parse(JSON.stringify(original));
        delete comparePD.path.p1;
        print('PD', comparePD);

        const comparePAN = JSON.parse(JSON.stringify(original));
        comparePAN.path.pA.push(3);
        print('PAN', comparePAN);

        const comparePAE = JSON.parse(JSON.stringify(original));
        comparePAE.path.pA[0] = 11;
        print('PAE', comparePAE);

        const comparePAD = JSON.parse(JSON.stringify(original));
        comparePAD.path.pA.pop();
        print('PAD', comparePAD);
    }

    toMongo() {
        const results = [];
        const path = this.path.join('.');

        switch (this.kind) {
            case 'N':   // new
            case 'E':   // edit ==> update
                // if however undefined as value, we should treat that as delete?
                if (this.rhs === undefined) {
                    results.push(
                        {
                            $unset: {
                                [path]: ''
                            }
                        }
                    );

                } else {
                    results.push(
                        {
                            $set: {
                                [path]: this.rhs
                            }
                        }
                    );
                }
                break;
            case 'D':
                results.push(
                    {
                        $unset: {
                            [path]: ''
                        }
                    }
                );
                break;
            case 'A':   // array situation!
                switch (this.item.kind) {
                    case 'N':   // new
                        results.push(
                            {
                                $push: {
                                    [path]: this.item.rhs
                                }
                            }
                        );
                        break;
                    case 'E':   // edit ==> update
                        results.push(
                            {
                                $set: {
                                    [path + '.' + this.index]: this.item.rhs
                                }
                            }
                        );
                        break;
                    case 'D':
                        // noway to splice at index. So do this:
                        // $set a random value;
                        results.push(
                            {
                                $set: {
                                    [path + '.' + this.index]: '____randomgarbage'
                                }
                            }
                        );
                        results.push(
                            {
                                $pull: {
                                    [path]: { $in: ['____randomgarbage'] }
                                }
                            }
                        );
                        break;
                    default:
                        throw { errorMessage: 'Terrible, not captured deepDiff!' };
                }
                break;
            default:
                throw { errorMessage: 'Terrible, not captured deepDiff!' };
        }
        return results;
    }
}
