/**
 * A generic API service for several purpose:
 * 1. Forking the request (Observable.share), so a subscriber can handle some errors (eg. 500, 401) globally
 * 2. Tracking Urls being requested: so we can know how many are in-flight (eg. to display a spinner to indicate loading)
 * 3. Automatically attach Authorization header or x-access-token
 * 4. Always attach Content-Type: application/json
 */
import { Injectable, EventEmitter } from '@angular/core';

import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Observable } from 'rxjs';
import { map, filter, tap, share } from 'rxjs/operators';

@Injectable()
export class ApiService {

  onApiError: EventEmitter<any> = new EventEmitter();

  urlsInRequesting = [];
  private autoAttachedHeaders = {
    'Content-Type': 'application/json'
  };

  constructor(private http: HttpClient) {
  }

  addHeader(headerName: string, headerValue: string) {
    this.autoAttachedHeaders[headerName] = headerValue;
  }
  removeHeader(headerName: string) {
    delete this.autoAttachedHeaders[headerName];
  }

  /**
   *
   * @param api API name
   * @param headerOptions Optional Header Options that needs to be added to Header
   * @param queryParams Optional Query Parameters that needs to be send as part of URL
   */
  get(api: string, payload?) {
    return this.apiRequest('get', api, payload);
  }

  post(api: string, payload?) {
    return this.apiRequest('post', api, payload);
  }

  put(api: string, payload?) {
    return this.apiRequest('put', api, payload);
  }

  patch(api: string, payload?) {
    return this.apiRequest('patch', api, payload);
  }

  delete(api: string, payload?) {
    return this.apiRequest('delete', api, payload);
  }

  private apiRequest(method: string, api: string, payload?: any) {
    payload = payload || {};
    const url = method + api + JSON.stringify(payload);

    // we might need to think about same request being in queue already! Something wrong with the logic of our program. ignore for now

    this.urlsInRequesting.push(url);
    const headers = new HttpHeaders(this.autoAttachedHeaders);
    Object.keys(this.autoAttachedHeaders).map(key => headers.set(key, this.autoAttachedHeaders[key]));
    let observable: Observable<any>;

    // let's make an absolute url for the API requests
    // api = document.location.protocol + "//" + document.location.host + "/" + api;
    // or append api so that every api request is {{baseUrl}}/api/myApi
    // api = 'api/' + api;
    switch (method) {
      case 'post':
      case 'put':
      case 'patch':
        observable = this.http[method](api, payload, { headers: headers });
        break;
      // get and delete, we have to use querystring to pass parameters
      case 'get':
      case 'delete':
        if (Object.keys(payload).length > 0) {
          if (api.indexOf('?') < 0) {
            api += '?';
          }
          // Only strigify Object, not primitives
          api += Object.keys(payload)
          .map(key =>
            key + '=' + encodeURIComponent( (Object(payload[key]) === payload[key] ? JSON.stringify(payload[key]) : payload[key])))
            .join('&');
        }
        observable = this.http[method](api, { headers: headers });
        break;
      default:
        // other cases we don't really use right now
        observable = this.http[method](api, { headers: headers });
        break;
    }

    // let's share this so we can have multiple subscribers but not requesting multiple times
    const sharedObservable = observable.pipe(share());
    sharedObservable.subscribe(
      d => {
        this.urlsInRequesting = this.urlsInRequesting.filter(u => u !== url);
      },
      error => {
        this.urlsInRequesting = this.urlsInRequesting.filter(u => u !== url);
        this.onApiError.emit(
          {
            method: method,
            api: api,
            options: payload,
            error: error
          });
      },
      () => { this.urlsInRequesting = this.urlsInRequesting.filter(u => u !== url); }
    );
    return sharedObservable;
  }
}
