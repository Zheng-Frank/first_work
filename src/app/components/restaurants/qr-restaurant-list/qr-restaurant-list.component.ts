import { AlertType } from './../../../classes/alert-type';
import { Log } from 'src/app/classes/log';
import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import { ViewChild } from '@angular/core';
import { filter, map } from 'rxjs/operators';
import { GlobalService } from 'src/app/services/global.service';
import { environment } from 'src/environments/environment';
import { ApiService } from 'src/app/services/api.service';
import { Component, OnInit } from '@angular/core';
import { PrunedPatchService } from 'src/app/services/prunedPatch.service';
enum QRConfiguredTypes {
  ALL = 'All',
  CORRECT_CONFIGURATION = 'Correct configuration',
  WRONG_CONFIGURATION = 'Wrong configuration'
}
@Component({
  selector: 'app-qr-restaurant-list',
  templateUrl: './qr-restaurant-list.component.html',
  styleUrls: ['./qr-restaurant-list.component.css']
})
export class QrRestaurantListComponent implements OnInit {

  @ViewChild('schedulesModal') schedulesModal: ModalComponent;
  qrRestaurantListRows;
  qrFilterRestaurantListRows;
  qrFullyConfigured = false;
  filterTypes = [QRConfiguredTypes.ALL, QRConfiguredTypes.CORRECT_CONFIGURATION, QRConfiguredTypes.WRONG_CONFIGURATION];
  filterType = QRConfiguredTypes.ALL;
  qrSalespeople = []; // filter by QR Sales people.
  qrSalesperson = 'All';
  knownUsers = [];
  restaurantsColumnDescriptors = [
    {
      label: 'Number'
    },
    {
      label: "Restaurant",
      paths: ['name'],
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },
    {
      label: "Num QR orders",
      sort: (a, b) => a.qrOrderNumber - b.qrOrderNumber
    },
    {
      label: "Correct/Wrong Reasons"  // why restaurant is wrong.
    },
    {
      label: "QR createdAt",
      sort: (a, b) => {
        if (a.qrSettings.createdAt && b.qrSettings.createdAt) {
          return new Date(a.qrSettings.createdAt).valueOf() - new Date(b.qrSettings.createdAt).valueOf()
        } else if (a.qrSettings.createdAt && !b.qrSettings.createdAt) {
          return 1;
        } else if (!a.qrSettings.createdAt && b.qrSettings.createdAt) {
          return -1;
        }
      }
    },
    {
      label: "Logs"
    }

  ];
  targets = [
    {
      value: 'ONLINE_ONLY',
      text: 'Online only'
    }, {
      value: 'DINE_IN_ONLY',
      text: 'Dine-in only'
    }, {
      value: 'ALL',
      text: 'Both online and dine-in'
    }];
  schedulesRestaurant;
  showAllLogs = false;
  hideMore20OrdersFlag = false;
  logInEditing = new Log();
  @ViewChild('logEditingModal') logEditingModal;
  @ViewChild('QRSettingsFiltersModal') QRSettingsFiltersModal;
  restaurant; // used to select restaurant which need to edit.
  // qr settings filters
  hasSignHolders;
  hasQRTraining;
  qrCodesMailed;
  qrCodesObtained;

  constructor(private _api: ApiService, private _global: GlobalService, private _prunedPatch: PrunedPatchService) { }

  ngOnInit() {
    this.populateQrRestaurant();
  }

  isSchedulesValid(restaurant) {
    return !(restaurant.feeSchedules && restaurant.feeSchedules.filter(f => f.payee === 'QMENU' && f.name === 'service fee' && !(!(f.rate > 0) && !(f.amount > 0)) && f.orderTypes && f.orderTypes.filter(type => type === 'DINE-IN').length > 0).length > 0);
  }
  // if it has some schedule problems , it should open modal to let saleperson fix it.
  openSchedulesModal(restaurant) {
    this.schedulesRestaurant = restaurant;
    this.schedulesModal.show();
  }
  /**
   * add a new filter type , filtering by qr salesperson.
   */
  filterByQRSalesperson() {
    if (this.qrSalesperson === 'All') {
      this.qrFilterRestaurantListRows = this.qrFilterRestaurantListRows;
    } else if (this.qrSalesperson) { // the qrSalesperson may be undefined,and it will make interact wrong.
      this.qrFilterRestaurantListRows = this.qrFilterRestaurantListRows
        .filter(qrList => this.qrSalesperson === qrList.qrSettings.agent);
    }
  }
  // filter having interact
  filter() {
    /**
    * RT is considered to have complete QR code setup if:
     "QR fully configured"
     Has fee schedules (not rate schedules)
     Must have at least one menu with dine-in type (or both dine-in and online)
     Must have fee setting for dine-in specifically:
     must have at least one fee where: 
     a) Qmenu is receiving money, 
     b) the service type includes dine-in, 
     c) the type is "service fee", 
     d) amount/percent is NOT 0.
     it also need qrSettings.code exists and is not null. 
    */
    switch (this.filterType) {
      case QRConfiguredTypes.ALL:
        this.qrFilterRestaurantListRows = this.qrRestaurantListRows;
        break;
      case QRConfiguredTypes.CORRECT_CONFIGURATION:
        this.qrFilterRestaurantListRows = this.filterCorrectConfig();
        break;
      case QRConfiguredTypes.WRONG_CONFIGURATION:
        let temp = this.filterCorrectConfig();
        this.qrFilterRestaurantListRows = this.qrRestaurantListRows.filter(qrList => !temp.includes(qrList));
        break;
      default:
        this.qrFilterRestaurantListRows = this.qrRestaurantListRows;
        break;
    }
    /**
    * add a new filter type , filtering by qr salesperson.
    */
    this.filterByQRSalesperson();
    /**
    * to check it if should show rts > 20 orders. .
    */
    this.hidenRTsMoreThan20Orders();
    /*
     * filter with qrSetting new field.
    */
    this.filterByQRSettings();
  }

  filterByQRSettings(){
    if (this.hasSignHolders || this.hasQRTraining || this.qrCodesMailed || this.qrCodesObtained) {
      this.qrFilterRestaurantListRows = this.qrFilterRestaurantListRows
        .filter(qrList => qrList.qrSettings.hasSignHolders.hasSignHolders || qrList.qrSettings.hasQRTraining.hasQRTraining || qrList.qrSettings.qrCodesMailed.qrCodesMailed || qrList.qrSettings.qrCodesObtained.qrCodesObtained);
    } else {
      this.qrFilterRestaurantListRows = this.qrFilterRestaurantListRows
      .filter(qrList =>!(qrList.qrSettings.hasSignHolders.hasSignHolders || qrList.qrSettings.hasQRTraining.hasQRTraining || qrList.qrSettings.qrCodesMailed.qrCodesMailed || qrList.qrSettings.qrCodesObtained.qrCodesObtained));
    }
    this.QRSettingsFiltersModal.hide();
  }

  // add qr setting filter 
  addQRSettingFilters(selectRestaurant, flag) {
    /*
      hasSignHolders;
      hasQRTraining;
      qrCodesMailed;
      qrCodesObtained;
    */
    switch (flag) {
      case 0:
        if (selectRestaurant.qrSettings.hasSignHolders && selectRestaurant.qrSettings.hasSignHolders.hasSignHolders) {
          selectRestaurant.qrSettings.hasSignHolders = {
            hasSignHolders: false,
            updateAt: new Date()
          };
        } else {
          selectRestaurant.qrSettings.hasSignHolders = {
            hasSignHolders: true,
            updateAt: new Date()
          };
        }
        break;
      case 1:
        if (selectRestaurant.qrSettings.hasQRTraining && selectRestaurant.qrSettings.hasQRTraining.hasQRTraining) {
          selectRestaurant.qrSettings.hasQRTraining = {
            hasQRTraining: false,
            updateAt: new Date()
          };
        } else {
          selectRestaurant.qrSettings.hasQRTraining = {
            hasQRTraining: true,
            updateAt: new Date()
          };
        }
        break;
      case 2:
        if (selectRestaurant.qrSettings.qrCodesMailed && selectRestaurant.qrSettings.qrCodesMailed.qrCodesMailed) {
          selectRestaurant.qrSettings.qrCodesMailed = {
            qrCodesMailed: false,
            updateAt: new Date()
          };
        } else {
          selectRestaurant.qrSettings.qrCodesMailed = {
            qrCodesMailed: true,
            updateAt: new Date()
          };
        }
        break;
      case 3:
        if (selectRestaurant.qrSettings.qrCodesObtained && selectRestaurant.qrSettings.qrCodesObtained.qrCodesObtained) {
          selectRestaurant.qrSettings.qrCodesObtained = {
            qrCodesObtained: false,
            updateAt: new Date()
          };
        } else {
          selectRestaurant.qrSettings.qrCodesObtained = {
            qrCodesObtained: true,
            updateAt: new Date()
          };
        }
        break;
      default:
        break;
    }

    this._prunedPatch.patch(environment.qmenuApiUrl + 'generic?resource=restaurant',
      [{ old: { _id: selectRestaurant._id }, new: { _id: selectRestaurant._id, qrSettings: selectRestaurant.qrSettings } }])
      .subscribe(
        result => {
          // assuming everything successful
          this._global.publishAlert(
            AlertType.Success,
            'Success Add a new feature fields of QR Settings.'
          );
          // reload list
          this.populateQrRestaurant();
        },
        error => {
          this._global.publishAlert(AlertType.Danger, 'Error');
        }
      );
  }

  // the qr restaurant also has some other features need to show modal and filter. 
  showQRSettingsFilters() {
    this.hasSignHolders = false;
    this.hasQRTraining = false;
    this.qrCodesMailed = false;
    this.qrCodesObtained = false;
    this.QRSettingsFiltersModal.show();
  }

  // the function is used to hide restaurant whose qr orders more than 20. 
  hidenRTsMoreThan20Orders() {
    if (this.hideMore20OrdersFlag) {
      this.qrFilterRestaurantListRows = this.qrFilterRestaurantListRows
        .filter(qrList => qrList.qrOrderNumber <= 20);
    } else {
      this.qrFilterRestaurantListRows = this.qrFilterRestaurantListRows;
    }
  }

  addLog(selectRestaurant) {
    this.logInEditing = new Log();
    this.logInEditing.type = 'qr-dine-in';
    this.restaurant = selectRestaurant;
    this.logEditingModal.show();
  }

  onCancelAddLog() {
    this.logEditingModal.hide();
  }

  onSuccessAddLog(data) {
    const oldRestaurant = JSON.parse(JSON.stringify(this.restaurant));
    const updatedRestaurant = JSON.parse(JSON.stringify(oldRestaurant));
    updatedRestaurant.logs = updatedRestaurant.logs || [];
    if (!data.log.time) {
      data.log.time = new Date();
    }
    if (!data.log.username) {
      data.log.username = this._global.user.username;
    }

    updatedRestaurant.logs.push(new Log(data.log));

    this.patchLog(oldRestaurant, updatedRestaurant, data.formEvent.acknowledge);
  }

  patchLog(oldRestaurant, updatedRestaurant, acknowledge) {
    this._prunedPatch.patch(environment.qmenuApiUrl + 'generic?resource=restaurant',
      [{ old: { _id: oldRestaurant._id, logs: oldRestaurant.logs }, new: { _id: updatedRestaurant._id, logs: updatedRestaurant.logs } }])
      .subscribe(
        result => {
          // let's update original, assuming everything successful
          this.restaurant.logs = updatedRestaurant.logs;
          this._global.publishAlert(
            AlertType.Success,
            'Success Add a new log.'
          );

          acknowledge(null);
          this.logEditingModal.hide();
        },
        error => {
          this._global.publishAlert(AlertType.Danger, 'Error');
          acknowledge('API Error');
        }
      );
  }

  filterCorrectConfig() {
    return this.qrRestaurantListRows
      .filter(qrList => qrList.qrSettings && qrList.qrSettings.codes && qrList.qrSettings.codes.length > 0 && qrList.feeSchedules && qrList.feeSchedules.filter(f => f.payee === 'QMENU' && f.name === 'service fee' && !(!(f.rate > 0) && !(f.amount > 0)) && f.orderTypes && f.orderTypes.filter(type => type === 'DINE-IN').length > 0).length > 0
        && qrList.menus && qrList.menus.filter(m => m.targetCustomer && (m.targetCustomer === 'DINE_IN_ONLY' || m.targetCustomer === 'ALL')).length > 0);
  }

  async populateQrRestaurant() {
    this.qrRestaurantListRows = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: { qrSettings: { $exists: true } },
      projection: {
        _id: 1,
        name: 1,
        "googleAddress.formatted_address": 1,
        "googleAddress.timezone": 1,
        qrOrderNumber: 1,
        feeSchedules: 1,
        rateSchedules: 1,
        "menus.targetCustomer": 1,
        "menus.name": 1,
        "qrSettings": 1,
        "logs": 1
      },
      sort: { updatedAt: -1 }
    }, 5000);
    this._global.getCachedUserList().then(users => this.knownUsers = users).catch(console.error);
    const orders = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: "dine-in-session",
      query: {
        "orderObj.restaurantObj._id": {
          $exists: true
        }
      },
      projection: {
        "orderObj.restaurantObj._id": 1
      },
      sort: {
        createdAt: -1
      },
      limit: 20000
    }, 5000);
    for (let i = 0; i < this.qrRestaurantListRows.length; i++) {
      let restaurant = this.qrRestaurantListRows[i];
      let tempOrders = orders.filter(o => o.orderObj.restaurantObj._id === restaurant._id);
      this.qrRestaurantListRows[i].qrOrderNumber = tempOrders.length;
      if (restaurant.menus) {
        this.qrRestaurantListRows[i].menus = restaurant.menus.map(m => {
          if (m.targetCustomer) {
            m.menuTarget = this.targets.filter(t => t.value === m.targetCustomer)[0].text;
          }
          return m;
        });
      }
      let agent = restaurant.qrSettings.agent || 'None';
      this.qrRestaurantListRows[i].qrSettings.agent = agent; // it also needs to give row's agent a default value to avoid undefined condition.
      if (restaurant.qrSettings.hasSignHolders && restaurant.qrSettings.hasSignHolders.hasSignHolders) {
        this.qrRestaurantListRows[i].qrSettings.hasSignHolders = {
          hasSignHolders: true,
          updateAt: new Date()
        };
      } else {
        this.qrRestaurantListRows[i].qrSettings.hasSignHolders = {
          hasSignHolders: false,
          updateAt: new Date()
        };
      }
      if (restaurant.qrSettings.hasQRTraining && restaurant.qrSettings.hasQRTraining.hasQRTraining) {
        this.qrRestaurantListRows[i].qrSettings.hasQRTraining = {
          hasQRTraining: true,
          updateAt: new Date()
        };
      } else {
        this.qrRestaurantListRows[i].qrSettings.hasQRTraining = {
          hasQRTraining: false,
          updateAt: new Date()
        };
      }
      if (restaurant.qrSettings.qrCodesMailed && restaurant.qrSettings.qrCodesMailed.qrCodesMailed) {
        this.qrRestaurantListRows[i].qrSettings.qrCodesMailed = {
          qrCodesMailed: true,
          updateAt: new Date()
        };
      } else {
        this.qrRestaurantListRows[i].qrSettings.qrCodesMailed = {
          qrCodesMailed: false,
          updateAt: new Date()
        };
      }
      if (restaurant.qrSettings.qrCodesObtained && restaurant.qrSettings.qrCodesObtained.qrCodesObtained) {
        restaurant.qrSettings.qrCodesObtained = {
          qrCodesObtained: true,
          updateAt: new Date()
        };
      } else {
        restaurant.qrSettings.qrCodesObtained = {
          qrCodesObtained: false,
          updateAt: new Date()
        };
      }
      if (this.qrSalespeople.indexOf(agent) === -1) {
        this.qrSalespeople.push(agent);
      }
    }
    // find why some qr restaurants is wrong.
    let correctRTs = this.filterCorrectConfig();
    let wrongRTs = this.qrRestaurantListRows.filter(qrList => !correctRTs.includes(qrList));
    wrongRTs = wrongRTs.map(wrong => {
      wrong.Reasons = [];
      let flagReason1 = wrong.feeSchedules && wrong.feeSchedules.filter(f => f.payee === 'QMENU' && f.name === 'service fee' && !(!(f.rate > 0) && !(f.amount > 0)) && f.orderTypes && f.orderTypes.filter(type => type === 'DINE-IN').length > 0).length > 0;
      let flagReason2 = wrong.menus && wrong.menus.filter(m => m.targetCustomer && (m.targetCustomer === 'DINE_IN_ONLY' || m.targetCustomer === 'ALL')).length > 0;
      let flagReason3 = wrong.qrSettings && wrong.qrSettings.codes && wrong.qrSettings.codes.length > 0;
      if (!flagReason1) {
        wrong.Reasons.push('(1)The feeSchedules configuration is wrong.');
      }
      if (!flagReason2) {
        wrong.Reasons.push('(2)The menus configuration is wrong.');
      }
      if (!flagReason3) {
        wrong.Reasons.push('(3)The number of QR codes should not be zero.');
      }
      return wrong;
    });
    this.qrRestaurantListRows = wrongRTs;
    this.qrRestaurantListRows.push(...correctRTs = correctRTs.map(correct => {
      correct.Reasons = ['This restautant has completed QR code setup.'];
      return correct;
    }));
    this.qrFilterRestaurantListRows = this.qrRestaurantListRows;

  }

}
