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
import { LeadsComponent } from './components/leads/leads.component';
import { SystemComponent } from './components/system/system.component';
import { RestaurantsComponent } from './components/restaurants/restaurants.component';
import { InvoicesComponent } from './components/invoices/invoices.component';
import { OrdersComponent } from './components/orders/orders.component';
import { RoleGuard } from './role.guard';

import { GmbInfoComponent } from './components/gmb-info/gmb-info.component';
import { MyLeadsComponent } from './components/my-leads/my-leads.component';
import { CallLoggerComponent } from './components/call-logger/call-logger.component';
import { LeadInfoComponent } from './components/lead-info/lead-info.component';
import { LeadCallLogComponent } from './components/lead-call-log/lead-call-log.component';
import { GmbsComponent } from './components/gmbs/gmbs.component';
import { SyncButtonsComponent } from './components/sync-buttons/sync-buttons.component';
import { RestaurantImporterComponent } from './components/restaurant-importer/restaurant-importer.component';
import { RestaurantMenuShufflerComponent } from './components/restaurant-menu-shuffler/restaurant-menu-shuffler.component';

@NgModule({
  declarations: [
    RootComponent,
    HomeComponent,
    Bs4Component,
    HeaderComponent,
    LoginComponent,
    ProfileComponent,
    UsersComponent,
    LeadsComponent,
    SystemComponent,
    RestaurantsComponent,
    InvoicesComponent,
    OrdersComponent,
    GmbInfoComponent,
    MyLeadsComponent,
    CallLoggerComponent,
    LeadInfoComponent,
    LeadCallLogComponent,
    GmbsComponent,
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
