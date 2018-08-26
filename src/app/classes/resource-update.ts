export class ResourceUpdate {
    name: string;
    oldPartialObj: any;
    newPartialObj: any;

    static updateOriginal(originalObj, oldPartialObj, newPartialObj) {
        // 1. delete keys that are in oldPartialObj but not in new PartialObj
        Object.keys(oldPartialObj)
            .filter(k => Object.keys(newPartialObj).indexOf(k) < 0)
            .map(deletedK => delete originalObj[deletedK]);

        // 2. add new fields that are in newPartialObj but not oldPartialObj
        // this is shallow (any further object is not copied)
        // convert newPartialObj {$oid: xxx}, and {$date: xxx}

        const handleOidAndDate = function (obj) {
            Object.keys(obj).map(k => {
                if (typeof obj[k] === 'object' && obj[k]) {
                    if (obj[k]['$date']) {
                        obj[k] = obj[k]['$date'];
                    } else if (obj[k]['$oid']) {
                        obj[k] = obj[k]['$oid'];
                    } else {
                        handleOidAndDate(obj[k]);
                    }
                }
            });
        }

        handleOidAndDate(newPartialObj);
        Object.keys(newPartialObj)
            .map(k => originalObj[k] = newPartialObj[k]);
    }
}
