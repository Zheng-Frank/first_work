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
    {name: 'Unconfirmed Orders', route: 'unconfirmed-orders', authRoles: ['CSR', 'CSR_MANAGER']},
    {name: 'Bad Hours', route: 'monitoring-hours', authRoles: ['CSR', 'CSR_MANAGER']},
    {name: 'Banned Customers', route: 'banned-customers', authRoles: ['CSR', 'CSR_MANAGER']},
    {name: 'Fax Problems', route: 'fax-problems', authRoles: ['CSR', 'CSR_MANAGER']},
    {name: 'Disabled Restaurants', route: 'disabled-restaurants', authRoles: ['CSR', 'CSR_MANAGER']},
    {name: 'Closed Restaurants', route: 'closed-restaurants', authRoles: ['CSR', 'CSR_MANAGER']},
    {name: 'Manage Images', route: 'manage-images', authRoles: ['CSR', 'CSR_MANAGER']},
    {name: 'Restaurants Promotion', route: 'restaurants-promotion', authRoles: ['CSR', 'CSR_MANAGER']},
    {name: 'Email Problems', route: 'email-problems', authRoles: ['CSR', 'CSR_MANAGER']},
    {name: 'Postmates List (Old)', route: 'postmates-list', authRoles: ['CSR', 'CSR_MANAGER']},
    {name: 'Postmates Orders', route: 'postmates-orders', authRoles: ['CSR', 'CSR_MANAGER']},
    {name: 'Weird Data', route: 'weird-data', authRoles: ['CSR', 'CSR_MANAGER']},
    {name: 'SEO Tracking', route: 'seo-tracking', authRoles: ['CSR', 'CSR_MANAGER']},
    {name: 'API Logs Dashboard', route: 'api-logs', authRoles: []},
    {name: 'Fraud Detection', route: 'fraud-detection', authRoles: ['CSR', 'CSR_MANAGER']},
    {name: 'Clean Menus', route: 'clean-menus', authRoles: ['CSR', 'CSR_MANAGER']},
    {name: 'Clean Insisted Link Restaurants', route: 'clean-insisted-link-rts', authRoles: ['CSR', 'CSR_MANAGER']},
    {name: 'Orderless Signups', route: 'orderless-signups', authRoles: ['CSR', 'CSR_MANAGER']},
    {name: 'Leads (Old)', route: 'leads-old', authRoles: ['MARKETER']},
    {name: 'My Leads (Old)', route: 'my-leads-old', authRoles: ['MARKETER']},
    {name: 'Excess SMS Notifications', route: 'excess-sms-notifications-rts', authRoles: ['CSR', 'CSR_MANAGER']},
    {name: 'Restaurants by Provider', route: 'rts-by-provider', authRoles: ['CSR', 'CSR_MANAGER', 'MARKETER']},
    {name: 'IVR Dashboard', route: 'ivr-agent-analysis', authRoles: ['CSR', 'CSR_MANAGER', 'MARKETER']},
    {name: 'VIP Restaurants', route: 'vip-rts', authRoles: ['CSR_MANAGER']},
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








