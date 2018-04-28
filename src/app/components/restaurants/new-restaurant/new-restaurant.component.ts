import { Component, OnInit, EventEmitter, Output, Input } from '@angular/core';
import { FormEvent } from '../../../classes/form-event';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";
import { mergeMap } from "rxjs/operators";
import { Restaurant } from '@qmenu/ui';

@Component({
  selector: 'app-new-restaurant',
  templateUrl: './new-restaurant.component.html',
  styleUrls: ['./new-restaurant.component.css']
})
export class NewRestaurantComponent implements OnInit {
  @Output() cancel = new EventEmitter();
  @Output() success = new EventEmitter<Restaurant>();
  @Input() restaurant: any = {
    googleAddress: {}
  };
  restaurantFieldDescriptors = [
    {
      field: "name",
      label: "Restaurant Name",
      required: true,
      inputType: "text"
    },
    {
      field: "alias",
      label: "Alias",
      required: true,
      inputType: "text"
    }
  ];

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
  }

  clickCancel() {
    this.cancel.emit();
  }

  selectAddress(address) {
    this.restaurant.googleAddress = address;
  }

  submit(event: FormEvent) {
    if (!this.restaurant.googleAddress.place_id) {
      event.acknowledge('Address is not set. Please type and select address.');
    } else {
      // we need to check validity of alias!
      this._api.get(environment.qmenuApiUrl + 'generic2', {
        resource: 'restaurant',
        query: {
          alias: event.object.alias
        },
        projection: {
          name: 1
        }
      }).pipe(mergeMap(result => {
        if (result.length > 0) {
          // now create this restaurant!
          throw ('Alias ' + event.object.alias + ' already exists.');
        } else {
          return this._api.post(environment.qmenuApiUrl + 'generic2?resource=restaurant', [event.object]);
        }
      })).subscribe(result => {
        event.acknowledge(null);
        this._global.publishAlert(AlertType.Success, "successfully created " + event.object.name);
        this.success.emit(new Restaurant(this.restaurant));
      }, error => {
        event.acknowledge(error);
      });
    }

  }

}
