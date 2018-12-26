import { Component, OnInit } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { Transaction } from 'src/app/classes/transaction';
import { AlertType } from 'src/app/classes/alert-type';

@Component({
  selector: 'app-transaction-dashboard',
  templateUrl: './transaction-dashboard.component.html',
  styleUrls: ['./transaction-dashboard.component.css']
})
export class TransactionDashboardComponent implements OnInit {

  payers = ['qmenu', 'gary'];
  payees = ['sam', 'lucy', 'mike', 'kevin', 'charity'];
  paymentMeans = ['paypal', 'wechat', 'check', 'cash'];


  transactions = [];
  transactionInEditing: any = {};
  editing = false;
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
  ]

  fieldDescriptors = [
    {
      field: "time", //
      label: "Date",
      required: true,
      inputType: "date"
    },
    {
      field: "payer", //
      label: "Payer (from)",
      required: true,
      inputType: "single-select",
      items: this.payers.sort().map(payer => ({
        object: payer,
        text: payer,
        selected: false
      }))
    },
    {
      field: "payee", //
      label: "Payee (to)",
      required: true,
      inputType: "single-select",
      items: this.payees.sort().map(payee => ({
        object: payee,
        text: payee,
        selected: false
      }))
    },
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
      items: ['USD', 'CNY'].map(s => ({ object: s, text: s, selected: false }))
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

  async populate() {
    const transactions = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'transaction',
      limit: 60000
    }).toPromise();
    this.transactions = transactions.map(t => new Transaction(t));
    this.transactions.sort((t1, t2) => t1.time.valueOf() - t2.time.valueOf());
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
    return event.acknowledge(null);

  }

  changeFilter() {

  }

  toggleEditing() {
    this.editing = !this.editing;
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

