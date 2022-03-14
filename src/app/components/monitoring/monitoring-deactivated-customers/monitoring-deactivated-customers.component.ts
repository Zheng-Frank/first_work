import { AlertType } from 'src/app/classes/alert-type';
import { GlobalService } from 'src/app/services/global.service';
import { environment } from './../../../../environments/environment';
import { ApiService } from 'src/app/services/api.service';
import { Component, OnInit, ViewChild } from '@angular/core';
import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';

@Component({
  selector: 'app-monitoring-deactivated-customers',
  templateUrl: './monitoring-deactivated-customers.component.html',
  styleUrls: ['./monitoring-deactivated-customers.component.css']
})
export class MonitoringDeactivatedCustomersComponent implements OnInit {
  @ViewChild("deactivateModal") deactivateModal: ModalComponent;
  @ViewChild("reactivateModal") reactivateModal: ModalComponent;
  deactivatedCustomerRows = [];
  customers = [];
  searchTypes = ['ID', 'First Name', 'Phone', 'Email'];
  type = 'All'; //  concrete search type
  searchText;
  myColumnDescriptors = [
    {
      label: 'Number'
    },
    {
      label: 'Customer',
      sort: (a, b) => a.firstName > b.firstName ? 1 : -1
    },
    {
      label: 'Deactivated At',
      paths: ['deactivatedAt'],
      sort: (a, b) => new Date(a || 0).valueOf() - new Date(b || 0).valueOf()
    },
    {
      label: 'Reactivate/Deactivate'
    }
  ];
  deactivatedID = '';
  deactivatedCustomer;
  reactivatedCustomer;
  constructor(private _api: ApiService, private _global: GlobalService) { }

  async ngOnInit() {
    this.populateDeactivatedCustomer();
  }

  async populateDeactivatedCustomer() {
    this.customers = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'customer',
      query: {
        deactivatedAt: {
          $exists: true
        }
      },
      projection: {
        phone: 1,
        email: 1,
        firstName: 1,
        lastName: 1,
        socialProvider: 1,
        deactivatedAt: 1,
        createdAt: 1
      },
      limit: 100000
    }, 20000);
    this.filterRows();
  }

  filterRows() {
    this.deactivatedCustomerRows = this.customers;
    if(this.type !== 'All'){
      if(!this.searchText){
        return this._global.publishAlert(AlertType.Danger, `Please input search text!`);
      }
      if (this.type == 'ID') {
        this.deactivatedCustomerRows = this.deactivatedCustomerRows.filter(c => c._id && c._id.indexOf(this.searchText) != -1);
      } else if (this.type == 'First Name') {
        this.deactivatedCustomerRows = this.deactivatedCustomerRows.filter(c => c.firstName && c.firstName.indexOf(this.searchText) != -1);
      } else if (this.type == 'Phone') {
        this.deactivatedCustomerRows = this.deactivatedCustomerRows.filter(c => c.phone && c.phone.indexOf(this.searchText) != -1);
      } else if (this.type == 'Email') {
        this.deactivatedCustomerRows = this.deactivatedCustomerRows.filter(c => c.email && c.email.indexOf(this.searchText) != -1);
      } 
    }
  }

  async openDeactivateModal() {
    if (!this.deactivatedID) {
      return this._global.publishAlert(AlertType.Danger, `Please input customer's id to deactivate him`);
    }
    try {
      const [customer] = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'customer',
        query: {
          _id: {
            $oid: this.deactivatedID
          }
        },
        projection: {
          phone: 1,
          email: 1,
          firstName: 1,
          lastName: 1,
          socialProvider: 1,
          deactivated: 1,
          createdAt: 1
        },
        limit: 1
      }).toPromise();
      if(!customer){
        return this._global.publishAlert(AlertType.Danger, `Customer not found !`);
      }
      if (customer.deactivated) {
        return this._global.publishAlert(AlertType.Danger, `He is already a deactivated customer !`);
      }
      this.deactivatedCustomer = customer;
      this.deactivateModal.show();
    } catch (error) {
      return this._global.publishAlert(AlertType.Danger, `Customer not found !`);
    }
    
  }

  closeDeactivateModal() {
    this.deactivatedID = '';
    this.deactivatedCustomer = undefined;
    this.deactivateModal.hide();
  }

  openReactivateModal(row) {
    this.reactivatedCustomer = row;
    this.reactivateModal.show();
  }

  closeReactivateModal() {
    this.reactivatedCustomer = undefined;
    this.reactivateModal.hide();
  }

  // click deactivated button and deactives customer
  async Deactivate() {
    let newObj = {
      _id: this.deactivatedCustomer._id, deactivatedAt: new Date()
    }
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=customer', [
      {
        old: { _id: this.deactivatedCustomer._id },
        new: newObj
      }
    ]).toPromise();
    // update origin data
    this.deactivatedCustomer.deactivated = newObj.deactivatedAt;
    this.customers.unshift({
      ...this.deactivatedCustomer
    });
    this.filterRows();
    this._global.publishAlert(AlertType.Success, `Customer account deactivated successfully !`);
    this.closeDeactivateModal();
  }

  // click reactivated button and reactives customer
  async Reactivate() {
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=customer', [
      {
        old: { _id: this.reactivatedCustomer._id, deactivatedAt: this.reactivatedCustomer.deactivatedAt },
        new: {
          _id: this.reactivatedCustomer._id
        }
      }
    ]).toPromise();
    // update origin data
    this.customers = this.customers.filter(c => c._id !== this.reactivatedCustomer._id);
    this.filterRows();
    this._global.publishAlert(AlertType.Success, `Customer account reactivated successfully !`);
    this.closeReactivateModal();
  }

}
