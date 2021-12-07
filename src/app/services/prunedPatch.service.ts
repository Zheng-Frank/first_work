/**
 * A service for pruning objects and performing minimal patch
 */
import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { of } from 'rxjs';

@Injectable()
export class PrunedPatchService {
  constructor(private _api: ApiService) {
  }

  patch(api: string, payloads: { old: any, new: any }[]) {
    let equivalent = true;
    let pruned = payloads.map(payload => {
      let origin = JSON.parse(JSON.stringify(payload.old));
      let updated = JSON.parse(JSON.stringify(payload.new));
      let originId = origin._id, updatedId = updated._id;
      let {ori, upd} = this.prune(origin, updated);
      equivalent = equivalent && ((!ori && !upd) || (Object.keys(ori).length === 0 && Object.keys(upd).length === 0));
      return {old: {...ori, _id: originId}, new: {...upd, _id: updatedId}};
    });
    if (equivalent) {
      return of("unchanged");
    }
    return this._api.patch(api, pruned);
  }

  private prune(origin: any, updated: any) {
    if (typeof origin !== typeof updated) {
      return {ori: origin, upd: updated};
    }
    if (typeof origin !== 'object') {
      if (origin === updated) {
        return {};
      }
      return {ori: origin, upd: updated};
    }

    // handle null case
    if (origin === updated) {
      return {};
    }

    // compare date
    if (origin instanceof Date) {
      if (updated instanceof Date) {
        if (origin.valueOf() === updated.valueOf()) {
          return {};
        }
      }
      return {ori: origin, upd: updated};
    }
    let equal = true;
    // compare array
    if (Array.isArray(origin)) {
      if (Array.isArray(updated)) {
        for (let i = 0; i < Math.min(origin.length, updated.length); i++) {
          let {ori, upd} = this.prune(origin[i], updated[i]);
          origin[i] = ori;
          updated[i] = upd;
          equal = equal && (ori === upd);
        }
        if (equal && (origin.length === updated.length)) {
          return {};
        }
      }
      return {ori: origin, upd: updated};
    }
    equal = true;
    // compare plain object
    Object.keys(origin).forEach(prop => {
      if (!updated.hasOwnProperty(prop)) {
        equal = false;
        return;
      }
      const {ori, upd} = this.prune(origin[prop], updated[prop]);
      origin[prop] = ori;
      updated[prop] = upd;
      // delete any undefined property
      if (ori === undefined) {
        delete origin[prop];
      }
      if (upd === undefined) {
        delete updated[prop];
      }
      equal = equal && ori === upd;
    });

    if (equal && !Object.keys(updated).length) {
      return {};
    }
    return {ori: origin, upd: updated};
  }
}
