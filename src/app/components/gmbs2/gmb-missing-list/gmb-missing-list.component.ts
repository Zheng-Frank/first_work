import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";

@Component({
    selector: 'app-gmb-missing-list',
    templateUrl: './gmb-missing-list.component.html',
    styleUrls: ['./gmb-missing-list.component.css']
})
export class GmbMissingListComponent implements OnInit {

    rows = [];
    filteredRows = [];
    filterParameters = ['all'];
    selectedFilter = 'all';
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
            label: "Error Message",
            paths: ['error'],
            sort: (a, b) => a.localeCompare(b)
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
                    "googleListing.cid": 1,
                    "googleListing.gmbOwner": 1,
                    "googleListing.gmbWebsite": 1,
                    "googleListing.gmbOpen": 1,
                    "googleListing.error": 1,
                    "googleAddress.formatted_address": 1,
                    disabled: 1,
                    score: 1,
                },
                limit: 10000
            }).toPromise();

            const errors = {};
            this.rows = restaurants.filter(rt => !rt.disabled && rt.name !== 'qMenu Demo').map(rt => {
                // we want an array of all unique error messages as filter parameters.
                // use an object to ensure uniqueness, then map the object's keys to an array
                errors[rt.googleListing.error] = rt.googleListing.error;
                return {
                    id: rt._id,
                    name: rt.name,
                    address: rt.googleAddress.formatted_address,
                    error: rt.googleListing.error,
                    score: rt.score
                }
            });
            this.filterParameters = ['all', ...Object.keys(errors)];
        }
        catch (error) {
            console.error(`Error, failed to retrieve restaurant data: `, error);
        }

        this.apiLoading = false;
        this.filter();
    }

    filter() {
        if (this.selectedFilter === 'all') {
            this.filteredRows = this.rows;
        } else {
            this.filteredRows = this.rows.filter(r => r.error === this.selectedFilter)
        }
        this.findCombinedScore();
    }

    findCombinedScore() {
        this.combinedScore = this.filteredRows.reduce((prev, curr) => prev + curr.score, 0);
    }
}
