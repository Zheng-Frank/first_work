import { Component, OnInit } from '@angular/core';
import { environment } from "../../../environments/environment";
import { ApiService } from "../../services/api.service";
import {Helper} from '../../classes/helper';
import {AlertType} from '../../classes/alert-type';
import {GlobalService} from '../../services/global.service';

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
  steps = [];

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
  }

  canChangeOwnership() {
    return !!this.oldRestaurantId && !!this.newName && !!this.newAlias && !!this.switchingDate;
  }

  stepMove(succeed, info?) {
    this.steps[this.steps.length - 1].status = info || (succeed ? 'Done' : 'Failed');
    this.steps[this.steps.length - 1].style = succeed ? 'success' : 'danger';
  }

  async changeOwnership() {
    try {
      this.steps = [];
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

      this.steps.push({title: "Load old restaurant info..."});
      const oldRestaurant = (await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'restaurant',
        query: {
          _id: { $oid: this.oldRestaurantId }
        },
        limit: 1
      }).toPromise())[0];
      this.stepMove(true);
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
      this.steps.push({title: "Clone restaurant info..."});
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
      delete clone.web.bizManagedWebsite;
      delete clone.web.useBizMenuUrl;
      delete clone.web.useBizOrderAheadUrl;
      delete clone.web.useBizReservationUrl;
      delete clone.web.useBizWebsiteForAll;

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
      this.stepMove(true);

      const oldPatch: any = {
        old: {
          _id: oldRestaurant._id,
          selfSignup: {} // leave this to make sure "new" doesn't have selfSignup
        },
        new:
          {
            _id: oldRestaurant._id,
            disabled: true,
            disabledAt: new Date()
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
      this.steps.push({title: "Load old restaurant orders..."});
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
      this.stepMove(true);

      // start the action!
      // 1. create the new restaurant!
      this.steps.push({title: "Create new restaurant..."});
      const resultIds = await this._api.post(environment.qmenuApiUrl + 'generic?resource=restaurant', [clone]).toPromise();
      this.stepMove(true);

      // 2. now path those orders's restaurant field
      this.steps.push({title: "Migrate orders to new restaurant..."});
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=order',
        ordersToMigrate.map(order => ({
          old: { _id: order._id },
          new: { _id: order._id, restaurant: { $oid: resultIds[0] } },
        }))
      ).toPromise();
      this.stepMove(true);

      // 3. patch old restaurant!
      this.steps.push({title: "Add log to old restaurant..."});
      oldPatch.new.logs = oldRestaurant.logs || [];
      oldPatch.new.logs.push({
        "problem": "change ownership",
        "response": "new RT id is " + resultIds[0],
        "time": new Date(),
        "username": "system",
        "resolved": true
      });
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [oldPatch]).toPromise();
      this.stepMove(true);

      // 4. republish website to aws
      this.steps.push({title: "Republish website to aws..."});
      await this.injectWebsiteAws({...clone, _id: resultIds[0]});
      this.steps.push({title: "Ownership change success! New restaurant's id is ", newRTId: resultIds[0]});
    } catch (e) {
      this.stepMove(false);
      console.log(e);
    }
  }

  async injectWebsiteAws(restaurant) {
    try {
      const domain = Helper.getTopDomain(restaurant.web.qmenuWebsite);
      const templateName = restaurant.web.templateName;

      if (!templateName || !domain) {
        this.stepMove(false, "Missing template name or website, skipped.");
        return;
      }

      if (domain.indexOf('qmenu.us') >= 0) {
        this.stepMove(false, "Can not inject qmenu, skipped.");
        return;
      }

      await this._api.post(environment.qmenuApiUrl + 'utils/publish-website-s3', {
        domain: domain,
        templateName: restaurant.web.templateName,
        restaurantId: restaurant._id
      }).toPromise();
      this.stepMove(true);

      // Invalidate the domain cloudfront
      this.steps.push({title: "Invalidate domain cache..."});
      try {
        await this._api.post(environment.appApiUrl + 'events', [
          {
            queueUrl: `https://sqs.us-east-1.amazonaws.com/449043523134/events-v3`,
            event: { name: "invalidate-domain", params: { domain: domain } } }
        ]).toPromise();
        this.stepMove(true);
      } catch (error) {
        this.stepMove(false);
        console.log(error);
      }
    } catch (error) {
      this.stepMove(false);
      console.log(error);
    }
  }

}
