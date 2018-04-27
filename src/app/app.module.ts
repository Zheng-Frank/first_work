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
import { ApiService } from './services/api.service';
import { ProfileComponent } from './components/profile/profile.component';
import { UsersComponent } from './components/users/users.component';
import { LeadDashboardComponent } from './components/leads/lead-dashboard/lead-dashboard.component';
import { SystemDashboardComponent } from './components/system/system-dashboard/system-dashboard.component';
import { DbScriptsComponent } from './components/system/db-scripts/db-scripts.component';

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
import { RestaurantCrawlerComponent } from './components/restaurants/restaurant-crawler/restaurant-crawler.component';
import { RestaurantMenuShufflerComponent } from './components/restaurants/restaurant-menu-shuffler/restaurant-menu-shuffler.component';
import { DataHealthComponent } from './components/system/data-health/data-health.component';
import { NewRestaurantComponent } from './components/restaurants/new-restaurant/new-restaurant.component';

import { InvoiceMonthlyComponent } from './components/invoices/invoice-monthly/invoice-monthly.component';
import { InvoiceDetailsComponent } from './components/invoices/invoice-details/invoice-details.component';
import { InvoiceEditorComponent } from './components/invoices/invoice-editor/invoice-editor.component';
import { InvoiceMonthlyDetailsComponent } from './components/invoices/invoice-monthly-details/invoice-monthly-details.component';
import { InvoiceOptionEditorComponent } from './components/invoices/invoice-option-editor/invoice-option-editor.component';
import { InvoiceViewerComponent } from './components/invoices/invoice-viewer/invoice-viewer.component';
import { InvoicesTableComponent } from './components/invoices/invoices-table/invoices-table.component';
import { GmbWatchComponent } from './components/gmbs/gmb-watch/gmb-watch.component';

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
    SystemDashboardComponent,
    DbScriptsComponent,
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
    RestaurantCrawlerComponent,
    RestaurantMenuShufflerComponent,
    DataHealthComponent,
    NewRestaurantComponent,
    InvoiceMonthlyComponent,
    InvoiceDetailsComponent,
    InvoiceEditorComponent,
    InvoiceMonthlyDetailsComponent,
    InvoiceOptionEditorComponent,
    InvoiceViewerComponent,
    InvoicesTableComponent,
    GmbWatchComponent
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
    RoleGuard,
    ApiService
  ],
  bootstrap: [RootComponent]
})
export class AppModule { }
