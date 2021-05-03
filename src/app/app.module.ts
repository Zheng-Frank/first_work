import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';

import { NgxMaskModule, IConfig } from 'ngx-mask';
import { AppRoutingModule } from './app-routing.module';
import { HttpClientModule } from '@angular/common/http';
import { RootComponent } from './components/root/root.component';
import { HomeComponent } from './components/home/home.component';
import { LogsDashboardComponent } from './components/logs/logs-dashboard/logs-dashboard.component';
import { Bs4Component } from './components/development/bs4/bs4.component';
import { UIPreviewComponent } from './components/development/ui-preview/ui-preview/ui-preview.component';
import { DocViewerComponent } from './components/development/ui-preview/doc-viewer/doc-viewer.component';
import { HeaderComponent } from './components/header/header.component';

import { UiModule } from '@qmenu/ui';
import { LoginComponent } from './components/login/login.component';
import { GlobalService } from './services/global.service';
import { AmazonConnectService } from './services/amazon-connect.service';

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

import { MyLeadsComponent } from './components/leads/my-leads/my-leads.component';
import { CallLoggerComponent } from './components/leads/call-logger/call-logger.component';
import { LeadInfoComponent } from './components/leads/lead-info/lead-info.component';
import { LeadCallLogComponent } from './components/leads/lead-call-log/lead-call-log.component';
import { SyncButtonsComponent } from './components/shared/sync-buttons/sync-buttons.component';
import { RestaurantCrawlerComponent } from './components/restaurants/restaurant-crawler/restaurant-crawler.component';
import { RestaurantMenuShufflerComponent } from './components/restaurants/restaurant-menu-shuffler/restaurant-menu-shuffler.component';
import { NewRestaurantComponent } from './components/restaurants/new-restaurant/new-restaurant.component';

import { InvoiceMonthlyComponent } from './components/invoices/invoice-monthly/invoice-monthly.component';
import { InvoiceDetailsComponent } from './components/invoices/invoice-details/invoice-details.component';
import { InvoiceEditorComponent } from './components/invoices/invoice-editor/invoice-editor.component';
import { InvoiceMonthlyDetailsComponent } from './components/invoices/invoice-monthly-details/invoice-monthly-details.component';
import { InvoiceOptionEditorComponent } from './components/invoices/invoice-option-editor/invoice-option-editor.component';
import { InvoicesTableComponent } from './components/invoices/invoices-table/invoices-table.component';
import { CacheService } from './services/cache.service';
import { PrunedPatchService } from './services/prunedPatch.service';
import { RestaurantDetailsComponent } from './components/restaurants/restaurant-details/restaurant-details.component';
import { RestaurantInvoicesComponent } from './components/restaurants/restaurant-invoices/restaurant-invoices.component';
import { RestaurantOrdersComponent } from './components/restaurants/restaurant-orders/restaurant-orders.component';
import { RestaurantApiLogsComponent } from './components/restaurants/restaurant-api-logs/restaurant-api-logs.component';
import { OrderCardComponent } from './components/restaurants/order-card/order-card.component';
import { RestaurantContactsComponent } from './components/restaurants/restaurant-contacts/restaurant-contacts.component';
import { RestaurantRateSchedulesComponent } from './components/restaurants/restaurant-rate-schedules/restaurant-rate-schedules.component';
import { RestaurantSalesComponent } from './components/restaurants/restaurant-sales/restaurant-sales.component';
import { RestaurantFeeSchedulesComponent } from './components/restaurants/restaurant-fee-schedules/restaurant-fee-schedules.component';
import { RestaurantPaymentMeansComponent } from './components/restaurants/restaurant-payment-means/restaurant-payment-means.component';
import { RestaurantServiceSettingsComponent } from './components/restaurants/restaurant-service-settings/restaurant-service-settings.component';
import { PromotionEditorComponent } from './components/restaurants/promotion-editor/promotion-editor.component';
import { PromotionViewerComponent } from './components/restaurants/promotion-viewer/promotion-viewer.component';
import { RestaurantPromotionsComponent } from './components/restaurants/restaurant-promotions/restaurant-promotions.component';
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
import { MenuItemsEditorComponent } from './components/restaurants/menu-items-editor/menu-items-editor.component';
import { LogEditorComponent } from './components/logs/log-editor/log-editor.component';
import { PaymentsDashboardComponent } from './components/payments/payments-dashboard/payments-dashboard.component';
import { TaskListComponent } from './components/tasks/task-list/task-list.component';
import { TaskDashboardComponent } from './components/tasks/task-dashboard/task-dashboard.component';
import { TaskGenericHandlerComponent } from './components/tasks/task-generic-handler/task-generic-handler.component';
import { Gmb2DashboardComponent } from './components/gmbs2/gmb2-dashboard/gmb2-dashboard.component';
import { IvrDashboardComponent } from './components/ivr/ivr-dashboard/ivr-dashboard.component';
import { IvrWidgetComponent } from './components/ivr/ivr-widget/ivr-widget.component';

import { GmbAccountListComponent } from './components/gmbs2/gmb-account-list/gmb-account-list.component';
import { GmbBizListComponent } from './components/gmbs2/gmb-biz-list/gmb-biz-list.component';
import { GmbCard2Component } from './components/gmbs2/gmb-card2/gmb-card2.component';
import { GmbAccountEditorComponent } from './components/gmbs2/gmb-account-editor/gmb-account-editor.component';
import { GmbRequestListComponent } from './components/gmbs2/gmb-request-list/gmb-request-list.component';
import { GmbUnderattackListComponent } from './components/gmbs2/gmb-underattack-list/gmb-underattack-list.component';
import { GmbSuspendedListComponent } from './components/gmbs2/gmb-suspended-list/gmb-suspended-list.component';
import { GmbLostListComponent } from './components/gmbs2/gmb-lost-list/gmb-lost-list.component';
import { TaskActionBarComponent } from './components/tasks/task-action-bar/task-action-bar.component';
import { OwlDateTimeModule, OwlNativeDateTimeModule } from 'ng-pick-datetime';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { EmailCodeReaderComponent } from './components/gmbs2/email-code-reader/email-code-reader.component';
import { Gmb3Service } from './services/gmb3.service';
import { TaskService } from './services/task.service';
import { TaskGmbApplyComponent } from './components/tasks/task-gmb-apply/task-gmb-apply.component';
import { GmbAccountHotlinkComponent } from './components/gmbs2/gmb-account-hotlink/gmb-account-hotlink.component';
import { TaskGeneratorComponent } from './components/tasks/task-generator/task-generator.component';
import { SmsSettingsComponent } from './components/system/sms-settings/sms-settings.component';
import { CcProessorSettingsComponent } from './components/system/cc-processor-settings/cc-processor-settings.component';
import { FaxSettingsComponent } from './components/system/fax-settings/fax-settings.component';
import { VoiceSettingsComponent } from './components/system/voice-settings/voice-settings.component';
import { TaskGmbAppealSuspendedComponent } from './components/tasks/task-gmb-appeal-suspended/task-gmb-appeal-suspended.component';
import { QuickDatePickerComponent } from './components/quick-date-picker/quick-date-picker.component';
import { LogsTableComponent } from './components/logs/logs-table/logs-table.component';
import { RestaurantLogsComponent } from './components/restaurants/restaurant-logs/restaurant-logs.component';
import { OrderActionBarComponent } from './components/restaurants/order-action-bar/order-action-bar.component';
import { OrderItemsComponent } from './components/restaurants/order-items/order-items.component';
import { OrderAdjustmentComponent } from './components/restaurants/order-adjustment/order-adjustment.component';
import { OrderRejectBarComponent } from './components/restaurants/order-reject-bar/order-reject-bar.component';
import { RestaurantDeliverySettingsComponent } from './components/restaurants/restaurant-delivery-settings/restaurant-delivery-settings.component';
import { RestaurantWebSettingsComponent } from './components/restaurants/restaurant-web-settings/restaurant-web-settings.component';
import { BanCustomerComponent } from './components/restaurants/ban-customer/ban-customer.component';
import { AdjustedDatePipe, moneyPipe, percentagePipe, sizePipe, telPipe } from './components/restaurants/pipes';
import { RestaurantDeliveryClosedHoursComponent } from './components/restaurants/restaurant-delivery-closed-hours/restaurant-delivery-closed-hours.component';
import { RestaurantClosedHoursComponent } from './components/restaurants/restaurant-closed-hours/restaurant-closed-hours.component';
import { StripeComponent } from './components/invoices/stripe/stripe.component';
import { FattmerchantComponent } from './components/invoices/fattmerchant/fattmerchant.component';
import { CheckEmailComponent } from './components/utilities/check-email/check-email.component';
import { SendGooglePINComponent } from './components/utilities/send-google-pin/send-google-pin.component';
import { ShowGooglePINComponent } from './components/utilities/show-google-pin/show-google-pin.component';
import { MyRestaurantComponent } from './components/restaurants/my-restaurant/my-restaurant.component';
import { HourPickerSimpleComponent } from './components/restaurants/hour-picker-simple/hour-picker-simple.component';
import { FutureDateTimePickerComponent } from './components/restaurants/future-date-time-picker/future-date-time-picker.component';
import { RestaurantGmbComponent } from './components/restaurants/restaurant-gmb/restaurant-gmb.component';
import { RestaurantDiagnosticsComponent } from './components/restaurants/restaurant-diagnostics/restaurant-diagnostics.component';
import { HolidayMonitorComponent } from './components/system/holiday-monitor/holiday-monitor.component';
import { MonitoringDashboardComponent } from './components/monitoring/monitoring-dashboard/monitoring-dashboard.component';
import { MonitoringFaxComponent } from './components/monitoring/monitoring-fax/monitoring-fax.component';
import { MonitoringEmailComponent } from './components/monitoring/monitoring-email/monitoring-email.component';
import { TransactionDashboardComponent } from './components/transaction/transaction-dashboard/transaction-dashboard.component';
import { MonitoringUnconfirmedOrdersComponent } from './components/monitoring/monitoring-unconfirmed-orders/monitoring-unconfirmed-orders.component';
import { ImageManagerComponent } from './components/utilities/image-manager/image-manager.component';
import { MonitoringOnboardingComponent } from './components/monitoring/monitoring-onboarding/monitoring-onboarding.component';
import { MonitoringDisabledRestaurantsComponent } from './components/monitoring/monitoring-disabled-restaurants/monitoring-disabled-restaurants.component';
import { MonitoringGmbComponent } from './components/monitoring/monitoring-gmb/monitoring-gmb.component';
import { MonitoringGmbTasksComponent } from './components/monitoring/monitoring-gmb-tasks/monitoring-gmb-tasks.component';
import { MonitoringDomainComponent } from './components/monitoring/monitoring-domain/monitoring-domain.component';
import { MonitoringPrintersComponent } from './components/monitoring/monitoring-printers/monitoring-printers.component';
import { MonitoringHoursComponent } from './components/monitoring/monitoring-hours/monitoring-hours.component';
import { MonitoringRestaurantsComponent } from './components/monitoring/monitoring-restaurants/monitoring-restaurants.component';
import { MonitoringPromotionComponent } from './components/monitoring/monitoring-promotion/monitoring-promotion.component';

import { TaskBarComponent } from './components/tasks/task-bar/task-bar.component';
import { AwsMigrationComponent } from './components/system/aws-migration/aws-migration.component';
import { WorkflowDashboardComponent } from './components/workflow/workflow-dashboard/workflow-dashboard.component';
import { SopDashboardComponent } from './components/sops/sop-dashboard/sop-dashboard.component';
import { SopDetailsComponent } from './components/sops/sop-details/sop-details.component';

import { NgxGraphModule } from '@swimlane/ngx-graph';
import { CyclesComponent } from './components/invoices/cycles/cycles.component';
import { CycleDetailsComponent } from './components/invoices/cycle-details/cycle-details.component';
import { GmbPinsComponent } from './components/gmbs2/gmb-pins/gmb-pins.component';
import { GmbTasksComponent } from './components/gmbs2/gmb-tasks/gmb-tasks.component';
import { ChangeOwnershipComponent } from './components/change-ownership/change-ownership.component';

import { BulkMessagingComponent } from './components/bulk-messaging/bulk-messaging.component';

import { RestaurantTasksComponent } from './components/restaurants/restaurant-tasks/restaurant-tasks.component';
import { MonitoringGmbOpenComponent } from './components/monitoring/monitoring-gmb-open/monitoring-gmb-open.component';
import { RestaurantGmbPostComponent } from './components/restaurants/restaurant-gmb-post/restaurant-gmb-post.component';
import { RestaurantGmbPostsComponent } from './components/restaurants/restaurant-gmb-posts/restaurant-gmb-posts.component';
import { GmbCampaignComponent } from './components/gmb-campaign/gmb-campaign.component';

import { EventDashboardComponent } from './components/events/event-dashboard/event-dashboard.component';
import { RestaurantWebTemplateComponent } from './components/restaurants/restaurant-web-template/restaurant-web-template.component';
import { BasicTplComponent } from './components/restaurants/templates/basic-tpl/basic-tpl.component';
import { MonitoringScriptComponent } from './components/monitoring/monitoring-script/monitoring-script.component';
import { MonitoringDbComponent } from './components/monitoring/monitoring-db/monitoring-db.component';
import { CrawlTemplateService } from './services/crawl-template.service';
import { InvoicesAnualComponent } from './components/invoices/invoices-anual/invoices-anual.component';
import { IvrAgentComponent } from './components/ivr/ivr-agent/ivr-agent.component';
import { ItemSorterComponent } from './components/shared/item-sorter/item-sorter.component';
import { YelpDashboardComponent } from './components/yelp/yelp-dashboard/yelp-dashboard.component';
import { YelpBusinessesComponent } from './components/yelp/yelp-businesses/yelp-businesses.component';
import { RestaurantYelpComponent } from './components/restaurants/restaurant-yelp/restaurant-yelp.component';
import { DashboardItemComponent } from './components/monitoring/dashboard-item/dashboard-item.component';
import { CourierDashboardComponent } from './components/couriers/courier-dashboard/courier-dashboard.component';
import { BroadcastingEditorComponent } from './components/broadcasting/broadcasting-editor/broadcasting-editor.component';
import { SanitizeDomPipe } from './pipes/sanitize-dom.pipe';
import { PostmatesListComponent } from './components/restaurants/postmates-list/postmates-list.component';
import { InvalidListComponent } from './components/restaurants/invalid-list/invalid-list.component';
import { RestaurantsCourierListComponent } from './components/restaurants/restaurants-courier-list/restaurants-courier-list.component';

import { RestarantChainsComponent } from './components/restaurants/restarant-chains/restarant-chains.component';
import { ChainsDashboardComponent } from './components/chains/chains-dashboard/chains-dashboard.component';
import { ChainComponent } from './components/chains/chain/chain.component';
import { CloudPrintingSettingsComponent } from './components/restaurants/cloud-printing-settings/cloud-printing-settings.component';
import { TemporarilyDisabledComponent } from './components/restaurants/temporarily-disabled/temporarily-disabled.component';
import { RestaurantFaxSettingsComponent } from './components/restaurants/fax-settings/fax-settings.component';
import { Form1099KComponent } from './components/restaurants/restaurant-form1099-k/restaurant-form1099-k.component';

import { OtherModulesComponent } from './components/monitoring/other-modules/other-modules.component';
import { BannedCustomersComponent } from './components/restaurants/banned-customers/banned-customers.component';
import { SchemasComponent } from './components/system/schemas/schemas.component';
import { SeamlessIntegrationComponent } from "./components/restaurants/seamless-integration/seamless-integration.component";
import { UploadCsvComponent } from "./components/restaurants/seamless-integration/upload-csv/upload-csv.component";
import { AddOneRtComponent } from "./components/restaurants/seamless-integration/add-one-rt/add-one-rt.component";
import { SendPostcardComponent } from "./components/restaurants/seamless-integration/send-postcard/send-postcard.component";
import { IvrAgentAnalysisComponent } from './components/ivr-agent-analysis/ivr-agent-analysis.component';
import { CsvGeneratorComponent } from './components/restaurants/seamless-integration/csv-generator/csv-generator.component';
import { RestaurantQrSettingsComponent } from './components/restaurants/restaurant-qr-settings/restaurant-qr-settings.component';
import { TimezoneOffsetPipe } from './pipes/timezone-offset.pipe';
import { AddNewLogComponent } from './components/restaurants/seamless-integration/add-new-log/add-new-log.component';
import { QrRestaurantListComponent } from './components/restaurants/qr-restaurant-list/qr-restaurant-list.component';
import { RestaurantStatsComponent } from './components/restaurants/restaurant-stats/restaurant-stats.component';
import { WeirdDataComponent } from './components/monitoring/weird-data/weird-data.component';
import { RestaurantTranslationsComponent } from './components/restaurants/restaurant-translations/restaurant-translations.component';

@NgModule({
  declarations: [
    AdjustedDatePipe, moneyPipe, percentagePipe, sizePipe, telPipe, TimezoneOffsetPipe,
    RootComponent,
    HomeComponent,
    MonitoringScriptComponent,
    MonitoringDbComponent,
    MonitoringGmbOpenComponent,
    LogsDashboardComponent,
    Bs4Component,
    UIPreviewComponent,
    DocViewerComponent,
    EventDashboardComponent,
    HeaderComponent,
    LoginComponent,
    ProfileComponent,
    UsersComponent,
    LeadDashboardComponent,
    LogEditorComponent,
    SystemDashboardComponent,
    DbScriptsComponent,
    RestaurantDashboardComponent,
    InvoiceDashboardComponent,
    OrderDashboardComponent,
    MyLeadsComponent,
    CallLoggerComponent,
    LeadInfoComponent,
    LeadCallLogComponent,
    SyncButtonsComponent,
    RestaurantCrawlerComponent,
    RestaurantMenuShufflerComponent,
    NewRestaurantComponent,
    InvoiceMonthlyComponent,
    InvoiceDetailsComponent,
    InvoiceEditorComponent,
    InvoiceMonthlyDetailsComponent,
    InvoiceOptionEditorComponent,
    InvoicesTableComponent,
    RestaurantDetailsComponent,
    RestaurantInvoicesComponent,
    RestaurantOrdersComponent,
    RestaurantApiLogsComponent,
    RestaurantContactsComponent,
    RestaurantRateSchedulesComponent,
    RestaurantSalesComponent,
    RestaurantFeeSchedulesComponent,
    RestaurantPaymentMeansComponent,
    RestaurantServiceSettingsComponent,
    PromotionEditorComponent,
    PromotionViewerComponent,
    RestaurantClosedHoursComponent,
    RestaurantDeliveryClosedHoursComponent,
    RestaurantPromotionsComponent,
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
    MenuItemsEditorComponent,
    OptionsEditorComponent,
    SwitchComponent,
    RadioGroupComponent,
    GmbCard2Component,
    PaymentsDashboardComponent,
    TaskListComponent,
    TaskDashboardComponent,
    TaskGenericHandlerComponent,
    Gmb2DashboardComponent,
    IvrDashboardComponent,
    IvrWidgetComponent,
    IvrAgentComponent,
    GmbAccountListComponent,
    GmbBizListComponent,
    GmbAccountEditorComponent,
    GmbRequestListComponent,
    GmbUnderattackListComponent,
    GmbSuspendedListComponent,
    GmbLostListComponent,
    TaskActionBarComponent,
    EmailCodeReaderComponent,
    TaskGmbAppealSuspendedComponent,
    TaskGmbApplyComponent,
    GmbAccountHotlinkComponent,
    TaskGeneratorComponent,
    SmsSettingsComponent,
    CcProessorSettingsComponent,
    FaxSettingsComponent,
    VoiceSettingsComponent,
    QuickDatePickerComponent,
    LogsTableComponent,
    RestaurantLogsComponent,
    OrderCardComponent,
    OrderActionBarComponent,
    OrderItemsComponent,
    OrderAdjustmentComponent,
    OrderRejectBarComponent,
    BanCustomerComponent,
    RestaurantDeliverySettingsComponent,
    RestaurantWebSettingsComponent,
    StripeComponent,
    FattmerchantComponent,
    CheckEmailComponent,
    SendGooglePINComponent,
    ShowGooglePINComponent,
    MyRestaurantComponent,
    HourPickerSimpleComponent,
    FutureDateTimePickerComponent,
    RestaurantGmbComponent,
    RestaurantDiagnosticsComponent,
    HolidayMonitorComponent,
    MonitoringDashboardComponent,
    MonitoringFaxComponent,
    MonitoringEmailComponent,
    TransactionDashboardComponent,
    MonitoringUnconfirmedOrdersComponent,
    ImageManagerComponent,
    MonitoringOnboardingComponent,
    TaskBarComponent,
    MonitoringDisabledRestaurantsComponent,
    MonitoringGmbComponent,
    MonitoringGmbTasksComponent,
    MonitoringDomainComponent,
    MonitoringPrintersComponent,
    MonitoringHoursComponent,
    MonitoringRestaurantsComponent,
    MonitoringPromotionComponent,
    AwsMigrationComponent,
    WorkflowDashboardComponent,
    SopDashboardComponent,
    SopDetailsComponent,
    CyclesComponent,
    CycleDetailsComponent,
    GmbPinsComponent,
    GmbTasksComponent,
    ChangeOwnershipComponent,
    BulkMessagingComponent,
    RestaurantTasksComponent,
    RestaurantGmbPostComponent,
    RestaurantGmbPostsComponent,
    GmbCampaignComponent,
    BasicTplComponent,
    RestaurantWebTemplateComponent,
    InvoicesAnualComponent,
    ItemSorterComponent,
    YelpDashboardComponent,
    YelpBusinessesComponent,
    RestaurantYelpComponent,
    DashboardItemComponent,
    CourierDashboardComponent,
    BroadcastingEditorComponent,
    SanitizeDomPipe,
    PostmatesListComponent,
    InvalidListComponent,
    RestaurantsCourierListComponent,
    RestarantChainsComponent,
    ChainsDashboardComponent,
    ChainComponent,
    CloudPrintingSettingsComponent,
    TemporarilyDisabledComponent,
    RestaurantFaxSettingsComponent,
    Form1099KComponent,
    OtherModulesComponent,
    BannedCustomersComponent,
    SchemasComponent,
    SeamlessIntegrationComponent,
    UploadCsvComponent,
    AddOneRtComponent,
    SendPostcardComponent,
    IvrAgentAnalysisComponent,
    CsvGeneratorComponent,
    RestaurantQrSettingsComponent,
    RestaurantStatsComponent,
    WeirdDataComponent,
    QrRestaurantListComponent,
    RestaurantTranslationsComponent,
    AddNewLogComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    HttpClientModule,
    NgxMaskModule.forRoot(),
    FormsModule,
    HttpModule,
    UiModule,
    OwlDateTimeModule,
    OwlNativeDateTimeModule,
    NgxGraphModule,
  ],
  providers: [
    GlobalService,
    Gmb3Service,
    RoleGuard,
    ApiService,
    TaskService,
    CacheService,
    PrunedPatchService,
    CrawlTemplateService,
    AmazonConnectService
  ],
  bootstrap: [RootComponent]
})
export class AppModule { }
