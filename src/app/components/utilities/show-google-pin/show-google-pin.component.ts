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
    tasks;
    filteredRows;
    assigneeList = [];
    agentList = [];
    agent;
    assignee;
    filteredTasks;

    restaurantList = [];
    rows = [];
    messageTo;
    contents;
    hideClosedOldTasksDays = 15;

    constructor(private _api: ApiService, private _global: GlobalService) { }

    async ngOnInit() {
        this.restaurantList = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
            resource: "restaurant",
            aggregate: [
                { $match: { "disabled": { $ne: true } } },
                {
                    $project: {
                        name: 1,
                        alias: 1,
                        logo: 1,
                        channels: 1,
                        score: 1,
                        rateSchedules: 1,
                        "googleAddress.formatted_address": 1,
                        logs: {
                            $filter: {
                                input: "$logs",
                                as: "log",
                                cond: { $eq: ["$$log.type", "google-pin"] }
                            }
                        }
                    }
                },
            ]
            // query: {
            //     disabled: {
            //         $ne: true
            //     }
            // },
            // projection: {
            //     name: 1,
            //     alias: 1,
            //     logo: 1,
            //     channels: 1,
            //     score: 1,
            //     rateSchedules: 1,
            //     "googleAddress.formatted_address": 1
            // }
        }, 100000);
        console.log(this.restaurantList)

        this.populate();
    }

    async populate() {
        this.tasks = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
            resource: "task",
            query: {
                $or: [
                    {
                        resultAt: null
                    },
                    {
                        "result": {
                            "$exists": false
                        }
                    }
                ]
            },
            projection: {
                _id: 1,
                relatedMap: 1,
                'name': 1,
                'assignee': 1
            }
        }, 80000);
        //Filter out closed task
        this.tasks = this.tasks.filter(t => !t.result);

        this.assigneeList = this.tasks.map(t => {
            if (!t.assignee) {
                return;
            }
            if (typeof t.assignee === 'string' || t.assignee instanceof String) {
                return t.assignee;
            }
            else {
                return t.assignee.username;
            }
        });
        // reuturn unique
        this.assigneeList = Array.from(new Set(this.assigneeList)).sort().filter(e => e != null);

        this.agentList = this.restaurantList.map(r => {
            if (r.rateSchedules && r.rateSchedules.length > 0) {
                for (let i of r.rateSchedules) {
                    return i.agent;
                }

            }
        });
        this.agentList = Array.from(new Set(this.agentList)).sort().filter(e => e);

        //Retrieve Google PIN from gmb task which having saved code
        const codeList = await this._api.get(environment.qmenuApiUrl + "generic", {
            resource: "task",
            query: {
                "transfer.code": {
                    "$exists": true
                }
            },
            projection: {
                _id: 1,
                'transfer.code': 1,
                'name': 1,
                'assignee': 1
            },
            limit: 10000,
            sort: {
                createdAt: -1
            }
        }).toPromise();

        let codes = codeList.map(each => each.transfer.code && each.transfer.code.replace(/\+/g, ' ').trim());

        //Retrieve Google PIn which got from SMS reply
        // only good for last 60 days
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 60);
        const googlePinEvents = await this._api.get(environment.qmenuApiUrl + 'generic', {
            resource: 'event',
            query: {
                "name": "google-pin",
                createdAt: {
                    $gt: cutoffDate.valueOf()
                }
            },
            projection: {
                _id: 1,
                "params.body.From": 1,
                "params.body.Text": 1,
                createdAt: 1
            },
            limit: 10000
        }).toPromise();

        //Populatge Google PIN from Call Log
        for (let i = 0; i < this.restaurantList.length; i++) {
            let restaurant = this.restaurantList[i];
            (restaurant.logs || []).map(eachLog => {
                if (eachLog.type === 'google-pin') {
                    const pin = eachLog.response || eachLog.response.trim();
                    this.rows.push({
                        gmbBiz: this.getGmbBizFromRestaurant(restaurant),
                        agent: restaurant.rateSchedules.agent,
                        from: 'Call Log',
                        text: eachLog.response,
                        time: this.convertTimeToMilliseconds(eachLog.time),
                        done: codes.some(code => code == pin)
                    })
                    //console.log('this.rows', this.rows);
                }
            })
        }
        //Populatge Google PIN from SMS reply
        this.rows = this.rows.concat(googlePinEvents.map(each => {
            return {
                id: each['_id'],
                gmbBiz: this.getGmbBizFromPhone(each.params.body.From),
                from: (each.params.body.From || "").length == 11 ? each.params.body.From.toString().substring(1) : each.params.body.From,
                text: each.params.body.Text.replace(/\+/g, ' ').trim(),
                time: each.createdAt,
                done: codes.some(code => code == each.params.body.Text.replace(/\+/g, ' ').trim())
            }
        }));
        //console.log('rows', this.rows);

        this.rows.sort((o1, o2) => new Date(o2.time).valueOf() - new Date(o1.time).valueOf());
        this.filteredRows = this.rows;
    }

    convertTimeToMilliseconds(time) {
        let regexp = /^\d+$/;
        //only convert time format is not milliseconds
        if (!regexp.test(time)) {
            return Date.parse(time)
        }

    }

    getTime(time) {
        return new Date(time);
    }

    getGmbBizFromRestaurant(restaurant) {
        return [{
            restaurant: restaurant,
            tasks: this.tasks.filter(t => t.relatedMap && (t.relatedMap.restaurantId === restaurant['_id'] || t.relatedMap.qmenuId === restaurant['_id']))
        }

        ]
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
            let matchingTasks = this.tasks.filter(t => t.relatedMap && (t.relatedMap.restaurantId === each['_id'] || t.relatedMap.qmenuId === each['_id']));
            return {
                restaurant: each,
                tasks: matchingTasks
            }
        })

        //console.log('result', result);
        return result;
    }

    deleteRow(row) {
        // api delete here...
        this._api.delete(environment.qmenuApiUrl + 'generic',
            {
                resource: 'event',
                ids: [row.id]
            }).subscribe(
                result => {
                    this.rows.filter(each => !each.id === row.id);
                    this._global.publishAlert(
                        AlertType.Success,
                        "Delete successfully"
                    );
                },
                error => {
                    this._global.publishAlert(AlertType.Danger, "Error deleting");
                }
            );
    }
    filter() {
        this.filteredRows = this.rows;

        if (this.assignee && this.assignee !== "All") {
            this.filteredRows = this.filteredRows.filter(r => r.gmbBiz && r.gmbBiz.some(b => b.tasks && b.tasks.some(t => t.assignee === this.assignee)));
        }

        if (this.agent && this.agent !== "All") {
            this.filteredRows = this.filteredRows.filter(r => r.gmbBiz && r.gmbBiz.some(b => b.restaurant && b.restaurant.rateSchedules.some(r => r.agent === this.agent)));
        }

    }

}