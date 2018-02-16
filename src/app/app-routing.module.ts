import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Bs4Component } from './components/bs4/bs4.component';
import { HomeComponent } from './components/home/home.component';
import { InvoicesComponent } from './components/invoices/invoices.component';
import { LeadsComponent } from './components/leads/leads.component';
import { MyLeadsComponent } from './components/my-leads/my-leads.component';
import { LoginComponent } from './components/login/login.component';
import { OrdersComponent } from './components/orders/orders.component';
import { ProfileComponent } from './components/profile/profile.component';
import { RestaurantsComponent } from './components/restaurants/restaurants.component';
import { SystemComponent } from './components/system/system.component';
import { UsersComponent } from './components/users/users.component';

import { MarketerGuard } from './marketer.guard';
import { RoleGuard } from './role.guard';

const routes: Routes = [
  { path: 'bs4', component: Bs4Component, canActivate: [MarketerGuard] },
  { path: 'home', component: HomeComponent, canActivate: [MarketerGuard] },
  { path: 'invoices', component: InvoicesComponent, canActivate: [MarketerGuard] },
  { path: 'leads', component: LeadsComponent, canActivate: [MarketerGuard] },
  { path: 'my-leads', component: MyLeadsComponent, canActivate: [MarketerGuard] },
  { path: 'login', component: LoginComponent },
  { path: 'orders', component: OrdersComponent },
  { path: 'profile', component: ProfileComponent, canActivate: [MarketerGuard] },
  { path: 'restaurants', component: RestaurantsComponent, canActivate: [MarketerGuard] },
  { path: 'system', component: SystemComponent, canActivate: [MarketerGuard] },
  { path: 'users', component: UsersComponent, canActivate: [RoleGuard], data: {roles: ['ADMIN']} },
  { path: '**', redirectTo: '/home' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
