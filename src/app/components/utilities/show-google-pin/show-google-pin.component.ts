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
    @Input() bizList;
    @Input() tasks;

    restaurantList = [];
    rows = [];
    messageTo;
    contents;
    hideClosedOldTasksDays = 7;

    constructor(private _api: ApiService, private _global: GlobalService) { }

    async ngOnInit() {
        this.restaurantList = await this._global.getCachedVisibleRestaurantList(true);
        this.populate();
    }

    async populate() {
        const daysAgo = function (days) {
            const d = new Date();
            d.setHours(0, 0, 0, 0);
            d.setDate(d.getDate() - days);
            return d;
        };

        //Retrieve Google PIN from gmb task which having saved code
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

        //Retrieve Google PIn which got from SMS reply
        const googlePinEvents = await this._api.get(environment.qmenuApiUrl + 'generic', {
            resource: 'event',
            query: {
                "name": "google-pin"
            },
            projection: {
                name: 1,
                params: 1,
                createdAt: 1
            },
            limit: 10000
        }).toPromise();

        //Populatge Google PIN from Call Log
        for (let i = 0; i < this.restaurantList.length; i++) {
            let restaurant = this.restaurantList[i];
            (restaurant.logs || []).map(eachLog => {
                if (eachLog.type === 'google-pin') {
                    this.rows.push({
                        gmbBiz: this.getGmbBizFromRestaurant(restaurant),
                        from: 'Call Log',
                        text: eachLog.response,
                        time: eachLog.time,
                        done: codes.some(code => code == eachLog.response)
                    })
                    //console.log('this.rows', this.rows);
                }
            })
        }
        //Populatge Google PIN from SMS reply
        this.rows = this.rows.concat(googlePinEvents.map(each => {
            return {
                gmbBiz: this.getGmbBizFromPhone(each.params.body.From),
                from: each.params.body.From.length == 11 ? each.params.body.From.toString().substring(1) : each.params.body.From,
                text: each.params.body.Text,
                time: each.createdAt,
                done: codes.some(code => code == each.params.body.Text)
            }
        }));
        //console.log('rows', JSON.stringify(this.rows));
    }

    getTime(time) {
        return new Date(time);
    }

    getGmbBizFromRestaurant(restaurant) {

        return [{
            restaurant: restaurant,
            tasks: this.tasks.filter(t => t.gmbBiz && t.gmbBiz.qmenuId === restaurant['_id'])
        }

        ]



        // let mathingBiz=[];

        //     for (let k = 0; k < this.tasks.length; k++) {
        //             if (this.tasks[k].gmbBiz && this.tasks[k].gmbBiz.qmenuId === restaurant['_id']) {
        //                 mathingBiz.push({
        //                     restaurant: restaurant,
        //                     task: this.tasks[k]
        //                 })

        //             }

        //     }


        //     //Find matching 
        //     console.log('mathingBiz', mathingBiz);
        //     return mathingBiz;



    }
    getGmbBizFromPhone(input) {
        if (input.toString().length == 11) {
            input = input.toString().substring(1);
        }
        let matchingRTs = [];
        //this.restaurantList.filter(eachRt => eachRt.channels && eachRt.channels.some(p => p.type === 'Phone' && p.value === input));

        for (let i = 0; i < this.restaurantList.length; i++) {
            let restaurant = this.restaurantList[i];
            if ((restaurant.channels || []).some(c => (c.type === 'Phone' || c.type === 'SMS') && c.value === input)) {
                matchingRTs.push(restaurant)

            }
        }

        // one phone number, can have multiple matching restaurants, and each restaurant, will have multiple tasks
        let result = matchingRTs.map(each => {
            let matchingTasks = this.tasks.filter(t => t.gmbBiz && t.gmbBiz.qmenuId === each['_id']);
            return {
                restaurant: each,
                tasks: matchingTasks
            }
        })

        //console.log('result', result);
        return result;




    }

    // getGmbBizFromPhone(phoneNumber) {
    //     let mathingBiz=[];
    //     let matchingRTs=[];
    //     if (phoneNumber.toString().length == 11) {
    //         phoneNumber = phoneNumber.toString().substring(1);
    //     }

    //     //Find matching restaurant with the SMS number
    //     for (let i = 0; i < this.restaurantList.length; i++) {
    //         const restaurant = this.restaurantList[i];
    //         if ((restaurant.phones || []).some(phone => (phone.phoneNumber || '').indexOf(phoneNumber) === 0)) {
    //         matchingRTs.push(restaurant)

    //         }
    //     }

    //     for (let i = 0; i < matchingRTs.length; i++) {
    //         for (let k = 0; k < this.tasks.length; k++) {
    //                 if (this.tasks[k].gmbBiz && this.tasks[k].gmbBiz.qmenuId === matchingRTs[i]['_id']) {
    //                     mathingBiz.push({
    //                         restaurant: matchingRTs[i],
    //                         task: this.tasks[k]
    //                     })

    //                 }

    //         }


    //         //Find matching 
    //         console.log('mathingBiz', mathingBiz);
    //         return mathingBiz;


    //     }


    // }



}