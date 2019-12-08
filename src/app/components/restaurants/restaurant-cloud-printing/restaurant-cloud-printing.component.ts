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

  editing = false;
  customizedRenderingStyles;

  constructor(private _api: ApiService) { }

  toggleEditing() {
    this.editing = !this.editing;
    this.customizedRenderingStyles = this.restaurant.customizedRenderingStyles;
  }

  async update() {

    const customizedRenderingStyles = (this.customizedRenderingStyles || '').trim();
    if (this.restaurant.customizedRenderingStyles !== customizedRenderingStyles) {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: { _id: this.restaurant._id, customizedRenderingStyles: this.restaurant.customizedRenderingStyles },
        new: { _id: this.restaurant._id, customizedRenderingStyles: customizedRenderingStyles }
      }]).toPromise();
      this.restaurant.customizedRenderingStyles = customizedRenderingStyles;
    }
    this.editing = false;
  }

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
        version: printClient.info && printClient.info.version,
        format: printer.format,
        guid: printClient.guid,
        autoPrintCopies: printer.autoPrintCopies,
        name: printer.name,
        key: printer.key,
        status: ((printClient.statusHistory || [])[0] || {}).status
      })));
    return printers
  }

}
