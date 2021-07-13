import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";

@Component({
    selector: 'app-gmb-missing-list',
    templateUrl: './gmb-missing-list.component.html',
    styleUrls: ['./gmb-missing-list.component.css']
})
export class GmbMissingListComponent implements OnInit {

    MAXIMUM_LOG_DISPLAY_AGE = 30; // age, in days, of the oldest routine log entry we will display on the dashboard
    rows = [];
    showRtsWithLogs = false;
    filteredRows = [];
    filterParameters = ["all"];
    selectedFilter = "all";
    apiLoading = false;
    combinedScore;
    now = new Date();
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
            label: "Suspended"
        },
        {
            label: "Error Message"
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
                    "googleListing.error": { $exists: true }
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

            const gmbMissingRoutine = await this._api.get(environment.qmenuApiUrl + "generic", {
                resource: "routine",
                query: {
                    name: "Handling of GMB Missing Restaurants"
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
                    routineId: gmbMissingRoutine[0]._id
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

            console.log(instanceDict);
            // this api gives a list of suspended locations. please see API reponse for data structure

            // ...
            // lastAt: "2021-05-23T23:55:10.145Z"
            // place_id: "ChIJp_39urcu3YARizYpvD7myts"

            const suspendedLocations = await this._api.post(environment.appApiUrl + "gmb/generic", {
                name: "get-locations-status-changes",
                payload: {
                    previous: "Published",
                    current: "Suspended",
                    // account: "sz075589@gmail.com"
                }
            }).toPromise();

            // build a rtId: suspendedAt map
            const suspendedPlaceIdDict = suspendedLocations.reduce((dict, loc) => {
                dict[loc.place_id] = loc.lastAt;
                return dict;
            }, {});

            const errors = {};
            this.rows = restaurants.filter(rt => !rt.disabled && rt.name !== "qMenu Demo").map(rt => {
                // we want an array of all unique error messages as filter parameters.
                // use an object to ensure uniqueness, then map the object's keys to an array
                errors[rt.googleListing.error] = rt.googleListing.error;
                return {
                    id: rt._id,
                    name: rt.name,
                    address: rt.googleAddress.formatted_address,
                    error: rt.googleListing.error,
                    score: rt.score,
                    suspendedAt: suspendedPlaceIdDict[rt.googleListing.place_id],
                    instances: (instanceDict[rt._id] || [])
                        .filter(inst => new Date().valueOf() - new Date(inst.createdAt).valueOf() < 86400000 * this.MAXIMUM_LOG_DISPLAY_AGE) 
                        .sort((a, b) => new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf())
                }
            });
            // sort descending by score by default
            this.rows.sort((b, a) => a.score - b.score);

            this.filterParameters = ["all", ...Object.keys(errors)];
        }
        catch (error) {
            console.error(`Error, failed to retrieve restaurant data: `, error);
        }

        this.apiLoading = false;
        this.filter();
    }

    filter() {
        if (this.selectedFilter === "all") {
            this.filteredRows = this.rows;
        } else {
            this.filteredRows = this.rows.filter(r => r.error === this.selectedFilter)
        }

        if (this.showRtsWithLogs) {
            this.filteredRows = this.filteredRows.filter(r => (r.instances || []).length);
        }
        this.findCombinedScore();
    }

    findCombinedScore() {
        this.combinedScore = this.filteredRows.reduce((prev, curr) => prev + curr.score, 0);
    }

    displayMessageFromInstance(inst) {
        const resultMessage = inst.results.find(res => res.name === "Result").result;
        const comments = inst.results.find(res => res.name === "Comments").result;
        return `${resultMessage}: ${comments}`
    }

    colorCodeMessages(inst) {
        const result = inst.results.find(res => res.name === "Result").result;
        if (result === "Succeeded") return "text-success";
        if (result === "Failed") return "text-danger";
        if (result === "Ongoing") return "text-warning";
        return "";
    }
}
