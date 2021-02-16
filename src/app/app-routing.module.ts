import { BannedCustomersComponent } from './components/restaurants/banned-customers/banned-customers.component';
import { BanCustomerComponent } from './components/restaurants/ban-customer/ban-customer.component';
import { ImageManagerComponent } from './components/utilities/image-manager/image-manager.component';
import { MonitoringDisabledRestaurantsComponent } from './components/monitoring/monitoring-disabled-restaurants/monitoring-disabled-restaurants.component';
import { MonitoringHoursComponent } from './components/monitoring/monitoring-hours/monitoring-hours.component';
import { MonitoringEmailComponent } from './components/monitoring/monitoring-email/monitoring-email.component';
import { MonitoringDomainComponent } from './components/monitoring/monitoring-domain/monitoring-domain.component';
import { MonitoringFaxComponent } from './components/monitoring/monitoring-fax/monitoring-fax.component';
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Bs4Component } from './components/bs4/bs4.component';
import { HomeComponent } from './components/home/home.component';
import { LogsDashboardComponent } from './components/logs/logs-dashboard/logs-dashboard.component';
import { PaymentsDashboardComponent } from './components/payments/payments-dashboard/payments-dashboard.component';
import { InvoiceDashboardComponent } from './components/invoices/invoice-dashboard/invoice-dashboard.component';
import { LeadDashboardComponent } from './components/leads/lead-dashboard/lead-dashboard.component';
import { MyLeadsComponent } from './components/leads/my-leads/my-leads.component';
import { LoginComponent } from './components/login/login.component';
import { OrderDashboardComponent } from './components/orders/order-dashboard/order-dashboard.component';
import { ProfileComponent } from './components/profile/profile.component';
import { RestaurantDashboardComponent } from './components/restaurants/restaurant-dashboard/restaurant-dashboard.component';
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
import { EventDashboardComponent } from './components/events/event-dashboard/event-dashboard.component';
import { MonitoringGmbOpenComponent } from './components/monitoring/monitoring-gmb-open/monitoring-gmb-open.component';
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
 
const routes: Routes = [
  { path: 'bs4', component: Bs4Component, canActivate: [RoleGuard], data: { roles: ['ADMIN'] } },
  { path: 'home', component: HomeComponent, canActivate: [RoleGuard], data: { roles: ['MENU_EDITOR', 'ADMIN', 'MARKETER', 'MARKETING_DIRECTOR', 'ACCOUNTANT', 'GMB', 'CSR'] } },
  { path: 'logs', component: LogsDashboardComponent, canActivate: [RoleGuard], data: { roles: ["ADMIN", "MARKETING_DIRECTOR", "MARKETER", "GMB", "CSR", "ACCOUNTANT", "MENU_EDITOR", "DRIVER", "RATE_EDITOR"] } },
  { path: 'payments', component: PaymentsDashboardComponent, canActivate: [RoleGuard], data: { roles: ['CSR', 'ACCOUNTANT', 'ADMIN'] } },
  { path: 'invoices', component: InvoiceDashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'ACCOUNTANT', 'CSR'] } },
  { path: 'invoices/cycles', component: CyclesComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'ACCOUNTANT'] } },
  { path: 'invoices/cycles/:id', component: CycleDetailsComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'ACCOUNTANT'] } },
  { path: 'invoices/monthly/:startDate', component: InvoiceMonthlyDetailsComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'ACCOUNTANT'] } },
  { path: 'invoices/:id', component: InvoiceDetailsComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'ACCOUNTANT', 'CSR', 'INVOICE_VIEWER'] } },
  { path: 'leads', component: LeadDashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'MARKETER', 'MARKETING_DIRECTOR', "GMB","CSR"] } },
  { path: 'my-leads', component: MyLeadsComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'MARKETER', 'MARKETING_DIRECTOR'] } },
  { path: 'login', component: LoginComponent },
  { path: 'orders', component: OrderDashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'ACCOUNTANT','CSR'] } },
  { path: 'profile', component: ProfileComponent },
  { path: 'restaurants', component: RestaurantDashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'MENU_EDITOR', "CSR", "ACCOUNTANT", "MARKETER"] } },
  { path: 'restaurants/diagnostics', component: MonitoringRestaurantsComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'ACCOUNTANT', 'CSR'] } },
  { path: 'restaurants/:id', component: RestaurantDetailsComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'MENU_EDITOR', 'CSR', 'ACCOUNTANT', "MARKETER"] } },
  { path: 'restaurants/:id/orders', component: RestaurantOrdersComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CSR'] } },
  { path: 'restaurants/:id/menus', component: MenusComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'MENU_EDITOR', 'CSR'] } },
  { path: 'restaurants/:id/menu-options', component: MenuOptionsComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'MENU_EDITOR', 'CSR'] } },
  { path: 'restaurants/:id/invoices', component: RestaurantInvoicesComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'ACCOUNTANT', 'CSR'] } },
  { path: 'ivr/dashboard', component: IvrDashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CSR'] } },
  { path: 'ivr/agent', component: IvrAgentComponent, canActivate: [RoleGuard], data: { roles: ["ADMIN", "MARKETING_DIRECTOR", "MARKETER", "INVOICE_VIEWER", "GMB", "CSR", "ACCOUNTANT", "MENU_EDITOR", "RATE_EDITOR"] } },
  { path: 'onboarding', component: MonitoringOnboardingComponent, canActivate: [RoleGuard], data: { roles: ["ADMIN", "MARKETING_DIRECTOR", "MARKETER", "INVOICE_VIEWER", "GMB", "CSR", "ACCOUNTANT", "MENU_EDITOR", "RATE_EDITOR"] } },
  { path: 'yelp', component: YelpDashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'GMB'] } },
  { path: 'yelp-businesses', component: YelpBusinessesComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'GMB'] } },
  { path: 'gmbs', component: Gmb2DashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'GMB'] } },
  { path: 'system', component: SystemDashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN'] } },
  { path: 'couriers', component: CourierDashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN'] } },
  { path: 'chains', component: ChainsDashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CSR'] } },
  { path: 'monitoring', component: MonitoringDashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CSR'] } },
  { path: 'users', component: UsersComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN'] } },
  { path: 'tasks', component: TaskDashboardComponent, canActivate: [RoleGuard], data: { roles: ["ADMIN", "MARKETING_DIRECTOR", "MARKETER", "GMB", "CSR", "ACCOUNTANT", "MENU_EDITOR", "DRIVER", "RATE_EDITOR"] } },
  { path: 'gmb-accounts', component: GmbAccountListComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'GMB'] } },
  { path: 'gmb-businesses', component: GmbBizListComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'GMB'] } },
  { path: 'gmb-requests', component: GmbRequestListComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'GMB'] } },
  { path: 'gmb-underattacks', component: GmbUnderattackListComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'GMB', 'CSR', 'GMB_SPECIALIST'] }},
  { path: 'gmb-suspended', component: GmbSuspendedListComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'GMB', 'CSR', 'GMB_SPECIALIST'] }},
  { path: 'gmb-losts', component: GmbLostListComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'GMB', 'CSR', 'GMB_SPECIALIST'] }},
  { path: 'gmb-pins', component: GmbPinsComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'GMB'] } },
  { path: 'gmb-tasks', component: GmbTasksComponent, canActivate: [RoleGuard], data: { roles: ["ADMIN", "GMB", "CSR", "ACCOUNTANT", "MARKETER_INTERNAL"] } },
  { path: 'gmb-open', component: MonitoringGmbOpenComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'GMB'] } },
  { path: 'workflows', component: WorkflowDashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'MENU_EDITOR'] } },
  { path: 'sops', component: SopDashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'MENU_EDITOR', "CSR", "ACCOUNTANT", "MARKETER"] } },
  { path: 'sops/:id', component: SopDetailsComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'MENU_EDITOR', "CSR", "ACCOUNTANT", "MARKETER"] } },
  { path: 'events', component: EventDashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN'] } },
  { path: 'transaction', component: TransactionDashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN'] } },
  { path: 'migration', component: AwsMigrationComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN'] } },
  { path: 'postmates-list', component: PostmatesListComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CSR'] } },
  { path: 'invalid-list', component: InvalidListComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CSR','MARKETER_INTERNAL'] } },
  { path: 'temporarily-disabled', component: TemporarilyDisabledComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CSR','MARKETER_INTERNAL'] } },
  { path:'unconfirmed-orders',component:MonitoringUnconfirmedOrdersComponent,canActivate:[RoleGuard],data:{roles:['ADMIN', 'CSR']}},
  { path:'fax-problems',component:MonitoringFaxComponent,canActivate:[RoleGuard],data:{roles:['ADMIN','CSR']}},
  { path:'email-problems',component:MonitoringEmailComponent,canActivate:[RoleGuard],data:{roles:['ADMIN','CSR']}} ,
  { path:'monitoring-hours',component:MonitoringHoursComponent,canActivate:[RoleGuard],data:{roles:['ADMIN','CSR']}} ,
  { path:'disabled-restaurants',component:MonitoringDisabledRestaurantsComponent,canActivate:[RoleGuard],data:{roles:['ADMIN','CSR']}} ,
  { path:'manage-images',component:ImageManagerComponent,canActivate:[RoleGuard],data:{roles:['ADMIN']}} ,
  { path:'banned-customers', component: BannedCustomersComponent,canActivate:[RoleGuard],data:{roles: ['ADMIN', 'GMB','CSR']}},
  { path: '**', redirectTo: '/home' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
