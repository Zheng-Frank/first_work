import { Component, OnInit, Input } from '@angular/core';
import { Restaurant, Printer } from '@qmenu/ui';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";

@Component({
  selector: 'app-restaurant-cloud-printing',
  templateUrl: './restaurant-cloud-printing.component.html',
  styleUrls: ['./restaurant-cloud-printing.component.css']
})
export class RestaurantCloudPrintingComponent implements OnInit {
  @Input() restaurant: Restaurant;
  switchPrint: boolean;
  editing = false;

  queryPrintersError = null;

  defaultPrinter: Printer = null;
  printers = [];

  constructor(private _api: ApiService, private _global: GlobalService) { }
  ngOnInit() {
  }

  toggleEditing() {
    this.editing = !this.editing;
    this.printers = [];

    (this.restaurant.printers || []).map(printer => {
      this.printers.push(printer);
      if (printer.autoPrintCopies >= 0) {
        this.defaultPrinter = printer;
      }
    });
  }

  getDefaultPrinterName() {
    let name = 'N/A';
    (this.restaurant.printers || []).map(printer => {
      if (printer.autoPrintCopies >= 0) {
        name = printer.name;
      }
    });
    return name;
  }
  switchAutoPrint() {
    this.restaurant.autoPrintOnNewOrder = !this.restaurant.autoPrintOnNewOrder;
  }

  update() {
    // make sure the printCopies is a number 
    this.restaurant.printCopies = parseInt(this.restaurant.printCopies + '');
    if (isNaN(this.restaurant.printCopies)) {
      this.restaurant.printCopies = 1;
    }

    // currently we support only one printer but the structure allows scale in future!
    this.restaurant.printers = [];
    if (this.defaultPrinter && this.defaultPrinter.settings) {
      this.defaultPrinter.autoPrintCopies = this.restaurant.printCopies;
      this.restaurant.printers.push(this.defaultPrinter);
    }

    // this._controller.updateRestaurant(this.restaurant);
    this.editing = false;
  }

  queryPrinters() {
    this.queryPrintersError = null;
    this._api.post(environment.legacyApiUrl + 'restaurant/queryPrinters', {})
      .subscribe(printers => {
        this.printers = [{ name: '(leave empty)' }];
        printers.map(p => {
          if (this.defaultPrinter && this.defaultPrinter.name === p.name) {
            this.printers.push(this.defaultPrinter);
          } else {
            this.printers.push(p);
          }
        });
      },
        error => {
          console.log(error);
          this.queryPrintersError = 'Error querying printers. Please make sure restaurant\'s computer is on and have software installed.';
        });
  }

  printLastOrder() {
    if (this.restaurant.orders.length === 0) {
      alert('No order was found.');
    } else {
      // this._controller.printOrderDetails(this.restaurant.orders[0]).subscribe(result => {
      //   if (result.errorMessage) {
      //     alert('Print Error: ' + result.errorMessage);
      //   } else {
      //     alert('Print command was sent successfully. If nothing printed out, please check your printer settings or queued tasks.');
      //   }
      // },
      //   error => {
      //     console.log(error);
      //     alert('Error printing last order. Please call 404-382-9768 for support.');
      //   });
    }
  }

}
