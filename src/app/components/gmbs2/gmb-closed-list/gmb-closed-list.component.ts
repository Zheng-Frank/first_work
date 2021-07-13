import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";

@Component({
    selector: 'app-gmb-closed-list',
    templateUrl: './gmb-closed-list.component.html',
    styleUrls: ['./gmb-closed-list.component.css']
})
export class GmbPermanentlyClosedListComponent implements OnInit {

    MAXIMUM_LOG_DISPLAY_AGE = 30; // age, in days, of the oldest routine log entry we will display on the dashboard
    rows = [];
    showRtsWithLogs = false;
    filteredRows = [];
    apiLoading = false;
    combinedScore;

    myColumnDescriptors = [
        {
            label: "Number"
        },
        {
            label: "Restaurant Name"
        },
        {
            label: "Routine Logs"
        },
        {
            label: "Score",
            paths: ['score'],
            sort: (a, b) => (a || 0) > (b || 0) ? 1 : ((a || 0) < (b || 0) ? -1 : 0)
        }
    ];

    constructor(private _api: ApiService) {
        this.refresh();
    }

    ngOnInit() {
    }

    async refresh() {

        try {
            const restaurants = await this._api.get(environment.qmenuApiUrl + "generic", {
                resource: 'restaurant',
                query: {
                    "googleListing.closed": true,
                    disabled: { $ne: true }
                },
                projection: {
                    name: 1,
                    "googleListing.place_id": 1,
                    "googleListing.error": 1,
                    "googleAddress.formatted_address": 1,
                    disabled: 1,
                    score: 1,
                },
                limit: 10000
            }).toPromise();

            const gmbClosedRoutine = await this._api.get(environment.qmenuApiUrl + "generic", {
                resource: "routine",
                query: {
                    name: "GMB Permanently Closed"
                },
                projection: {
                    _id: 1,
                    name: 1
                },
                limit: 1
            }).toPromise();

            const routineInstances = await this._api.get(environment.qmenuApiUrl + "generic", {
                resource: "routine-instance",
                query: {
                    routineId: gmbClosedRoutine[0]._id
                },
                projection: {},
                limit: 10000
            }).toPromise();

            const instanceDict = routineInstances.reduce((dict, inst) => {
                const rtId = inst.results.find(res => res.name === "Restaurant ID").result;
                if (dict[rtId]) {
                    dict[rtId].push(inst);
                } else {
                    dict[rtId] = [inst];
                }
                return dict;
            }, {});

            this.rows = restaurants.filter(rt => !rt.disabled ).map(rt => {
                return {
                    id: rt._id,
                    name: rt.name,
                    address: rt.googleAddress.formatted_address,
                    score: rt.score,
                    instances: (instanceDict[rt._id] || [])
                        .filter(inst => new Date().valueOf() - new Date(inst.createdAt).valueOf() < 86400000 * this.MAXIMUM_LOG_DISPLAY_AGE)
                        .sort((a, b) => new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf())
                }
            });
            // sort descending by score by default
            this.rows.sort((b, a) => a.score - b.score);

        }
        catch (error) {
            console.error(`Error, failed to retrieve restaurant data: `, error);
        }

        this.apiLoading = false;
        this.filter();
    }

    filter() {
        this.filteredRows = this.rows;
        if (this.showRtsWithLogs) {
            this.filteredRows = this.filteredRows.filter(r => (r.instances || []).length);
        }
        this.findCombinedScore();
    }

    findCombinedScore() {
        this.combinedScore = this.filteredRows.reduce((prev, curr) => prev + curr.score, 0);
    }

    displayMessageFromInstance(inst) {
        return inst.results.find(res => res.name === "Comments").result;
    }
}
