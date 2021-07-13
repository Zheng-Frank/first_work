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
    showPublished = false;
    gmbOwnersList = ['all'];
    selectedGmbOwner = 'all';
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
        },
        {
            label: "Published"
        },
        {
            label: "GMB Owner"
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
                    "googleListing.gmbOwner": 1,
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

            // get latest 1000 instances
            const routineInstances = await this._api.get(environment.qmenuApiUrl + "generic", {
                resource: "routine-instance",
                query: {
                    routineId: gmbClosedRoutine[0]._id
                },
                projection: {},
                sort: { _id: -1 },
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

            // let's pull GMB published status as well and couple with restaurant's googleListing to determine if we have GMB ownership
            // use aggregate query to pull ONLY published locations
            const gmbAccounts = await this._api.get(environment.qmenuApiUrl + 'generic', {
                resource: 'gmbAccount',
                aggregate: [
                    { '$match': { _id: { $exists: true } } },
                    {
                        $project: {
                            email: 1,
                            locations: {
                                $filter: {
                                    input: "$locations",
                                    as: "location",
                                    cond: { $in: ["$$location.status", ['Published']] }
                                },
                                // statusHistory: 0
                            }
                        }
                    },
                    {
                        $project: {
                            email: 1,
                            "locations.place_id": 1,
                            "locations.role": 1,
                        }
                    },
                ]
            }).toPromise();

            const placeIdEmailDict = {}; // {place_id: email}
            gmbAccounts.forEach(a => (a.locations || []).forEach(loc => placeIdEmailDict[loc.place_id] = a.email));
            const gmbOwners = {};

            this.rows = restaurants.filter(rt => !rt.disabled).map(rt => {
                if (rt.googleListing && rt.googleListing.gmbOwner) {
                    gmbOwners[rt.googleListing.gmbOwner] = rt.googleListing.gmbOwner;
                }
                return {
                    id: rt._id,
                    ...rt.googleListing ? { publishedAccountEmail: placeIdEmailDict[rt.googleListing.place_id] } : {},
                    ...rt.googleListing ? { gmbOwner: rt.googleListing.gmbOwner } : {},
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
            this.gmbOwnersList = ['all', ...Object.keys(gmbOwners).sort((a, b) => a.localeCompare(b))];
        }
        catch (error) {
            console.error(`Error, failed to retrieve restaurant data: `, error);
        }

        this.apiLoading = false;
        this.filter();
    }

    filter() {
        this.filteredRows = this.rows;
        if (this.selectedGmbOwner !== 'all') {
            this.filteredRows = this.filteredRows.filter(r => r.gmbOwner === this.selectedGmbOwner);
        }
        if (this.showRtsWithLogs) {
            this.filteredRows = this.filteredRows.filter(r => (r.instances || []).length);
        }
        if (this.showPublished) {
            this.filteredRows = this.filteredRows.filter(r => r.publishedAccountEmail);
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
