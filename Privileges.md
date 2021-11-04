# Privileges of all roles in Portal page and RT detail page

## Portal

| Section | Authorized Roles |
|---------|------------------|
| Search Restaurant | `ADMIN`, `CSR`, `CSR_MANAGER`, `MENU_EDITOR`, `MARKETER` |
| Change ownership | `ADMIN`, `CSR`, `CSR_MANAGER`, `MENU_EDITOR` |
| Postmates availability | `ADMIN`, `CSR`, `CSR_MANAGER`, `MARKETER` |
| Send Text Message | `ADMIN`, `CSR`, `CSR_MANAGER`, `MENU_EDITOR`, `MARKETER` |
| Send Fax | `ADMIN`, `CSR`, `CSR_MANAGER`, `MARKETER`, `MARKETER_INTERNAL` |
| GMB Campaign | `ADMIN` |
| Bulk Messaging | `ADMIN` |
| Broadcasting | `ADMIN`, `CSR`, `CSR_MANAGER` |
| Other Modules | Public |

## Other Modules 

| Module | Authorized Roles |
|---------|------------------|
| Json Schemas | `ADMIN`, `DEVELOPER ` |
| Bootstrap 4 | `ADMIN`, `DEVELOPER ` |
| UI Components Preview | `ADMIN`, `DEVELOPER ` |
| Unconfirmed Orders | `ADMIN`, `CSR`, `CSR_MANAGER` |
| Bad Hours | `ADMIN`, `CSR`, `CSR_MANAGER` |
| Banned Customers | `ADMIN`, `CSR`, `CSR_MANAGER` |
| Fax Problems | `ADMIN`, `CSR`, `CSR_MANAGER` |
| Disabled Restaurants | `ADMIN`, `CSR`, `CSR_MANAGER` |
| Closed Restaurants | `ADMIN`, `CSR`, `CSR_MANAGER` |
| Manage Images | `ADMIN`, `CSR`, `CSR_MANAGER` |
| Restaurants Promotion | `ADMIN`, `CSR`, `CSR_MANAGER` |
| Email Problems | `ADMIN`, `CSR`, `CSR_MANAGER` |
| Postmates List (Old) | `ADMIN`, `CSR`, `CSR_MANAGER` |
| Postmates Orders | `ADMIN`, `CSR`, `CSR_MANAGER` |
| Weird Data | `ADMIN`, `CSR`, `CSR_MANAGER` |
| SEO Tracking | `ADMIN` |
| API Logs Dashboard | `ADMIN` |
| Fraud Detection | `ADMIN`,  `CSR`, `CSR_MANAGER` |
| Clean Menus | `ADMIN`,  `CSR`, `CSR_MANAGER` |
| Clean Insisted Link Restaurants | `ADMIN`, `CSR`, `CSR_MANAGER` |
| Orderless Signups | `ADMIN`,  `CSR`, `CSR_MANAGER` |
| Leads (Old) | `ADMIN`, `MARKETER ` |
| My Leads (Old) | `ADMIN`, `MARKETER ` |
| Excess SMS Notifications | `ADMIN`, `CSR`, `CSR_MANAGER` |
| Restaurants by Provider | `ADMIN`, `CSR`, `CSR_MANAGER`, `MARKETER` |
| IVR Dashboard | `ADMIN`, `CSR`, `CSR_MANAGER`, `MARKETER` |
| VIP Restaurants | `ADMIN`, `CSR_MANAGER` |

## Restaurant

### Edit and Readonly
Editable if roles in {`ADMIN`, `MENU_EDITOR`, `CSR`, `CSR_MANAGER`, `ACCOUNTANT`, `MARKETER_INTERNAL`}
or RT's agent is invalid or RT's agent is current user

### Restaurant Tabs
| Tab | Authorized Roles |
|---------|------------------|
| Settings | `ADMIN`, `MENU_EDITOR`, `ACCOUNTANT`, `CSR`, `CSR_MANAGER`, `MARKETER`|
| GMB | `ADMIN`, `MENU_EDITOR`, `CSR`, `CSR_MANAGER`, `MARKETER` |
| Menus | `ADMIN`, `MENU_EDITOR`, `CSR`, `CSR_MANAGER`, `MARKETER` |
| Menu Options | `ADMIN`, `MENU_EDITOR`, `CSR`, `CSR_MANAGER`, `MARKETER` |
| Coupons | `ADMIN`, `MENU_EDITOR`, `CSR`, `CSR_MANAGER`, `MARKETER` |
| Orders | `ADMIN`, `CSR`, `CSR_MANAGER`, `MARKETER` |
| Invoices | `ADMIN`, `ACCOUNTANT`, `CSR`, `CSR_MANAGER` |
| Logs | `ADMIN`, `MENU_EDITOR`, `ACCOUNTANT`, `CSR`, `CSR_MANAGER`, `MARKETER` |
| IVR | `ADMIN`, `CSR`, `CSR_MANAGER` |
| Tasks | `ADMIN`, `MENU_EDITOR`, `ACCOUNTANT`, `CSR`, `CSR_MANAGER`, `MARKETER`, `GMB` |
| Diagnostics | `ADMIN`, `MENU_EDITOR`, `ACCOUNTANT`, `CSR`, `CSR_MANAGER`, `MARKETER`, `GMB` |
| Others | `ADMIN`, `MENU_EDITOR`, `ACCOUNTANT`, `CSR`, `CSR_MANAGER`, `MARKETER` |


### Sections in Settings tab
| Section | Authorized Roles |
|---------|------------------|
| profile | `ADMIN`, `MENU_EDITOR`, `ACCOUNTANT`, `CSR`, `CSR_MANAGER`, `MARKETER` |
| contacts | `ADMIN`, `MENU_EDITOR`, `ACCOUNTANT`, `CSR`, `CSR_MANAGER`, `MARKETER_INTERNAL` |
| rateSchedules | `ADMIN`, `RATE_EDITOR` |
| feeSchedules | `ADMIN`, `RATE_EDITOR`, `MARKETER`, `CSR`, `CSR_MANAGER` |
| paymentMeans | `ACCOUNTANT`, `CSR`, `CSR_MANAGER`, `MARKETER` |
| serviceSettings | `ADMIN`, `MENU_EDITOR`, `CSR`, `CSR_MANAGER`, `MARKETER` |
| promotions |  |
| qrSettings | `ADMIN`, `MENU_EDITOR`, `CSR`, `CSR_MANAGER`, `MARKETER` |
| closedHours | `ADMIN`, `MENU_EDITOR`, `CSR`, `CSR_MANAGER`, `MARKETER` |
| cloudPrinting | `ADMIN`, `MENU_EDITOR`, `CSR`, `CSR_MANAGER`, `MARKETER` |
| faxSettings | `ADMIN`, `MENU_EDITOR`, `CSR`, `CSR_MANAGER`, `MARKETER` |
| phones | `ADMIN`, `MENU_EDITOR`, `CSR`, `CSR_MANAGER`, `MARKETER` |
| deliverySettings | `ADMIN`, `MENU_EDITOR`, `CSR`, `CSR_MANAGER`, `MARKETER` |
| webSettings | `ADMIN`, `MENU_EDITOR`, `CSR`, `CSR_MANAGER`, `MARKETER`, `GMB` |
| restaurantManagedWebSettings | `ADMIN`, `GMB_SPECIALIST`, `MENU_EDITOR` |
| restaurantChains | `ADMIN`, `CSR`, `CSR_MANAGER` |


