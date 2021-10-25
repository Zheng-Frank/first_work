import {Component, OnInit} from '@angular/core';
import {GlobalService} from '../../../services/global.service';

@Component({
  selector: 'app-other-modules',
  templateUrl: './other-modules.component.html',
  styleUrls: ['./other-modules.component.css']
})
export class OtherModulesComponent implements OnInit {

  modules = [
    {name: 'Json Schemas', route: 'schemas', authRoles: ['DEVELOPER']},
    {name: 'Bootstrap 4', route: 'bs4', authRoles: ['DEVELOPER']},
    {name: 'UI Components Preview', route: 'ui-preview', authRoles: ['DEVELOPER']},
    {name: 'Unconfirmed Orders', route: 'unconfirmed-orders', authRoles: ['CSR']},
    {name: 'Bad Hours', route: 'monitoring-hours', authRoles: ['CSR']},
    {name: 'Banned Customers', route: 'banned-customers', authRoles: ['CSR']},
    {name: 'Fax Problems', route: 'fax-problems', authRoles: ['CSR']},
    {name: 'Disabled Restaurants', route: 'disabled-restaurants', authRoles: ['CSR']},
    {name: 'Closed Restaurants', route: 'closed-restaurants', authRoles: ['CSR']},
    {name: 'Manage Images', route: 'manage-images', authRoles: ['CSR']},
    {name: 'Restaurants Promotion', route: 'restaurants-promotion', authRoles: ['CSR']},
    {name: 'Email Problems', route: 'email-problems', authRoles: ['CSR']},
    {name: 'Postmates List (Old)', route: 'postmates-list', authRoles: ['CSR']},
    {name: 'Postmates Orders', route: 'postmates-orders', authRoles: ['CSR']},
    {name: 'Weird Data', route: 'weird-data', authRoles: ['CSR']},
    {name: 'SEO Tracking', route: 'seo-tracking', authRoles: ['CSR']},
    {name: 'API Logs Dashboard', route: 'api-logs', authRoles: []},
    {name: 'Fraud Detection', route: 'fraud-detection', authRoles: ['CSR']},
    {name: 'Clean Menus', route: 'clean-menus', authRoles: ['CSR']},
    {name: 'Clean Insisted Link Restaurants', route: 'clean-insisted-link-rts', authRoles: ['CSR']},
    {name: 'Orderless Signups', route: 'orderless-signups', authRoles: ['CSR']},
    {name: 'Leads (Old)', route: 'leads-old', authRoles: ['MARKETER']},
    {name: 'My Leads (Old)', route: 'my-leads-old', authRoles: ['MARKETER']},
    {name: 'Excess SMS Notifications', route: 'excess-sms-notifications-rts', authRoles: ['CSR']},
    {name: 'Restaurants by Provider', route: 'rts-by-provider', authRoles: ['CSR', 'MARKETER']}
  ];

  constructor(private _global: GlobalService) {
  }

  ngOnInit() {
  }

  get visibleModules() {
    let roles = this._global.user.roles || [];
    return this.modules.filter(m => roles.includes('ADMIN') || m.authRoles.some(r => roles.includes(r)));
  }

}








