export class Helper {
    static areObjectsEqual(obj1, obj2) {
        if (Object.is(obj1, obj2)) {
            return true;
        }
        // now make sure obj1 and obj2 have same keys
        if (typeof obj1 !== typeof obj2 || typeof obj1 !== 'object') {
            return false;
        }

        const keys1 = Object.getOwnPropertyNames(obj1);
        const keys2 = Object.getOwnPropertyNames(obj2);
        if (keys1.length !== keys2.length || keys1.some(k1 => keys2.indexOf(k1) < 0)) {
            return false;
        }

        if (keys1.some(k1 => !Helper.areObjectsEqual(obj1[k1], obj2[k1]))) {
            return false;
        }
        return true;
    }
}