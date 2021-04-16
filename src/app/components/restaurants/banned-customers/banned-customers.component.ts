import { environment } from './../../../../environments/environment';
import { ApiService } from 'src/app/services/api.service';
import { Component, OnInit, ViewChild } from '@angular/core';
import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';

@Component({
  selector: 'app-banned-customers',
  templateUrl: './banned-customers.component.html',
  styleUrls: ['./banned-customers.component.css']
})
export class BannedCustomersComponent implements OnInit {

  @ViewChild("viewCustomerModal") viewCustomerModal: ModalComponent;
  bannedCustomerRows = [];
  displayingCustomer: any;
  isEdit = false;
  editingCustomer: any;
  genders = ['male', 'female', 'other'];//select's option value
  gender;
  /**
   *Customer Name
    ID
    Number of orders
    Ban/unban

   *
   * @memberof BannedCustomersComponent
   */
  searchTypes = ['ID', 'Name', 'Phone', 'Email'];
  type='All'; //  concrete search type
  searchText;
  modal_title: string = "View Cusmtomer";
  pagination = true;
  myColumnDescriptors = [
    {
      label: 'Customer Name',
      sort: (a, b) => a.customer.firstName > b.customer.firstName ? 1 : -1
    },
    {
      label: "ID",
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },
    {
      label: 'Number of orders',
      sort: (a, b) => a.count - b.count
    },
    {
      label: 'Ban/unban',
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    }
  ];

  constructor(private _api: ApiService) {

  }

  ngOnInit() {
    // console.log(this.bannedCustomerRows);
    this.populateBannedCustomer('All', '');
  }
  /**
   * this function is used to search banned customer
   * 
   * @memberof BannedCustomersComponent
   */
  searchCustomer() {
    if (this.type == 'ID') {
      this.populateBannedCustomer(this.type, this.searchText);
    } else if (this.type == 'Name') {
      this.populateBannedCustomer(this.type, this.searchText);
    } else if (this.type == 'Phone') {
      this.populateBannedCustomer(this.type, this.searchText);
    } else if (this.type == 'Email') {
      this.populateBannedCustomer(this.type, this.searchText);
    } else if (this.type == 'All') {
      this.populateBannedCustomer(this.type, this.searchText);
    }
  }

  /**
   *this function is used to  populate bannded customer ,
   *
   * @param {*} type
   * @param {*} searchText
   * @memberof BannedCustomersComponent
   */
  async populateBannedCustomer(type, searchText) {
    const blackQuery = {
      reasons: {
        $exists: true
      },
      disabled: {
        $ne: true
      } //This is means that blackList is reused;
      ,
      type: 'CUSTOMER'
    }
    const blacklist = await this._api.get(`${environment.qmenuApiUrl}generic`, {
      resource: 'blacklist',
      query: blackQuery,
      projection: {
        // orders: 1,
        value: 1,
        reasons: 1,
        disabled: 1
      },
      limit: 10000
    }).toPromise();
    const cusomterIds = blacklist.map(bl => bl.value);
    const cusomteroIds = cusomterIds.map(i => ({ $oid: i }));
    const customers = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'customer',
      query: {
        _id: { $in: cusomteroIds }
      },
      sort: {
        _id: 1
      }
    }, 100);
    //console.log("120行"+cusomterIds);
    const orders = await this._api.get(`${environment.qmenuApiUrl}generic`, {
      resource: 'order',
      query: {
        'customerObj._id': {
          $in: cusomterIds
        }
      },
      projection: {
        customerObj: 1
      },
      sort: {
        _id: 1
      },
      limit: 10000
    }).toPromise();

    if (type == 'ID') {
      this.bannedCustomerRows = customers.filter(c => c._id && c._id.indexOf(searchText) != -1).map(customer => {
        const count = orders.filter(o => o.customerObj._id === customer._id).length || 0;
        const [blacklistItem] = blacklist.filter(b => b.value == customer._id);

        return { customer, count, blacklistItem };
      });

    } else if (type == 'Name') {
      this.bannedCustomerRows = customers.filter(c => c.firstName && c.firstName.indexOf(searchText) != -1).map(customer => {
        const count = orders.filter(o => o.customerObj._id === customer._id).length || 0;
        const [blacklistItem] = blacklist.filter(b => b.value == customer._id);

        return { customer, count, blacklistItem };
      });
    } else if (type == 'Phone') {
      this.bannedCustomerRows = customers.filter(c => c.phone && c.phone.indexOf(searchText) != -1).map(customer => {
        const count = orders.filter(o => o.customerObj._id === customer._id).length || 0;
        const [blacklistItem] = blacklist.filter(b => b.value == customer._id);

        return { customer, count, blacklistItem };
      });
    } else if (type == 'Email') {
      this.bannedCustomerRows = customers.filter(c => c.email && c.email.indexOf(searchText) != -1).map(customer => {
        const count = orders.filter(o => o.customerObj._id === customer._id).length || 0;
        const [blacklistItem] = blacklist.filter(b => b.value == customer._id);

        return { customer, count, blacklistItem };
      });
    } else if (type == 'All') {
      this.bannedCustomerRows = customers.map(customer => {
        const count = orders.filter(o => o.customerObj._id === customer._id).length || 0;
        const [blacklistItem] = blacklist.filter(b => b.value == customer._id);

        return { customer, count, blacklistItem };
      });
    }
  }
  viewCustomer(customer) {
    this.displayingCustomer = customer;
    this.viewCustomerModal.show(); //open view customer modal
  }
  async unBan(row) {
    await this._api.patch(`${environment.appApiUrl}app`, {
      resource: 'blacklist',
      query: {
        _id: {
          $oid: row.blacklistItem._id
        }
      },
      op: "$set",//更新 update
      field: "disabled",
      value: true
    }).toPromise();
    this.populateBannedCustomer('All', '');
  }

  edit() {
    this.isEdit = true
    //用 json.parse()方法将 displayingCustomer和 editingCustomer 脱除
    this.editingCustomer = JSON.parse(JSON.stringify(this.displayingCustomer));

  }

  async submit() {
    if (!this.isFormValid()) {
      return alert("please insure the form is valid !");
    }
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=customer', [
      {
        old: { _id: this.displayingCustomer._id },
        new: {
          _id: this.displayingCustomer._id, firstName: this.editingCustomer.firstName,
          lastName: this.editingCustomer.lastName, phone: this.editingCustomer.phone,
          email: this.editingCustomer.email
        }
      }
    ]).toPromise();

    this.displayingCustomer = this.editingCustomer;
    this.bannedCustomerRows.forEach(row => {
      if (row.customer._id == this.editingCustomer._id) {
        row.customer = this.displayingCustomer;
      }
    });
    this.isEdit = false;
  }
  isPhoneValid(phone) {
    let reg = /^(1?|(1\-)?)\d{10,12}$/;
    return reg.test(phone) ? true : false;
  }
  isEmailValid(email) {
    let reg = /^[a-zA-Z0-9]+([-_.][a-zA-Z0-9]+)*@[a-zA-Z0-9]+([-_.][a-zA-Z0-9]+)*\.[a-z]{2,}$/;
    return reg.test(email) ? true : false;
  }
  isFormValid() {
    return this.isPhoneValid(this.editingCustomer.phone) && this.editingCustomer.firstName
      && this.editingCustomer.lastName && this.isEmailValid(this.editingCustomer.email);
  }
}

