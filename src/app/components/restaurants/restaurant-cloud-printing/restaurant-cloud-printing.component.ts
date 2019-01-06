import { Component, OnInit, Input } from '@angular/core';
import { Restaurant, Printer } from '@qmenu/ui';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";
import { ModalComponent } from "@qmenu/ui/bundles/qmenu-ui.umd";
import { Helper } from '../../../classes/helper';

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
  oldRestaurant: any;
  newRestaurant: any;


  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
  }

  toggleEditing() {
    this.editing = !this.editing;
    this.printers = [];

    this.oldRestaurant = JSON.parse(JSON.stringify(this.restaurant));
    this.newRestaurant = JSON.parse(JSON.stringify(this.restaurant));

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

    this.newRestaurant = this.restaurant;

    if (Helper.areObjectsEqual(this.newRestaurant, this.oldRestaurant)) {
      this._global.publishAlert(
        AlertType.Info,
        "Not changed"
      );
    } else {
      this._api.patch(environment.qmenuApiUrl + "generic?resource=restaurant", [
        {
          old: this.oldRestaurant,
          new: this.newRestaurant
        }])
        .subscribe(
        result => {
          // let's update original, assuming everything successful
          this._global.publishAlert(
            AlertType.Success,
            "Updated successfully"
          );

        },
        error => {
          this._global.publishAlert(AlertType.Danger, "Error updating to DB");
        }
        );
    }


    this.editing = false;
  }

  queryPrinters() {
    this.queryPrintersError = null;
    this._api.post(environment.legacyApiUrl + "restaurant/queryPrinters/" + this.restaurant['_id'])
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
      this._api.post(environment.legacyApiUrl + "order/printOrderDetailsByOrderId", { orderId: this.restaurant.orders[0].id })
        .subscribe(result => {
          if (result.errorMessage) {
            alert('Print Error: ' + result.errorMessage);
          } else {
            alert('Print command was sent successfully. If nothing printed out, please check your printer settings or queued tasks.');
          }
        },
        error => {
          console.log(error);
          alert('Error printing last order. Please call 404-382-9768 for support.');
        });
    }
  }




}
