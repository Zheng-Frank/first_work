# Privileges of all roles in Portal page and RT detail page

## Portal

| Section | Authorized Roles |
|---------|------------------|
| Search Restaurant | `ADMIN`, `CSR`, `MENU_EDITOR`, `MARKETER` |
| Change ownership | `ADMIN`, `CSR`, `MENU_EDITOR` |
| Postmates availability | `ADMIN`, `CSR`, `MARKETER` |
| Send Text Message | `ADMIN`, `CSR`, `MENU_EDITOR`, `MARKETER` |
| Send Fax | `ADMIN`, `CSR`|
| GMB Campaign | `ADMIN` |
| Bulk Messaging | `ADMIN` |
| Broadcasting | `ADMIN`, `CSR` |
| Other Modules | Public |

## Other Modules 

| Module | Authorized Roles |
|---------|------------------|
| Json Schemas | `ADMIN`, `DEVELOPER ` |
| Bootstrap 4 | `ADMIN`, `DEVELOPER ` |
| UI Components Preview | `ADMIN`, `DEVELOPER ` |
| Unconfirmed Orders | `ADMIN`, `CSR ` |
| Bad Hours | `ADMIN`, `CSR ` |
| Banned Customers | `ADMIN`, `CSR ` |
| Fax Problems | `ADMIN`, `CSR ` |
| Disabled Restaurants | `ADMIN`, `CSR ` |
| Closed Restaurants | `ADMIN`, `CSR ` |
| Manage Images | `ADMIN`, `CSR ` |
| Restaurants Promotion | `ADMIN`, `CSR ` |
| Email Problems | `ADMIN`, `CSR ` |
| Postmates List (Old) | `ADMIN`, `CSR ` |
| Postmates Orders | `ADMIN`, `CSR ` |
| Weird Data | `ADMIN`, `CSR ` |
| SEO Tracking (Coming Soon) | `ADMIN` |
| API Logs Dashboard | `ADMIN` |
| Fraud Detection | `ADMIN`,  `CSR ` |
| Clean Menus | `ADMIN`,  `CSR ` |
| Clean Insisted Link Restaurants | `ADMIN`, `CSR ` |
| Orderless Signups | `ADMIN`,  `CSR ` |
| Leads (Old) | `ADMIN`, `MARKETER ` |
| My Leads (Old) | `ADMIN`, `MARKETER ` |
| Excess SMS Notifications | `ADMIN`, `CSR ` |

## Restaurant

### Edit and Readonly
Editable if roles in {`ADMIN`, `MENU_EDITOR`, `CSR`, `ACCOUNTANT`, `MARKETER_INTERNAL`}
or RT's agent is invalid or RT's agent is current user

### Restaurant Tabs
| Tab | Authorized Roles |
|---------|------------------|
| Settings | `ADMIN`, `MENU_EDITOR`, `ACCOUNTANT`, `CSR`, `MARKETER`|
| GMB | `ADMIN`, `MENU_EDITOR`, `CSR`, `MARKETER` |
| Menus | `ADMIN`, `MENU_EDITOR`, `CSR`, `MARKETER` |
| Menu Options | `ADMIN`, `MENU_EDITOR`, `CSR`, `MARKETER` |
| Coupons | `ADMIN`, `MENU_EDITOR`, `CSR`, `MARKETER` |
| Orders | `ADMIN`, `CSR`, `MARKETER` |
| Invoices | `ADMIN`, `ACCOUNTANT`, `CSR` |
| Logs | `ADMIN`, `MENU_EDITOR`, `ACCOUNTANT`, `CSR`, `MARKETER` |
| IVR | `ADMIN`, `CSR` |
| Tasks | `ADMIN`, `MENU_EDITOR`, `ACCOUNTANT`, `CSR`, `MARKETER`, `GMB` |
| Diagnostics | `ADMIN`, `MENU_EDITOR`, `ACCOUNTANT`, `CSR`, `MARKETER`, `GMB` |
| Others | `ADMIN`, `MENU_EDITOR`, `ACCOUNTANT`, `CSR`, `MARKETER` |


### Sections in Settings tab
| Section | Authorized Roles |
|---------|------------------|
| profile | `ADMIN`, `MENU_EDITOR`, `ACCOUNTANT`, `CSR`, `MARKETER` |
| contacts | `ADMIN`, `MENU_EDITOR`, `ACCOUNTANT`, `CSR`, `MARKETER_INTERNAL` |
| rateSchedules | `ADMIN`, `RATE_EDITOR` |
| feeSchedules | `ADMIN`, `RATE_EDITOR`, `MARKETER`, `CSR` |
| paymentMeans | `ACCOUNTANT`, `CSR`, `MARKETER` |
| serviceSettings | `ADMIN`, `MENU_EDITOR`, `CSR`, `MARKETER` |
| promotions |  |
| qrSettings | `ADMIN`, `MENU_EDITOR`, `CSR`, `MARKETER` |
| closedHours | `ADMIN`, `MENU_EDITOR`, `CSR`, `MARKETER` |
| cloudPrinting | `ADMIN`, `MENU_EDITOR`, `CSR`, `MARKETER` |
| faxSettings | `ADMIN`, `MENU_EDITOR`, `CSR`, `MARKETER` |
| phones | `ADMIN`, `MENU_EDITOR`, `CSR`, `MARKETER` |
| deliverySettings | `ADMIN`, `MENU_EDITOR`, `CSR`, `MARKETER` |
| webSettings | `ADMIN`, `MENU_EDITOR`, `CSR`, `MARKETER`, `GMB` |
| restaurantManagedWebSettings | `ADMIN`, `GMB_SPECIALIST`, `MENU_EDITOR` |
| restaurantChains | `ADMIN`, `CSR` |


