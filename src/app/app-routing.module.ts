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

import { MarketerGuard } from './marketer.guard';
import { RoleGuard } from './role.guard';

const routes: Routes = [
  { path: 'bs4', component: Bs4Component, canActivate: [MarketerGuard] },
  { path: 'home', component: HomeComponent, canActivate: [MarketerGuard] },
  { path: 'invoices', component: InvoiceDashboardComponent, canActivate: [MarketerGuard] },
  { path: 'leads', component: LeadDashboardComponent, canActivate: [MarketerGuard] },
  { path: 'my-leads', component: MyLeadsComponent, canActivate: [MarketerGuard] },
  { path: 'login', component: LoginComponent },
  { path: 'orders', component: OrderDashboardComponent },
  { path: 'profile', component: ProfileComponent, canActivate: [MarketerGuard] },
  { path: 'restaurants', component: RestaurantDashboardComponent, canActivate: [MarketerGuard] },
  { path: 'gmbs', component: GmbDashboardComponent, canActivate: [MarketerGuard] },
  { path: 'system', component: SystemDashboardComponent, canActivate: [MarketerGuard] },
  { path: 'users', component: UsersComponent, canActivate: [RoleGuard], data: {roles: ['ADMIN']} },
  { path: '**', redirectTo: '/home' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
