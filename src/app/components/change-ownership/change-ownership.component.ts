import { Component, OnInit } from '@angular/core';
import { environment } from "../../../environments/environment";
import { ApiService } from "../../services/api.service";

@Component({
  selector: 'app-change-ownership',
  templateUrl: './change-ownership.component.html',
  styleUrls: ['./change-ownership.component.css']
})
export class ChangeOwnershipComponent implements OnInit {

  oldRestaurantId = '';
  newName = '';
  newAlias = '';
  switchingDate = new Date();

  constructor(private _api: ApiService) { }

  ngOnInit() {
  }

  canChangeOwnership() {
    return !!this.oldRestaurantId && !!this.newName && !!this.newAlias && !!this.switchingDate;
  }

  async changeOwnership() {
    const previousRestaurantId = this.oldRestaurantId;

    // const savedValues: any = {
    //   oldRestaurantId: this.oldRestaurantId,
    //   newName: this.newName,
    //   previousRestaurantId,
    //   newAlias: this.newAlias,
    //   switchingDate: this.switchingDate
    // }
    // console.log(savedValues);
    // return;

    const oldRestaurant = (await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        _id: { $oid: this.oldRestaurantId }
      },
      limit: 1
    }).toPromise())[0];

    console.log(oldRestaurant);
    const existingOnes = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        "googleAddress.place_id": oldRestaurant.googleAddress.place_id
      },
      limit: 2
    }).toPromise();
    // allow same location having multiple times ownership changes
    // if (existingOnes.length > 1) {
    //   return alert('Failed: Already have multiple restaurants with same place ID.');
    // }

    const clone = JSON.parse(JSON.stringify(oldRestaurant));
    delete clone._id;
    clone.createdAt = new Date();
    clone.updatedAt = new Date();
    (clone.rateSchedules || []).map(rs => rs.agent = 'none');
    delete clone.notifications;
    delete clone.closedHours;
    delete clone.salesBase;
    delete clone.salesBonus;
    delete clone.paymentMeans;
    delete clone.logs;
    delete clone.people;
    delete clone.salesThreeMonthAverage;
    clone.channels = clone.channels.filter(e => (e.type === 'Phone' && e.notifications && e.notifications.some(n => n === 'Business')) || e.type === 'Fax');

    clone.name = this.newName;
    clone.previousRestaurantId = previousRestaurantId;
    clone.logs = clone.logs || [];
    clone.logs.push({
      "problem": "change ownership",
      "response": "this is the new. Old one is " + oldRestaurant._id,
      "time": new Date(),
      "username": "system",
      "resolved": true
    });

    const oldPatch: any = {
      old: {
        _id: oldRestaurant._id,
        selfSignup: {} // leave this to make sure "new" doesn't have selfSignup
      },
      new:
      {
        _id: oldRestaurant._id,
        disabled: true
      }
    };

    if (oldRestaurant.alias === this.newAlias) {
      // patch old to a new alias
      oldPatch.new.alias = oldRestaurant.alias + "-old";
    } else {
      // use new alias directly
      clone.alias = this.newAlias;
    }

    if (oldRestaurant.name === this.newName) {
      oldPatch.new.name = oldRestaurant.name + ' - old';
    }

    const ordersToMigrate = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'order',
      query: {
        restaurant: { $oid: oldRestaurant._id },
        createdAt: { $gt: { $date: this.switchingDate } }
      },
      projection: {
        createdAt: 1
      },
      limit: 8000
    }).toPromise();

    // start the action!
    // 1. create the new restaurant!
    const resultIds = await this._api.post(environment.qmenuApiUrl + 'generic?resource=restaurant', [clone]).toPromise();

    // 2. now path those orders's restaurant field
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=order',
      ordersToMigrate.map(order => ({
        old: { _id: order._id },
        new: { _id: order._id, restaurant: { $oid: resultIds[0] } },
      }))
    ).toPromise();

    oldPatch.new.logs = oldRestaurant.logs || [];
    oldPatch.new.logs.push({
      "problem": "change ownership",
      "response": "new RT id is " + resultIds[0],
      "time": new Date(),
      "username": "system",
      "resolved": true
    });

    // 3. patch old restaurant!
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [oldPatch]).toPromise();

    alert('Done! ' + resultIds[0]);
  }

}
