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
import { CacheService } from './services/cache.service';
import { RestaurantDetailsComponent } from './components/restaurants/restaurant-details/restaurant-details.component';
import { RestaurantInvoicesComponent } from './components/restaurants/restaurant-invoices/restaurant-invoices.component';
import { RestaurantContactsComponent } from './components/restaurants/restaurant-contacts/restaurant-contacts.component';
import { RestaurantDetailsHostComponent } from './components/restaurants/restaurant-details-host/restaurant-details-host.component';
import { RestaurantRateSchedulesComponent } from './components/restaurants/restaurant-rate-schedules/restaurant-rate-schedules.component';
import { RestaurantServiceSettingsComponent } from './components/restaurants/restaurant-service-settings/restaurant-service-settings.component';
import { RestaurantCloudPrintingComponent } from './components/restaurants/restaurant-cloud-printing/restaurant-cloud-printing.component';
import { PromotionEditorComponent } from './components/restaurants/promotion-editor/promotion-editor.component';
import { PromotionViewerComponent } from './components/restaurants/promotion-viewer/promotion-viewer.component';
import { RestaurantPromotionsComponent } from './components/restaurants/restaurant-promotions/restaurant-promotions.component';
import { RestaurantClosedDaysComponent } from './components/restaurants/restaurant-closed-days/restaurant-closed-days.component';
import { RestaurantProfileComponent } from './components/restaurants/restaurant-profile/restaurant-profile.component';
import { MenuComponent } from './components/restaurants/menu/menu.component';
import { MenuCategoryComponent } from './components/restaurants/menu-category/menu-category.component';
import { MenuCategoryEditorComponent } from './components/restaurants/menu-category-editor/menu-category-editor.component';
import { MenuEditorComponent } from './components/restaurants/menu-editor/menu-editor.component';
import { MenuItemComponent } from './components/restaurants/menu-item/menu-item.component';
import { MenuItemEditorComponent } from './components/restaurants/menu-item-editor/menu-item-editor.component';
import { MenuOptionViewerComponent } from './components/restaurants/menu-option-viewer/menu-option-viewer.component';
import { MenuOptionsComponent } from './components/restaurants/menu-options/menu-options.component';
import { MenusComponent } from './components/restaurants/menus/menus.component';
import { OptionsEditorComponent } from './components/restaurants/options-editor/options-editor.component';
import { MenuOptionEditorComponent } from './components/restaurants/menu-option-editor/menu-option-editor.component';
import { SwitchComponent } from './components/restaurants/switch/switch.component';
import { RadioGroupComponent } from './components/restaurants/radio-group/radio-group.component';

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
    GmbWatchComponent,
    RestaurantDetailsComponent,
    RestaurantInvoicesComponent,
    RestaurantContactsComponent,
    RestaurantDetailsHostComponent,
    RestaurantRateSchedulesComponent,
    RestaurantServiceSettingsComponent,
    RestaurantCloudPrintingComponent,
    PromotionEditorComponent,
    PromotionViewerComponent,
    RestaurantPromotionsComponent,
    RestaurantClosedDaysComponent,
    RestaurantProfileComponent,
    MenuComponent,
    MenuCategoryComponent,
    MenuCategoryEditorComponent,
    MenuEditorComponent,
    MenuItemComponent,
    MenuItemEditorComponent,
    MenuOptionEditorComponent,
    MenuOptionViewerComponent,
    MenuOptionsComponent,
    MenusComponent,
    OptionsEditorComponent,
    SwitchComponent,
    RadioGroupComponent,
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
    ApiService,
    CacheService
  ],
  bootstrap: [RootComponent]
})
export class AppModule { }
