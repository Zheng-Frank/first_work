/**
 * A service for caching data
 */
import { Injectable } from '@angular/core';

@Injectable()
export class CacheService {
  constructor() {
  }

  set(name: string, obj: any, expiresInSeconds: number) {
    this[name] = obj;
    setTimeout(() => delete this[name], expiresInSeconds * 1000);
  }

  get(name: string) {
    return this[name];
  }

}
