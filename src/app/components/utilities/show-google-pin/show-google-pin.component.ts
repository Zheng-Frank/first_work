import { Component, OnInit, Input, ViewChild, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";

@Component({
    selector: 'show-google-pin',
    templateUrl: './show-google-pin.component.html',
    styleUrls: ['./show-google-pin.component.css']
})
export class ShowGooglePINComponent implements OnInit {
    @Input() restaurant;
    restaurantList = [];
    rows = [];
    messageTo;
    contents;
    hideClosedOldTasksDays = 7;

    constructor(private _api: ApiService, private _global: GlobalService) { }

    async ngOnInit() {
        this.restaurantList = await this._global.getCachedVisibleRestaurantList();
        this.populate();
    }

    async populate() {

        const daysAgo = function (days) {
            const d = new Date();
            d.setHours(0, 0, 0, 0);
            d.setDate(d.getDate() - days);
            return d;
        };

        const codeList = await this._api.get(environment.adminApiUrl + "generic", {
            resource: "task",
            query: {
                "transfer.code": {
                    "$exists": true
                }

            },
            projection: {
                'transfer.code': 1
            },
            limit: 10000,
            sort: {
                createdAt: -1
            }
        }).toPromise();

        let codes = codeList.map(each => each.transfer.code);
        
        const results = await this._api.get(environment.qmenuApiUrl + 'generic', {
            resource: 'event',
            query: {
                "name": "google-pin"
            },
            projection: {
                name: 1,
                params: 1
            },
            limit: 10000
        }).toPromise();
        this.rows = results.map(each => {
            return {
                restaurant: this.getRestaurant(each.params.body.From),
                from: each.params.body.From.length == 11 ? each.params.body.From.toString().substring(1) : each.params.body.From,
                text: each.params.body.Text,
                done: codes.some(code => code == each.params.body.Text)
            }
        })
    }

    getRestaurant(phoneNumber) {
        let result = []
        if (phoneNumber.toString().length == 11) {
            phoneNumber = phoneNumber.toString().substring(1);
        }

        for (let i = 0; i < this.restaurantList.length; i++) {
            const restaurant = this.restaurantList[i];
            if ((restaurant.phones || []).some(phone => (phone.phoneNumber || '').indexOf(phoneNumber) === 0)) {
                result.push(restaurant);
            }
        }
        //console.log('result', result);
        return result;

    }


}