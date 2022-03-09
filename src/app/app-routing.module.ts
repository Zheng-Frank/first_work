import { MonitoringRtsWithoutAgreementComponent } from './components/monitoring/monitoring-rts-without-agreement/monitoring-rts-without-agreement.component';
import { MonitoringVipRestaurantsComponent } from './components/monitoring/monitoring-vip-restaurants/monitoring-vip-restaurants.component';
/* tslint:disable:max-line-length */
import { ApiLogsDashboardComponent } from './components/monitoring/api-logs-dashboard/api-logs-dashboard.component';
import { SeoTrackingComponent } from './components/monitoring/seo-tracking/seo-tracking.component';
import { PostmatesOrdersComponent } from './components/monitoring/postmates-orders/postmates-orders.component';
import { WeirdDataComponent } from './components/monitoring/weird-data/weird-data.component';
import { QrRestaurantListComponent } from './components/restaurants/qr-restaurant-list/qr-restaurant-list.component';
import { SchemasComponent } from './components/system/schemas/schemas.component';
import { BannedCustomersComponent } from './components/restaurants/banned-customers/banned-customers.component';
import { ImageManagerComponent } from './components/utilities/image-manager/image-manager.component';
import { MonitoringDisabledRestaurantsComponent } from './components/monitoring/monitoring-disabled-restaurants/monitoring-disabled-restaurants.component';
import { MonitoringClosedRestaurantsComponent } from './components/monitoring/monitoring-closed-restaurants/monitoring-closed-restaurants.component';
import { MonitoringHoursComponent } from './components/monitoring/monitoring-hours/monitoring-hours.component';
import { MonitoringEmailComponent } from './components/monitoring/monitoring-email/monitoring-email.component';
import { MonitoringFaxComponent } from './components/monitoring/monitoring-fax/monitoring-fax.component';
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Bs4Component } from './components/development/bs4/bs4.component';
import { UIPreviewComponent } from './components/development/ui-preview/ui-preview/ui-preview.component';
import { HomeComponent } from './components/home/home.component';
import { LogsDashboardComponent } from './components/logs/logs-dashboard/logs-dashboard.component';
import { InvoiceDashboardComponent } from './components/invoices/invoice-dashboard/invoice-dashboard.component';
import { LeadDashboardComponent } from './components/leads/lead-dashboard/lead-dashboard.component';
import { MyLeadsComponent } from './components/leads/my-leads/my-leads.component';
import { LoginComponent } from './components/login/login.component';
import { OrderDashboardComponent } from './components/orders/order-dashboard/order-dashboard.component';
import { ProfileComponent } from './components/profile/profile.component';
import { RestaurantDashboardComponent } from './components/restaurants/restaurant-dashboard/restaurant-dashboard.component';
import { RestaurantMapComponent } from './components/restaurants/restaurant-map/restaurant-map.component';
import { SystemDashboardComponent } from './components/system/system-dashboard/system-dashboard.component';
import { UsersComponent } from './components/users/users.component';
import { MenusComponent } from './components/restaurants/menus/menus.component';
import { MenuOptionsComponent } from './components/restaurants/menu-options/menu-options.component';
import { RoleGuard } from './role.guard';
import { InvoiceMonthlyDetailsComponent } from './components/invoices/invoice-monthly-details/invoice-monthly-details.component';
import { InvoiceDetailsComponent } from './components/invoices/invoice-details/invoice-details.component';
import { RestaurantDetailsComponent } from './components/restaurants/restaurant-details/restaurant-details.component';
import { RestaurantInvoicesComponent } from './components/restaurants/restaurant-invoices/restaurant-invoices.component';
import { RestaurantOrdersComponent } from './components/restaurants/restaurant-orders/restaurant-orders.component';
import { TaskDashboardComponent } from './components/tasks/task-dashboard/task-dashboard.component';
import { Gmb2DashboardComponent } from './components/gmbs2/gmb2-dashboard/gmb2-dashboard.component';
import { IvrDashboardComponent } from './components/ivr/ivr-dashboard/ivr-dashboard.component';
import { GmbAccountListComponent } from './components/gmbs2/gmb-account-list/gmb-account-list.component';
import { GmbBizListComponent } from './components/gmbs2/gmb-biz-list/gmb-biz-list.component';
import { GmbRequestListComponent } from './components/gmbs2/gmb-request-list/gmb-request-list.component';
import { GmbUnderattackListComponent } from './components/gmbs2/gmb-underattack-list/gmb-underattack-list.component';
import { GmbSuspendedListComponent } from './components/gmbs2/gmb-suspended-list/gmb-suspended-list.component';
import { GmbMissingListComponent } from './components/gmbs2/gmb-missing-list/gmb-missing-list.component';
import { GmbLostListComponent } from './components/gmbs2/gmb-lost-list/gmb-lost-list.component';
import { WorkflowDashboardComponent } from './components/workflow/workflow-dashboard/workflow-dashboard.component';
import { SopDashboardComponent } from './components/sops/sop-dashboard/sop-dashboard.component';
import { SopDetailsComponent } from './components/sops/sop-details/sop-details.component';
import { MonitoringDashboardComponent } from './components/monitoring/monitoring-dashboard/monitoring-dashboard.component';
import { TransactionDashboardComponent } from './components/transaction/transaction-dashboard/transaction-dashboard.component';
import { AwsMigrationComponent } from './components/system/aws-migration/aws-migration.component';
import { CyclesComponent } from './components/invoices/cycles/cycles.component';
import { CycleDetailsComponent } from './components/invoices/cycle-details/cycle-details.component';
import { GmbPinsComponent } from './components/gmbs2/gmb-pins/gmb-pins.component';
import { GmbTasksComponent } from './components/gmbs2/gmb-tasks/gmb-tasks.component';
import { DefendGmbTasksComponent } from './components/gmbs2/defend-gmb-tasks/defend-gmb-tasks.component';
import { EventDashboardComponent } from './components/events/event-dashboard/event-dashboard.component';
import { MonitoringRestaurantsComponent } from './components/monitoring/monitoring-restaurants/monitoring-restaurants.component';
import { IvrAgentComponent } from './components/ivr/ivr-agent/ivr-agent.component';
import { YelpDashboardComponent } from './components/yelp/yelp-dashboard/yelp-dashboard.component';
import { YelpBusinessesComponent } from './components/yelp/yelp-businesses/yelp-businesses.component';
import { CourierDashboardComponent } from './components/couriers/courier-dashboard/courier-dashboard.component';
import { MonitoringOnboardingComponent } from './components/monitoring/monitoring-onboarding/monitoring-onboarding.component';
import { PostmatesListComponent } from './components/restaurants/postmates-list/postmates-list.component';
import { InvalidListComponent } from './components/restaurants/invalid-list/invalid-list.component';
import { ChainsDashboardComponent } from './components/chains/chains-dashboard/chains-dashboard.component';
import { TemporarilyDisabledComponent } from './components/restaurants/temporarily-disabled/temporarily-disabled.component';
import { MonitoringUnconfirmedOrdersComponent } from './components/monitoring/monitoring-unconfirmed-orders/monitoring-unconfirmed-orders.component';
import { IvrAgentAnalysisComponent } from './components/ivr-agent-analysis/ivr-agent-analysis.component';
import { SeamlessIntegrationComponent } from './components/restaurants/seamless-integration/seamless-integration.component';
import { NotificationDashboardComponent } from './components/notification-dashboard/notification-dashboard.component';
import { MonitoringPromotionComponent } from './components/monitoring/monitoring-promotion/monitoring-promotion.component';
import { RestaurantsByCourierComponent } from './components/restaurants/restaurants-by-courier/restaurants-by-courier.component';
import { GmbWrongLinkComponent } from './components/gmbs2/gmb-wrong-link/gmb-wrong-link.component';
import { RoutineDashboardComponent } from './components/routines/routine-dashboard/routine-dashboard.component';
import { RoutineAdminDashboardComponent } from './components/routines/routine-admin-dashboard/routine-admin-dashboard.component';
import { GmbPermanentlyClosedListComponent } from './components/gmbs2/gmb-closed-list/gmb-closed-list.component';
import { LeadDashboard2Component } from './components/leads/lead-dashboard2/lead-dashboard2.component';
import { MyLeads2Component } from './components/leads/my-leads2/my-leads2.component';
import { CleanMenusComponent } from './components/monitoring/clean-menus/clean-menus.component';
import { FraudDetectionComponent } from './components/fraud-detection/fraud-detection.component';
import { CleanInsistedLinksComponent } from "./components/clean-insisted-links/clean-insisted-links.component";
import { OrderlessSignupsComponent } from './components/monitoring/orderless-signups/orderless-signups.component';
import { ExcessSmsNotificationsRtsComponent } from './components/monitoring/excess-sms-notifications-rts/excess-sms-notifications-rts.component';
import { RtsByProviderComponent } from './components/monitoring/rts-by-provider/rts-by-provider.component';
import { FaxHealthDashboardComponent } from './components/monitoring/fax-health-dashboard/fax-health-dashboard.component';
import { MonitoringDineInOrdersComponent } from './components/monitoring/monitoring-dine-in-orders/monitoring-dine-in-orders.component';
import { QmBmSstDashboardComponent } from "./components/monitoring/qm-bm-sst-dashboard/qm-bm-sst-dashboard.component"
import { Dashboard1099KComponent } from './components/system/1099k-dashboard/1099k-dashboard.component';
import { PhoneOrderingDashboardComponent } from './components/phone-ordering/phone-ordering-dashboard/phone-ordering-dashboard.component';

const routes: Routes = [
  { path: 'bs4', component: Bs4Component, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'DEVELOPER'] } },
  { path: 'ui-preview', component: UIPreviewComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'DEVELOPER'] } },
  { path: 'home', component: HomeComponent },
  { path: 'logs', component: LogsDashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'MARKETER_MANAGER', 'MARKETER', 'GMB', 'CSR', 'CSR_MANAGER', 'ACCOUNTANT', 'MENU_EDITOR', 'DRIVER', 'RATE_EDITOR'] } },
  { path: 'invoices', component: InvoiceDashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'ACCOUNTANT', 'CSR', 'CSR_MANAGER'] } },
  { path: 'invoices/cycles', component: CyclesComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'ACCOUNTANT'] } },
  { path: 'invoices/cycles/:id', component: CycleDetailsComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'ACCOUNTANT'] } },
  { path: 'invoices/monthly/:startDate', component: InvoiceMonthlyDetailsComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'ACCOUNTANT'] } },
  { path: 'invoices/:id', component: InvoiceDetailsComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'ACCOUNTANT', 'CSR', 'CSR_MANAGER', 'INVOICE_VIEWER'] } },
  { path: 'leads-old', component: LeadDashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'MARKETER'] } },
  { path: 'leads', component: LeadDashboard2Component, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'MARKETER', 'MARKETER_MANAGER', 'GMB', 'CSR', 'CSR_MANAGER'] } },
  { path: 'leads', component: LeadDashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'MARKETER', 'MARKETER_MANAGER', 'GMB'] } },
  { path: 'my-leads-old', component: MyLeadsComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'MARKETER'] } },
  { path: 'my-leads', component: MyLeads2Component, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'MARKETER', 'MARKETER_MANAGER'] } },
  { path: 'login', component: LoginComponent },
  { path: 'orders', component: OrderDashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'ACCOUNTANT', 'CSR', 'CSR_MANAGER'] } },
  { path: 'profile', component: ProfileComponent },
  { path: 'restaurants', component: RestaurantDashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'MENU_EDITOR', 'CSR', 'CSR_MANAGER', 'ACCOUNTANT', 'MARKETER'] } },
  { path: 'restaurant-map', component: RestaurantMapComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'MENU_EDITOR', 'CSR', 'CSR_MANAGER', 'ACCOUNTANT', 'MARKETER'] } },
  { path: 'restaurants/diagnostics', component: MonitoringRestaurantsComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'ACCOUNTANT', 'CSR', 'CSR_MANAGER'] } },
  { path: 'restaurants/:id', component: RestaurantDetailsComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'MENU_EDITOR', 'CSR', 'CSR_MANAGER', 'ACCOUNTANT', 'MARKETER'] } },
  { path: 'restaurants/:id/orders', component: RestaurantOrdersComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CSR', 'CSR_MANAGER'] } },
  { path: 'restaurants/:id/menus', component: MenusComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'MENU_EDITOR', 'CSR', 'CSR_MANAGER'] } },
  { path: 'restaurants/:id/menu-options', component: MenuOptionsComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'MENU_EDITOR', 'CSR', 'CSR_MANAGER'] } },
  { path: 'restaurants/:id/invoices', component: RestaurantInvoicesComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'ACCOUNTANT', 'CSR', 'CSR_MANAGER'] } },
  { path: 'qr-restaurant-list', component: QrRestaurantListComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CSR', 'CSR_MANAGER', 'MARKETER_MANAGER', 'MARKETER', 'ACCOUNTANT', 'MENU_EDITOR', 'RATE_EDITOR'] } },
  { path: 'ivr/dashboard', component: IvrDashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CSR', 'CSR_MANAGER'] } },
  { path: 'ivr/agent', component: IvrAgentComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'MARKETER_MANAGER', 'MARKETER', 'INVOICE_VIEWER', 'GMB', 'CSR', 'CSR_MANAGER', 'ACCOUNTANT', 'MENU_EDITOR', 'RATE_EDITOR'] } },
  { path: 'onboarding', component: MonitoringOnboardingComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'MARKETER_MANAGER', 'MARKETER', 'INVOICE_VIEWER', 'GMB', 'CSR', 'CSR_MANAGER', 'ACCOUNTANT', 'MENU_EDITOR', 'RATE_EDITOR'] } },
  { path: 'yelp', component: YelpDashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'GMB'] } },
  { path: 'yelp-businesses', component: YelpBusinessesComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'GMB'] } },
  { path: 'gmbs', component: Gmb2DashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'GMB'] } },
  { path: 'system', component: SystemDashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CSR_MANAGER'] } },

  { path: 'messaging', component: NotificationDashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CSR', 'CSR_MANAGER'] } },
  { path: 'couriers', component: CourierDashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN'] } },
  { path: 'chains', component: ChainsDashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CSR', 'CSR_MANAGER'] } },
  { path: 'monitoring', component: MonitoringDashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CSR', 'CSR_MANAGER', 'MARKETER_MANAGER'] } },
  { path: 'users', component: UsersComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CSR_MANAGER'] } },
  { path: 'tasks', component: TaskDashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'MARKETER_MANAGER', 'MARKETER', 'GMB', 'CSR', 'CSR_MANAGER', 'ACCOUNTANT', 'MENU_EDITOR', 'DRIVER', 'RATE_EDITOR'] } },
  { path: 'gmb-accounts', component: GmbAccountListComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'GMB'] } },
  { path: 'gmb-businesses', component: GmbBizListComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'GMB'] } },
  { path: 'gmb-requests', component: GmbRequestListComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'GMB'] } },
  { path: 'gmb-underattacks', component: GmbUnderattackListComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'GMB', 'CSR', 'CSR_MANAGER', 'GMB_SPECIALIST'] } },
  { path: 'gmb-wrong-link', component: GmbWrongLinkComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'GMB', 'CSR', 'CSR_MANAGER', 'GMB_SPECIALIST', 'MARKETER_INTERNAL'] } },
  { path: 'gmb-suspended', component: GmbSuspendedListComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'GMB', 'CSR', 'CSR_MANAGER', 'GMB_SPECIALIST'] } },
  { path: 'gmb-missing', component: GmbMissingListComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'GMB', 'CSR', 'CSR_MANAGER', 'GMB_SPECIALIST'] } },
  { path: 'gmb-closed', component: GmbPermanentlyClosedListComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'GMB', 'CSR', 'CSR_MANAGER', 'GMB_SPECIALIST'] } },
  { path: 'gmb-losts', component: GmbLostListComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'GMB', 'CSR', 'CSR_MANAGER', 'GMB_SPECIALIST'] } },
  { path: 'gmb-pins', component: GmbPinsComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'GMB'] } },
  { path: 'gmb-tasks', component: GmbTasksComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'GMB', 'GMB_SPECIALIST', 'GMB_ADMIN', 'MARKETER_INTERNAL'] } },
  { path: 'defend-gmb-tasks', component: DefendGmbTasksComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'GMB', 'CSR', 'CSR_MANAGER', 'ACCOUNTANT', 'MARKETER_INTERNAL'] } },
  { path: 'workflows', component: WorkflowDashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'MENU_EDITOR'] } },
  {
    path: 'sops', component: SopDashboardComponent, canActivate: [RoleGuard],
    data: {
      roles: [
        'ADMIN', 'ACCOUNT', 'CRM', 'CSR', 'CSR_MANAGER', 'DRIVER', 'GMB_SPECIALIST', 'GMB', 'INVOICE_VIEWER', 'IVR_CSR_MANAGER', 'IVR_GMB_MANAGER', 'IVR_INTERNAL_MANAGER',
        'IVR_SALES_MANAGER', 'MARKETER_EXTERNAL', 'MARKETER_INTERNAL', 'MARKETER', 'MARKETER_MANAGER', 'MENU_EDITOR', 'PAYER', 'RATE_EDITOR', 'SIGNUP_AGENT'
      ]
    }
  },
  { path: 'sops/:id', component: SopDetailsComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'MENU_EDITOR', 'CSR', 'CSR_MANAGER', 'ACCOUNTANT', 'MARKETER'] } },
  { path: 'events', component: EventDashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN'] } },
  { path: 'transactions', component: TransactionDashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN'] } },
  { path: 'migration', component: AwsMigrationComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN'] } },
  { path: 'postmates-list', component: PostmatesListComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CSR', 'CSR_MANAGER'] } },
  { path: 'postmates-orders', component: PostmatesOrdersComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CSR', 'CSR_MANAGER'] } },
  { path: 'restaurants-by-courier', component: RestaurantsByCourierComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CSR', 'CSR_MANAGER'] } },

  { path: 'invalid-list', component: InvalidListComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CSR', 'CSR_MANAGER', 'MARKETER_INTERNAL'] } },
  { path: 'temporarily-disabled', component: TemporarilyDisabledComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CSR', 'CSR_MANAGER', 'MARKETER_INTERNAL'] } },
  { path: 'unconfirmed-orders', component: MonitoringUnconfirmedOrdersComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CSR', 'CSR_MANAGER'] } },
  { path: 'fax-problems', component: MonitoringFaxComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CSR', 'CSR_MANAGER'] } },
  { path: 'email-problems', component: MonitoringEmailComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CSR', 'CSR_MANAGER'] } },
  { path: 'monitoring-hours', component: MonitoringHoursComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CSR', 'CSR_MANAGER'] } },
  { path: 'disabled-restaurants', component: MonitoringDisabledRestaurantsComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CSR', 'CSR_MANAGER', 'MARKETER'] } },
  { path: 'closed-restaurants', component: MonitoringClosedRestaurantsComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CSR', 'CSR_MANAGER'] } },
  { path: 'manage-images', component: ImageManagerComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CSR', 'CSR_MANAGER'] } },
  { path: 'restaurants-promotion', component: MonitoringPromotionComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CSR', 'CSR_MANAGER'] } },
  { path: 'banned-customers', component: BannedCustomersComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CSR', 'CSR_MANAGER'] } },
  { path: 'schemas', component: SchemasComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'DEVELOPER'] } },
  { path: 'seamless-integration', component: SeamlessIntegrationComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'SIGNUP_AGENT'] }, },
  { path: 'ivr-agent-analysis', component: IvrAgentAnalysisComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'SIGNUP_AGENT', 'MARKETER_MANAGER', 'MARKETER', 'INVOICE_VIEWER', 'GMB', 'CSR', 'CSR_MANAGER', 'ACCOUNTANT', 'MENU_EDITOR', 'RATE_EDITOR'] }, },
  { path: 'weird-data', component: WeirdDataComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CSR', 'CSR_MANAGER'] } },
  { path: 'api-logs', component: ApiLogsDashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN'] } },
  { path: 'routines', component: RoutineDashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'MARKETER_MANAGER', 'MARKETER', 'GMB', 'CSR', 'CSR_MANAGER', 'ACCOUNTANT', 'MENU_EDITOR', 'DRIVER', 'RATE_EDITOR'] } },
  { path: 'routines-admin', component: RoutineAdminDashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CSR_MANAGER'] } },
  { path: 'seo-tracking', component: SeoTrackingComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CSR', 'CSR_MANAGER'] } },
  { path: 'clean-menus', component: CleanMenusComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CSR', 'CSR_MANAGER'] } },
  { path: 'clean-insisted-link-rts', component: CleanInsistedLinksComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CSR', 'CSR_MANAGER'] } },
  { path: 'fraud-detection', component: FraudDetectionComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CSR', 'CSR_MANAGER'] } },
  { path: 'orderless-signups', component: OrderlessSignupsComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CSR', 'CSR_MANAGER'] } },
  { path: 'excess-sms-notifications-rts', component: ExcessSmsNotificationsRtsComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CSR', 'CSR_MANAGER'] } },
  { path: 'rts-by-provider', component: RtsByProviderComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CSR', 'CSR_MANAGER', 'MARKETER'] } },
  { path: 'vip-rts', component: MonitoringVipRestaurantsComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CSR_MANAGER'] } },
  { path: 'fax-health', component: FaxHealthDashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CSR_MANAGER', 'CSR'] } },
  { path: 'dine-in-orders', component: MonitoringDineInOrdersComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CSR', 'CSR_MANAGER'] } },
  { path: 'qm-bm-sst', component: QmBmSstDashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'MARKETER', 'MARKETER_INTERNAL', 'SST_USER'] } },
  { path: '1099k-dashboard', component: Dashboard1099KComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CSR', 'CSR_MANAGER'] } },
  { path: 'rts-without-agreement', component: MonitoringRtsWithoutAgreementComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CSR'] } },
  { path: 'phone-ordering', component: PhoneOrderingDashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CSR', 'CSR_MANAGER'] } },

  { path: '**', redirectTo: '/home' }

];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
