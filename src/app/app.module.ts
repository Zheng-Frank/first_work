import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';

import { AppRoutingModule } from './app-routing.module';
import { HttpClientModule } from '@angular/common/http';
import { RootComponent } from './components/root/root.component';
import { HomeComponent } from './components/home/home.component';
import { Bs4Component } from './components/bs4/bs4.component';
import { HeaderComponent } from './components/header/header.component';

import { UiModule } from '@qmenu/ui';
import { LoginComponent } from './components/login/login.component';
import { GlobalService } from './services/global.service';
import { MarketerGuard } from './marketer.guard';
import { ApiService } from './services/api.service';
import { ProfileComponent } from './components/profile/profile.component';
import { UsersComponent } from './components/users/users.component';
import { LeadDashboardComponent } from './components/leads/lead-dashboard/lead-dashboard.component';
import { SystemComponent } from './components/system/system.component';
import { RestaurantDashboardComponent } from './components/restaurants/restaurant-dashboard/restaurant-dashboard.component';
import { InvoiceDashboardComponent } from './components/invoices/invoice-dashboard/invoice-dashboard.component';
import { OrderDashboardComponent } from './components/orders/order-dashboard/order-dashboard.component';
import { RoleGuard } from './role.guard';

import { GmbInfoComponent } from './components/gmbs/gmb-info/gmb-info.component';
import { MyLeadsComponent } from './components/leads/my-leads/my-leads.component';
import { CallLoggerComponent } from './components/leads/call-logger/call-logger.component';
import { LeadInfoComponent } from './components/leads/lead-info/lead-info.component';
import { LeadCallLogComponent } from './components/leads/lead-call-log/lead-call-log.component';
import { GmbDashboardComponent } from './components/gmbs/gmb-dashboard/gmb-dashboard.component';
import { SyncButtonsComponent } from './components/shared/sync-buttons/sync-buttons.component';
import { RestaurantImporterComponent } from './components/restaurants/restaurant-importer/restaurant-importer.component';
import { RestaurantMenuShufflerComponent } from './components/restaurants/restaurant-menu-shuffler/restaurant-menu-shuffler.component';

@NgModule({
  declarations: [
    RootComponent,
    HomeComponent,
    Bs4Component,
    HeaderComponent,
    LoginComponent,
    ProfileComponent,
    UsersComponent,
    LeadDashboardComponent,
    SystemComponent,
    RestaurantDashboardComponent,
    InvoiceDashboardComponent,
    OrderDashboardComponent,
    GmbInfoComponent,
    MyLeadsComponent,
    CallLoggerComponent,
    LeadInfoComponent,
    LeadCallLogComponent,
    GmbDashboardComponent,
    SyncButtonsComponent,
    RestaurantImporterComponent,
    RestaurantMenuShufflerComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    HttpModule,
    UiModule
  ],
  providers: [
    GlobalService,
    MarketerGuard,
    RoleGuard,
    ApiService
  ],
  bootstrap: [RootComponent]
})
export class AppModule { }
