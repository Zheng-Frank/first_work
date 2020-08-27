/**
 * A service for pruning objects and performing minimal patch
 */
import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

const EMPTY_INDICATOR = "#>!$!%(@^";

@Injectable()
export class PrunedPatchService {
    constructor(private _api: ApiService) { }

    patch(api: string, payload: any) {
        let observable: Observable<any>;

        // clone the passed in objects so we don't modify them
        let oldObj = JSON.parse(JSON.stringify(payload[0].old));
        let newObj = JSON.parse(JSON.stringify(payload[0].new));
        // prune the passed in objects
        const result = this.prune(oldObj, newObj, true);
        oldObj = result.old;
        newObj = result.new;

        // return the observable
        observable = this._api.patch(api, 
            [{
                old: oldObj,
                new: newObj
            }]);
        return observable;
    }

    // recursive method to prune the passed in objects
    private prune(oldO, newO, isTopLevel) {
        // Check that they have the same type
        if (typeof oldO !== typeof newO) {
            return {old: oldO, new: newO};
        } 

        // 1. If type is value: Compare them directly
        if (typeof oldO !== 'object') {
            if (oldO === newO) {
                return {old: EMPTY_INDICATOR, new: EMPTY_INDICATOR};
            } else {
                return {old: oldO, new: newO};
            }
        }
        // 2. If type is array: iterate through it  
        else if (Array.isArray(oldO)) {
            let allSame = true;
            // prune each elements in the array
            for (let i = 0; i < Math.min(oldO.length, newO.length); i++) {
                const result = this.prune(oldO[i], newO[i], false);
                // replacing same elements with empty objects
                oldO[i] = result.old == EMPTY_INDICATOR ? {} : result.old;
                newO[i] = result.new == EMPTY_INDICATOR ? {} : result.new;
                // if some elements are different, then not all the same
                if (result.old != EMPTY_INDICATOR || result.new != EMPTY_INDICATOR) {
                    allSame = false;
                }
            }

            // if lengths are not the same, then not all elements are the same
            if (oldO.length !== newO.length) {
                allSame = false;
            }

            if (allSame) {  // if all the same, just return undefines
                return {old: EMPTY_INDICATOR, new: EMPTY_INDICATOR};
            } else { 
                return {old: oldO, new: newO};
            }
        }
        // 3. If type is object: iterate through it
        else {
            let allSame = true;
            let prop;
            // iterate through the property of the oldO
            for (prop in oldO) {
                // prune each property except _id
                if (prop == '_id' && isTopLevel) {
                    continue;
                }
                // if newObject doesn't own that property, no need to prune
                if (!newO.hasOwnProperty(prop)) {
                    continue;
                }
                const result = this.prune(oldO[prop], newO[prop], false);
                oldO[prop] = result.old;
                newO[prop] = result.new;
                // delete any undefined property
                if (oldO[prop] == EMPTY_INDICATOR) {
                    delete oldO[prop];
                }
                if (newO[prop] == EMPTY_INDICATOR) {
                    delete newO[prop];
                } 
                // if there's one property different, then not all the same
                if (result.old != EMPTY_INDICATOR || result.new != EMPTY_INDICATOR) {
                    allSame = false;
                }
            }

            // if there are still properties left in the new object, then not all the same
            for (prop in newO) {
                allSame = false;
            }

            if (allSame) {  // if all the same, just return undefines
                return {old: EMPTY_INDICATOR, new: EMPTY_INDICATOR};
            } else { 
                return {old: oldO, new: newO};
            }
        }
    }
}
