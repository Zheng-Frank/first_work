import { Component, OnInit } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";

@Component({
    selector: 'app-monitoring-disabled-restaurants',
    templateUrl: './monitoring-disabled-restaurants.component.html',
    styleUrls: ['./monitoring-disabled-restaurants.component.css']
})
export class MonitoringDisabledRestaurantsComponent implements OnInit {

    rows = []; // {restaurant, orders}
    constructor(private _api: ApiService, private _global: GlobalService) { }

    now = new Date();
    restaurants;

    ngOnInit() {
        this.refreshOrders();
        // setInterval(() => { this.refreshOrders(); }, 180000);

        setInterval(() => { this.now = new Date(); }, 60000);
    }

    async refreshOrders() {

        this.restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
            resource: 'restaurant',
            query: {
                "disabled": true
            },

            projection: {
                name: 1,
                _id: 1,
                'googleAddress.formatted': 1,
                'rateSchedules':1,
                createdAt: 1,
                updatedAt: 1
            },
            sort: {
                createdAt: -1
            },
            limit: 3000
        }).toPromise();


        //restaurants.sort((r1, r2) => r2.createdAt.valueOf() - r1.createdAt.valueOf());
        // console.log('disabled restaurant', this.restaurants);
    }
    getTime(time) {
        return new Date(time);
    }
}
