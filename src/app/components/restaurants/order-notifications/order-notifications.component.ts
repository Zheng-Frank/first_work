import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { ApiService } from 'src/app/services/api.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-order-notifications',
  templateUrl: './order-notifications.component.html',
  styleUrls: ['./order-notifications.component.css']
})
export class OrderNotificationsComponent implements OnInit, OnChanges {
  @Input() restaurant: Restaurant;

  orderNotifications = [
    {
      channel: {
        type: 'SMS',
        value: '4075807504'
      },
    },
    {
      channel: {
        type: 'Fax',
        value: '4075807504'
      },
      orderTypes: [],
    },
    {
      channel: {
        type: 'Voice',
        value: '4075807504'
      },
      orderTypes: ['DELIVERY', 'PICKUP'],
      timing: {
        delaySeconds: 120 // 2 minutes after received order
      }
    },
    {
      channel: {
        type: 'Email',
        value: 'garysui@gmail.com'
      },
      orderTypes: ['DINE-IN']
    },
    {
      channel: {
        type: 'Printer',
        value: 'Id -> Fei-E',

      },
      timing: {
        inOpenHours: true
      }
    },
    {
      channel: {
        type: 'Printer',
        value: 'Phoenix -> Receipt2'
      },
      templateName: 'Chef',
      menus: [{
        name: 'Sushi'
      }],
      copies: 2
    },
  ];

  faClassMap = {
    SMS: 'fa-comments',
    Fax: 'fa-fax',
    Voice: 'fa-phone-volume',
    Email: 'fa-envelope',
    Printer: 'fa-print'
  }

  notificationInEditing = {};

  channelOptions = [];
  selectedChannel;
  orderTypesOptions = [
    { object: "PICKUP", text: "PICKUP", selected: false },
    { object: "DELIVERY", text: "DELIVERY", selected: false },
    { object: "DINE-INE", text: "DINE-IN", selected: false },
  ];
  notificationFieldDescriptors = [{
    field: "phone", //
    label: "Phone Number",
    required: true,
    inputType: "single-select",
    items: []
  },
  {
    field: "lineStatus", //
    label: "Line Status",
    required: true,
    inputType: "single-select",
    items: [
      { object: "busy", text: "Busy", selected: false },
      { object: "connected", text: "Connected", selected: false },
      { object: "voicemail", text: "Voicemail", selected: false },
      { object: "badNumber", text: "Bad Number", selected: false }
    ]
  }
  ];
  constructor(private _api: ApiService) { }

  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges) {
  }

  async editNotification(n?) {
    // get channels from channels
    (this.restaurant.channels || []).map(c => {
      this.channelOptions.push({
        object: { type: c.type, value: c.value },
        text: `${c.type}: ${c.value}`
      });
    });

    // fill channels from printClients
    const printClients = await this.retrievePrintClients();
    // we MAY contain multiple SAME typed clients. If so, we need to indicate their guid or _id
    printClients.map(pc => {
      const isTypeUnique = printClients.filter(p => p.type === pc.type).length === 1;
      pc.printers.map(printer => {
        this.channelOptions.push({
          object: { type: 'Printer', value: printer.name, printClientId: pc._id },
          text: `Printer: ${pc.type}${isTypeUnique ? '' : ' -> ' + (pc.guid || pc._id)} -> ${printer.name}`
        });
      })
    });
  }

  submit(event) {

  }

  cancel(evemt) {

  }

  remove(event) {

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
      },
      limit: 100
    }).toPromise();
  }
}
