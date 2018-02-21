import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs/Observable';
import { GlobalService } from './services/global.service';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private _global: GlobalService, private _router: Router) {

  }
  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean> | Promise<boolean> | boolean {

    // role detecting
    let foundRole = false;
    if (next.data && next.data.roles && this._global.user && this._global.user.roles) {
      foundRole = this._global.user.roles.some(r => next.data.roles.indexOf(r) >= 0);
    }

    if (foundRole) {
      return true;
    } else {
      this._router.navigate(['login']);
      return false;
    }
  }
}
