import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs/Observable';
import { GlobalService } from './services/global.service';

@Injectable()
export class MarketerGuard implements CanActivate {
  constructor(private _global: GlobalService, private _router: Router) {

  }
  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean> | Promise<boolean> | boolean {
    if (this._global.token) {
      return true;
    } else {
      this._router.navigate(['login']);
      return false;
    }
  }
}
