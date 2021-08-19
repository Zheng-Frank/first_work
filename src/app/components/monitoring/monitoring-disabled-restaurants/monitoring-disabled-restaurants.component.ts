import { Component, OnInit } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";

@Component({
    selector: 'app-monitoring-disabled-restaurants',
    templateUrl: './monitoring-disabled-restaurants.component.html',
    styleUrls: ['./monitoring-disabled-restaurants.component.css']
})
export class MonitoringDisabledRestaurantsComponent implements OnInit {
    restaurantsColumnDescriptors = [
        {
            label: 'Number'
        },
        {
            label: "Restaurant",
            paths: ['name'],
            sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
        },
        {
            label: "Agent"
        },
        {
            label: "CreatedAt",
            paths: ['createdAt'],
            sort: (a, b) => new Date(a || 0).valueOf() - new Date(b || 0).valueOf()
        },
        {
            label: "DisabledAt",
            paths: ['disabledAt'],
            sort: (a, b) => new Date(a || 0).valueOf() - new Date(b || 0).valueOf()
        },
        {
            label: "Lifetime (days)",
            paths: ['lifetime'],
            sort: (a, b) => a - b
        }
    ];
    constructor(private _api: ApiService, private _global: GlobalService) { }

    restaurants = [];

    ngOnInit() {
        this.refreshOrders();
    }

    async refreshOrders() {

        this.restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
            resource: 'restaurant',
            query: {
                "disabled": true
            },

            projection: {
                name: 1,
                _id: 1,
                'googleAddress.formatted_address': 1,
                'googleAddress.timezone': 1,
                'rateSchedules.agent': 1,
                createdAt: 1,
                updatedAt: 1,
                disabledAt: 1
            },
            sort: {
                createdAt: -1
            }
        }, 1000000);
        this.restaurants = this.restaurants.map(restaurant => {
            let lifetime = new Date(restaurant.disabledAt).valueOf() - new Date(restaurant.createdAt).valueOf();
            restaurant.lifetime = Number((lifetime / (24 * 3600 * 1000)).toFixed(0));
            return restaurant;
        });
        //restaurants.sort((r1, r2) => r2.createdAt.valueOf() - r1.createdAt.valueOf());
    }
    getTime(time) {
        return new Date(time);
    }
}
