import { Component, Input, OnInit } from '@angular/core';
import { AlertType } from 'src/app/classes/alert-type';
import { Channel } from 'src/app/classes/channel';
import { ApiService } from 'src/app/services/api.service';
import { GlobalService } from 'src/app/services/global.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-restaurant-phone-ordering-settings',
  templateUrl: './restaurant-phone-ordering-settings.component.html',
  styleUrls: ['./restaurant-phone-ordering-settings.component.css']
})
export class RestaurantPhoneOrderingSettingsComponent implements OnInit {
  
  @Input() readonly = false;
  @Input() restaurant: any;

  channels: Channel[] = [];
  addingChannels = false;
  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
  }
  async removeNotificationChannel(n) {
    const newChannels = this.restaurant.phoneOrderingSettings.notificationChannels.filter(c => c !== n);
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [
      {
        old: { _id: this.restaurant._id, phoneOrderingSettings: {} },
        new: { _id: this.restaurant._id, phoneOrderingSettings: { notificationChannels: newChannels } }
      }
    ]).toPromise();
    this.restaurant.phoneOrderingSettings.notificationChannels = newChannels;
  }

  private async fillChannels() {
    // get channels from channels and also standardize type by uppercasing (used by downstream coding)
    const channels = (this.restaurant.channels || []).map(c => ({ type: c.type.toUpperCase(), value: c.value }));

    // fill channels from printClients
    const printClients = await this.retrievePrintClients();
    // we MAY contain multiple SAME typed clients. If so, we need to indicate their guid or _id
    // { type: 'FEI-E', value: '960803616:xdrs7unc:EU' } // sn:key:host
    // { type: 'PHOENIX', value: '624f8e7207146c0009e64b1d:Microsoft Print to PDF' } // printClientId, printerName

    printClients.map(pc => {
      const type = pc.type;
      (pc.printers || []).map(printer => {
        switch (type) {
          case 'phoenix':
            channels.push({ type: 'PHOENIX', value: `${pc._id}:${printer.name}` });
            break;
          case 'fei-e':
            channels.push({ type: 'FEI-E', value: `${printer.name}:${printer.key}:${pc.host}` });
            break;
          default: // ignore everything else
            break;
        }
      })
    });
    this.channels = channels;
  }

  async retrievePrintClients() {
    return await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'print-client',
      query: {
        "restaurant._id": this.restaurant._id.toString()
      },
      projection: {
        _id: 1,
        guid: 1,
        info: 1,
        printers: 1,
        restaurant: 1,
        type: 1,
        host: 1,
      },
      limit: 100
    }).toPromise();
  }
  async toggleNotificationChannels() {
    this.addingChannels = !this.addingChannels;
    if (this.channels.length === 0 && this.addingChannels) {
      await this.fillChannels();
    }
  }

  async addChannel(c: Channel) {
    this.restaurant.phoneOrderingSettings = this.restaurant.phoneOrderingSettings || {};
    this.restaurant.phoneOrderingSettings.notificationChannels = this.restaurant.phoneOrderingSettings.notificationChannels || [];
    const existingChannels = this.restaurant.phoneOrderingSettings.notificationChannels;
    if (existingChannels.some(ch => ch.type === c.type && ch.value === c.value)) {
      this._global.publishAlert(AlertType.Danger, 'Channel is already in the list');
    } else {
      const newChannels = JSON.parse(JSON.stringify(existingChannels));
      newChannels.push(c);
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [
        {
          old: { _id: this.restaurant._id, phoneOrderingSettings: {} },
          new: { _id: this.restaurant._id, phoneOrderingSettings: { notificationChannels: newChannels } }
        }
      ]).toPromise();
      this.restaurant.phoneOrderingSettings.notificationChannels = newChannels;
      this._global.publishAlert(AlertType.Success, 'Channel is added');
    }
  }

}
