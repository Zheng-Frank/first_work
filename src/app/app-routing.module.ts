import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Bs4Component } from './components/bs4/bs4.component';
import { HomeComponent } from './components/home/home.component';
import { InvoiceDashboardComponent } from './components/invoices/invoice-dashboard/invoice-dashboard.component';
import { LeadDashboardComponent } from './components/leads/lead-dashboard/lead-dashboard.component';
import { MyLeadsComponent } from './components/leads/my-leads/my-leads.component';
import { LoginComponent } from './components/login/login.component';
import { OrderDashboardComponent } from './components/orders/order-dashboard/order-dashboard.component';
import { ProfileComponent } from './components/profile/profile.component';
import { RestaurantDashboardComponent } from './components/restaurants/restaurant-dashboard/restaurant-dashboard.component';
import { SystemDashboardComponent } from './components/system/system-dashboard/system-dashboard.component';
import { UsersComponent } from './components/users/users.component';
import { GmbDashboardComponent } from './components/gmbs/gmb-dashboard/gmb-dashboard.component';

import { RoleGuard } from './role.guard';
import { InvoiceMonthlyDetailsComponent } from './components/invoices/invoice-monthly-details/invoice-monthly-details.component';
import { InvoiceDetailsComponent } from './components/invoices/invoice-details/invoice-details.component';
import { GmbWatchComponent } from './components/gmbs/gmb-watch/gmb-watch.component';
import { RestaurantDetailsComponent } from './components/restaurants/restaurant-details/restaurant-details.component';

const routes: Routes = [
  { path: 'bs4', component: Bs4Component, canActivate: [RoleGuard], data: { roles: ['ADMIN'] } },
  { path: 'home', component: HomeComponent, canActivate: [RoleGuard], data: { roles: ['MENU_EDITOR', 'ADMIN', 'MARKETER', 'MARKETING_DIRECTOR', 'ACCOUNTANT', "GMB"] } },
  { path: 'invoices', component: InvoiceDashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'ACCOUNTANT'] } },
  { path: 'invoices/monthly/:startDate', component: InvoiceMonthlyDetailsComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'ACCOUNTANT'] }  },
  { path: 'invoices/:id', component: InvoiceDetailsComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'ACCOUNTANT'] }  },
  { path: 'leads', component: LeadDashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'MARKETER', 'MARKETING_DIRECTOR', "GMB"] } },
  { path: 'my-leads', component: MyLeadsComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'MARKETER', 'MARKETING_DIRECTOR'] } },
  { path: 'login', component: LoginComponent },
  { path: 'orders', component: OrderDashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'ACCOUNTANT'] } },
  { path: 'profile', component: ProfileComponent },
  { path: 'restaurants', component: RestaurantDashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'MENU_EDITOR', "ACCOUNTANT"] } },
  { path: 'restaurants/:id', component: RestaurantDetailsComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'MENU_EDITOR', 'ACCOUNTANT'] } },
  { path: 'gmbs', component: GmbDashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'GMB'] } },
  { path: 'gmbs/watch', component: GmbWatchComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'GMB'] } },
  { path: 'system', component: SystemDashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN'] } },
  { path: 'users', component: UsersComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN'] } },

  { path: '**', redirectTo: '/home' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
