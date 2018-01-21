import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { Bs4Component } from './components/bs4/bs4.component';
import { LoginComponent } from './components/login/login.component';
import { MarketerGuard } from './marketer.guard';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'home', component: HomeComponent, canActivate: [MarketerGuard] },
  { path: 'bs4', component: Bs4Component, canActivate: [MarketerGuard]  },
  { path: '**', redirectTo: '/home' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
