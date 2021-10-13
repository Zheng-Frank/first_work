import { Component, OnInit, ViewChild } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { Transaction } from 'src/app/classes/transaction';
import { AlertType } from 'src/app/classes/alert-type';
import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';

@Component({
  selector: 'app-transaction-dashboard',
  templateUrl: './transaction-dashboard.component.html',
  styleUrls: ['./transaction-dashboard.component.css']
})
export class TransactionDashboardComponent implements OnInit {

  @ViewChild('editModal') editModal: ModalComponent;

  payers = ['qmenu', 'gary', 'chris'];
  payees = ['sam', 'lucy', 'mike', 'kevin', 'charity', 'gary', 'chris', 'james', 'qmenu'];
  paymentMeans = ['payoneer', 'paypal', 'wechat', 'check', 'cash'];


  transactions = [];
  transactionInEditing: any = {};
  selectedPayer;
  selectedPayee;

  myColumnDescriptors = [
    {

    },
    {
      label: 'Date'
    },
    {
      label: 'Payer (from)'
    },
    {
      label: 'Payee (to)'
    },
    {
      label: 'USD Amount'
    },
    {
      label: 'Original'
    },
    {
      label: 'Currency'
    },
    {
      label: 'Exchange Rate'
    },
    {
      label: 'Means'
    },
    {
      label: 'Description'
    },
    {
      label: 'Input User'
    },
    {
      label: 'Input Date'
    }
  ];

  payerFieldDescriptor = {
    field: "payer", //
    label: "Payer (from)",
    required: true,
    inputType: "select",
    items: this.payers.sort().map(payer => ({
      object: payer,
      text: payer,
      selected: false
    }))
  };

  payeeFieldDescriptor = {
    field: "payee", //
    label: "Payee (to)",
    required: true,
    inputType: "select",
    items: this.payees.sort().map(payee => ({
      object: payee,
      text: payee,
      selected: false
    }))
  };

  fieldDescriptors = [
    {
      field: "time", //
      label: "Date",
      required: true,
      inputType: "date"
    },
    this.payerFieldDescriptor,
    this.payeeFieldDescriptor,
    {
      field: "amount", //
      label: "Amount",
      required: true,
      inputType: "number"
    },
    {
      field: "currency", //
      label: "Currency",
      inputType: "single-select",
      items: ['USD', 'CNY', 'PHP'].map(s => ({ object: s, text: s, selected: false }))
    },
    {
      field: "exchangeRate", //
      label: "Exchange Rate (1 for USD, something like 6.89 for RMB)",
      required: true,
      inputType: "number"
    },
    {
      field: "means", //
      label: "Means",
      required: true,
      inputType: "single-select",
      items: this.paymentMeans.sort().map(means => ({
        object: means,
        text: means,
        selected: false
      }))

    },
    {
      field: "description", //
      label: "Description",
      required: true,
      inputType: "textarea"
    }
  ];
  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
    this.populate();
  }

  add() {
    this.transactionInEditing = {};
    this.editModal.show();
  }

  async populate() {
    const transactions = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'transaction',
      limit: 6000000000
    }).toPromise();
    this.transactions = transactions.map(t => new Transaction(t));
    this.transactions.sort((t1, t2) => t1.time.valueOf() - t2.time.valueOf());
    this.payers = [... new Set(this.transactions.map(t => t.payer))].sort();
    this.payees = [... new Set(this.transactions.map(t => t.payee))].sort();
    // re-bind the form payer and payees
    this.payeeFieldDescriptor.items = this.payers.sort().map(payer => ({
      object: payer,
      text: payer,
      selected: false
    }));
    this.payeeFieldDescriptor.items = this.payees.sort().map(payer => ({
      object: payer,
      text: payer,
      selected: false
    }));
  }

  async formSubmit(event) {
    // MUST:
    if (!this.transactionInEditing.amount || !(+this.transactionInEditing.amount > 0)) {
      return event.acknowledge('Amount must be a positive number!');
    }
    if (!this.transactionInEditing.exchangeRate || !(+this.transactionInEditing.exchangeRate > 0)) {
      return event.acknowledge('Amount must be a positive number!');
    }

    // create a new transaction and add it to the list!

    const transaction = new Transaction(this.transactionInEditing);
    transaction.inputUsername = this._global.user.username;
    transaction.inputTime = new Date();

    // unfortunately, date is offset by browser so we need to offset much by browser time
    transaction.time.setMinutes(transaction.time.getMinutes() + transaction.time.getTimezoneOffset());


    await this._api.post(environment.qmenuApiUrl + 'generic?resource=transaction', [transaction]).toPromise();

    this.transactions.push(transaction);

    this._global.publishAlert(AlertType.Success, 'Added transaction');
    this.editModal.hide();
    return event.acknowledge(null);

  }

  changeFilter() {

  }

  getFilteredTransactions() {
    let transactions = this.transactions;
    if (this.selectedPayer) {
      transactions = transactions.filter(t => t.payer === this.selectedPayer);
    }
    if (this.selectedPayee) {
      transactions = transactions.filter(t => t.payee === this.selectedPayee);
    }
    return transactions;
  }

  getTotal() {
    return this.getFilteredTransactions().reduce((sum, transaction) => sum + (transaction.amount / transaction.exchangeRate), 0);
  }
}

