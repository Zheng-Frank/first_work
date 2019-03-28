import { Component, OnInit, Input } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { ApiService } from 'src/app/services/api.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-restaurant-cloud-printing',
  templateUrl: './restaurant-cloud-printing.component.html',
  styleUrls: ['./restaurant-cloud-printing.component.css']
})
export class RestaurantCloudPrintingComponent implements OnInit {
  @Input() restaurant: Restaurant;

  constructor(private _api: ApiService) { }
  async ngOnInit() {
    console.log(this.restaurant['printClients'])
    if (!this.restaurant['printClients']) {
      this.restaurant['printClients'] = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'print-client',
        query: {
          "restaurant._id": this.restaurant._id
        },
        limit: 100
      }).toPromise();
    }
  }

  getPrinters() {
    const printers = [];
    ((this.restaurant || {})['printClients'] || []).map(printClient => (printClient.printers || [])
      .filter(printer => printer.autoPrintCopies > 0).map(printer => printers.push({
        type: printClient.type,
        guid: printClient.guid,
        autoPrintCopies: printer.autoPrintCopies,
        name: printer.name,
        key: printer.key,
        status: ((printClient.statusHistory || [])[0] || {}).status
      })));
    return printers
  }

}
