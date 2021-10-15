import { Component, EventEmitter, Input, OnChanges, OnInit, Output, ViewChild } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { ModalComponent } from "@qmenu/ui/bundles/qmenu-ui.umd";
import { ApiService } from 'src/app/services/api.service';
import { environment } from 'src/environments/environment';
import { GlobalService } from 'src/app/services/global.service';
import { AlertType } from 'src/app/classes/alert-type';
import { Helper } from 'src/app/classes/helper';
import { PrunedPatchService } from 'src/app/services/prunedPatch.service';

@Component({
  selector: 'app-order-notifications',
  templateUrl: './order-notifications.component.html',
  styleUrls: ['./order-notifications.component.css']
})
export class OrderNotificationsComponent implements OnInit, OnChanges {
  @ViewChild('modalNotification') modalNotification: ModalComponent;
  @Input() restaurant: Restaurant;
  @Output() updateRestaurant = new EventEmitter();

  orderNotifications: any = [];

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
      { object: "DINE-IN", text: "DINE-IN", selected: false },
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

  languagesDescriptor = {
    field: "languages", //
    label: "Languages",
    required: false,
    inputType: "multi-select",
    items: [
      { object: "EN", text: "English", selected: true },
      { object: "ZH", text: "中文", selected: false },
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
    'phoenix': [this.channelDescriptor, this.orderTypesDescriptor, this.formatDescriptor, this.templateNameDescriptor, this.languagesDescriptor, this.copiesDescriptor, this.customizedRenderingStylesDescriptor],
  }

  menuFilters = [];
  removable = false;
  originalNotification;
  constructor(private _api: ApiService, private _global: GlobalService, private _prunedPatch: PrunedPatchService) { }

  ngOnInit() {
  }

  ngOnChanges() {
    this.orderNotifications = this.restaurant.orderNotifications || [];
  }

  // order types column is always displayed, havingOrderTypes() is currently un-used
  // havingOrderTypes() {
  //   return this.orderNotifications.some(n => n.orderTypes && n.orderTypes.length > 0 && n.orderTypes.length < 3);
  // }

  havingTemplateName() {
    return this.orderNotifications.some(n => n.templateName);
  }

  havingMenuFilters() {
    return this.orderNotifications.some(n => n.menuFilters && n.menuFilters.length > 0);
  }

  havingNonEnglishLanguages() {
    return this.orderNotifications.some(n => (n.languages || []).filter(lang => lang !== 'EN').length > 0);
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

      if (this.notificationInEditing.channel.type === 'phoenix') {
        // explicitly show default setting values on phoenix print notifications, if the notification doesn't already have a property set
        this.notificationInEditing.format = this.notificationInEditing.format || 'png';
        this.notificationInEditing.templateName = this.notificationInEditing.templateName || 'default'
      }
    }

    // let's also remove irrelevant fields
    const uselessFields = Object.keys(this.notificationInEditing).filter(k => !this.notificationFieldDescriptors.map(fd => fd.field).some(f => f === k));
    uselessFields.map(f => delete this.notificationInEditing[f]);
  }

  submit(event) {
    const cloned = JSON.parse(JSON.stringify(this.notificationInEditing));
    const index = this.orderNotifications.indexOf(this.originalNotification);
    const oldOrderNotifications = JSON.parse(JSON.stringify(this.orderNotifications));
    if (index >= 0) {
      this.orderNotifications[index] = cloned;
    } else {
      this.orderNotifications.push(cloned);
    }
    // reset defaults
    if (!cloned.orderTypes || cloned.orderTypes.length === 0 || cloned.orderTypes.length === this.orderTypesDescriptor.items.length) {
      delete cloned.orderTypes;
    }
    if (cloned.channel.type === 'phoenix' && this.menuFilters.length > 0) {
      cloned.menuFilters = JSON.parse(JSON.stringify(this.menuFilters));
    }


    this.patchDiff(this.orderNotifications, oldOrderNotifications);
    this.modalNotification.hide();
    this.notificationInEditing = {};
    event.acknowledge(null);
  }

  async patchDiff(newNotifications, oldNotifications) {
    if (Helper.areObjectsEqual(newNotifications, oldNotifications)) {
      this._global.publishAlert(
        AlertType.Info,
        "Not changed"
      );
    } else {
      await this._prunedPatch.patch(environment.qmenuApiUrl + "generic?resource=restaurant", [{
        old: {
          _id: this.restaurant._id,
        },
        new: {
          _id: this.restaurant._id,
          orderNotifications: newNotifications
        }
      }])
        .subscribe(
          result => {
            this.restaurant.orderNotifications = newNotifications;
            this._global.publishAlert(
              AlertType.Success,
              "Updated successfully"
            );
            this.updateRestaurant.emit(this.restaurant);
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
    const oldOrderNotifications = JSON.parse(JSON.stringify(this.orderNotifications));
    this.orderNotifications = this.orderNotifications.filter(n => n !== this.originalNotification);
    this.patchDiff(this.orderNotifications, oldOrderNotifications);
    event.acknowledge(null);
    this.modalNotification.hide();
    this.restaurant.orderNotifications = this.orderNotifications;
    this.updateRestaurant.emit(this.restaurant);
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

  printTestOrder() {
    console.log('print test order');
  }

  previewTestOrder() {
    console.log('preview test order');
  }

  editingPrintNotification() {
    return ['fei-e', 'phoenix', 'longhorn'].some(el => (this.notificationInEditing.channel || {}).type === el)
  }
}