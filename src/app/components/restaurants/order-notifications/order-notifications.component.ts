import { Component, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { ModalComponent } from "@qmenu/ui/bundles/qmenu-ui.umd";
import { ApiService } from 'src/app/services/api.service';
import { environment } from 'src/environments/environment';
import { Helper } from '../../../classes/helper';
import { PrunedPatchService } from "../../../services/prunedPatch.service";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";

@Component({
  selector: 'app-order-notifications',
  templateUrl: './order-notifications.component.html',
  styleUrls: ['./order-notifications.component.css']
})
export class OrderNotificationsComponent implements OnInit, OnChanges {
  @ViewChild('modalNotification') modalNotification: ModalComponent;
  @Input() restaurant: Restaurant;

  orderNotifications: any = [
    // {
    //   channel: {
    //     type: 'SMS',
    //     value: '4075807504'
    //   },
    // },
    // {
    //   channel: {
    //     type: 'Fax',
    //     value: '4075807504'
    //   },
    //   orderTypes: [],
    // },
    // {
    //   channel: {
    //     type: 'Phone',
    //     value: '4075807504'
    //   },
    //   orderTypes: ['DELIVERY', 'PICKUP'],
    // },
    // {
    //   channel: {
    //     type: 'Email',
    //     value: 'garysui@gmail.com'
    //   },
    //   orderTypes: ['DINE-IN']
    // },
    // {
    //   channel: {
    //     type: 'phoenix',  // type of printClient
    //     value: 'receipt 2', // printer name
    //     printClientId: '5ab6',
    //     guid: '123455',
    //   },
    // },
    // {
    //   channel: {
    //     type: 'longhorn',  // type of printClient
    //     value: 'receipt', // printer name
    //   },
    // },
    // {
    //   channel: {
    //     type: 'fei-e',  // type of printClient
    //     value: 'somesn', // sn
    //     printClientId: '5ab6',
    //     host: 'EU',
    //     key: "somekey",
    //   },
    //   templateName: 'Chef',
    //   menuFilters: [{
    //     name: 'Sushi'
    //   }],
    //   copies: 2
    // },
  ];

  faClassMap = {
    SMS: 'fa-comments',
    Fax: 'fa-fax',
    Phone: 'fa-phone-volume',
    Email: 'fa-envelope',
    'fei-e': 'fa-print',
    'longhorn': 'fa-print',
    'phoenix': 'fa-print',
  }

  notificationInEditing = {} as any;

  channelDescriptor = {
    field: "channel", //
    label: "Channel",
    required: true,
    inputType: "select",
    items: []
  };

  orderTypesDescriptor = {
    field: "orderTypes", //
    label: "Order Types (default for ALL)",
    required: false,
    inputType: "multi-select",
    items: [
      { object: "PICKUP", text: "PICKUP", selected: false },
      { object: "DELIVERY", text: "DELIVERY", selected: false },
      { object: "DINE-INE", text: "DINE-IN", selected: false },
    ]
  };

  templateNameDescriptor = {
    field: "templateName", //
    label: "Template",
    required: false,
    inputType: "single-select",
    items: [
      { object: "default", text: "default", selected: true },
      { object: "Chef", text: "Chef", selected: false },
    ]
  };

  formatDescriptor = {
    field: "format", //
    label: "Format",
    required: false,
    inputType: "single-select",
    items: [
      { object: "png", text: "png", selected: true },
      { object: "esc", text: "esc", selected: false },
      { object: "pdf", text: "pdf", selected: false },
      { object: "png2esc", text: "png2esc", selected: false },
    ]
  };

  copiesDescriptor = {
    field: "copies", //
    label: "Copies",
    required: false,
    inputType: "single-select",
    items: [
      { object: 1, text: "1", selected: true },
      { object: 2, text: "2", selected: false },
      { object: 3, text: "3", selected: false },
      { object: 4, text: "4", selected: false },
    ]
  };

  customizedRenderingStylesDescriptor = {
    field: "customizedRenderingStyles", //
    label: "Customized Rendering Styles",
    required: false,
    inputType: "textarea",
  };

  notificationFieldDescriptors: any = [
    this.channelDescriptor,
  ];

  validFieldDescriptorMap = {
    SMS: [this.channelDescriptor, this.orderTypesDescriptor],
    Fax: [this.channelDescriptor, this.orderTypesDescriptor, this.customizedRenderingStylesDescriptor],
    Phone: [this.channelDescriptor, this.orderTypesDescriptor],
    Email: [this.channelDescriptor, this.orderTypesDescriptor],
    'fei-e': [this.channelDescriptor, this.orderTypesDescriptor, this.copiesDescriptor],
    'longhorn': [this.channelDescriptor, this.orderTypesDescriptor, this.copiesDescriptor],
    'phoenix': [this.channelDescriptor, this.orderTypesDescriptor, this.formatDescriptor, this.templateNameDescriptor, this.copiesDescriptor, this.customizedRenderingStylesDescriptor],
  }

  menuFilters = [];
  removable = false;
  originalNotification;
  constructor(private _api: ApiService, private _prunedPatch: PrunedPatchService, private _global: GlobalService) { }

  ngOnInit() {
    this.orderNotifications = this.restaurant.orderNotifications || [];
  }

  ngOnChanges(changes: SimpleChanges) {
  }

  havingOrderTypes() {
    return this.orderNotifications.some(n => n.orderTypes && n.orderTypes.length > 0 && n.orderTypes.length < 3);
  }

  havingTemplateName() {
    return this.orderNotifications.some(n => n.templateName);
  }

  havingMenuFilters() {
    return this.orderNotifications.some(n => n.menuFilters && n.menuFilters.length > 0);
  }

  havingCopies() {
    return this.orderNotifications.some(n => n.copies > 1);
  }

  async editNotification(n?) {
    this.modalNotification.show();
    // get channels from channels
    this.channelDescriptor.items.length = 0;
    (this.restaurant.channels || []).map(c => {
      this.channelDescriptor.items.push({
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
        this.channelDescriptor.items.push({
          object: { type: pc.type, value: printer.name, printClientId: pc._id, guid: pc.guid },
          text: `Printer: ${pc.type}${isTypeUnique ? '' : ' → ' + (pc.guid || pc._id)} → ${printer.name}`
        });
      })
    });

    // make clone of select n for editing!
    this.notificationInEditing = {};
    this.originalNotification = undefined;
    if (n) {
      this.originalNotification = n;
      this.notificationInEditing = JSON.parse(JSON.stringify(n));
      // we need to make sure "Object" values are selected by default:
      // 1. channel
      const [matchedItem] = this.channelDescriptor.items.filter(c => JSON.stringify(c.object) === JSON.stringify(n.channel));
      this.channelDescriptor.items.map(i => i.selected === matchedItem);
      this.notificationInEditing.channel = matchedItem && matchedItem.object;

      // 2. menuFilters
      this.menuFilters = n.menuFilters || [];

    }
    // re-org UI
    this.updateFormEditor();
    this.removable = !!n;
  }

  updateFormEditor() {
    // always having channel and order types otions
    if (this.notificationInEditing.channel) {
      this.notificationFieldDescriptors = [...this.validFieldDescriptorMap[this.notificationInEditing.channel.type]];
    }
    // let's also remove irrelevant fields
    const uselessFields = Object.keys(this.notificationInEditing).filter(k => !this.notificationFieldDescriptors.map(fd => fd.field).some(f => f === k));
    console.log(uselessFields);
    uselessFields.map(f => delete this.notificationInEditing[f]);
  }

  submit() {
    const cloned = JSON.parse(JSON.stringify(this.notificationInEditing));
    const index = this.orderNotifications.indexOf(this.originalNotification);
    if (index >= 0) {
      this.orderNotifications[index] = cloned;

    } else {
      this.orderNotifications.push(cloned);
    }
    this.patchDiff(this.orderNotifications)
    // reset defaults
    if (!cloned.orderTypes || cloned.orderTypes.length === 0 || cloned.orderTypes.length === this.orderTypesDescriptor.items.length) {
      delete cloned.orderTypes;
    }
    if (cloned.channel.type === 'phoenix' && this.menuFilters.length > 0) {
      cloned.menuFilters = JSON.parse(JSON.stringify(this.menuFilters));
    }

    this.modalNotification.hide();
  }

  async patchDiff(newOrderNotifications) {
    if (Helper.areObjectsEqual(this.restaurant.orderNotifications, newOrderNotifications)) {
      this._global.publishAlert(
        AlertType.Info,
        "Not changed"
      );
    } else {
      // api update here...
      await this._prunedPatch
        .patch(environment.qmenuApiUrl + "generic?resource=restaurant", [{
          old: {
            _id: this.restaurant['_id'],
            orderNotifications: this.restaurant.orderNotifications
          }, new: {
            _id: this.restaurant['_id'],
            orderNotifications: newOrderNotifications
          }
        }])
        .subscribe(
          result => {
            // let's update original, assuming everything successful
            this.restaurant.orderNotifications = newOrderNotifications;
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
  }

  cancel() {
    this.modalNotification.hide();
  }

  remove(event) {
    this.orderNotifications = this.orderNotifications.filter(n => n !== this.originalNotification);
    event.acknowledge(null);
    this.modalNotification.hide();
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
