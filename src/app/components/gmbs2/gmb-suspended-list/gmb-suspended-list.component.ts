import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { GlobalService } from '../../../services/global.service';
import { AlertType } from '../../../classes/alert-type';

@Component({
    selector: 'app-gmb-suspended-list',
    templateUrl: './gmb-suspended-list.component.html',
    styleUrls: ['./gmb-suspended-list.component.css']
})
export class GmbSuspendedListComponent implements OnInit {

    rows = [];
    filteredRows = [];
    notShowComplete: boolean = false;
    bmRequest;
    pagination: boolean = true;
    averageRequestsPerDay = 0;
    numberOfLocations = 0;

    now = new Date();
    apiLoading = false;

    myColumnDescriptors = [
        {
            label: "Number"
        },
        {
            label: "Restaurant Name"
        },
        {
            label: "Timezone",
        },
        {
            label: "Account"
        },
        {
            label: "Suspended At",
            paths: ['lastAt'],
            sort: (a, b) => a - b
        },
        {
            label: "Score",
            paths: ['score'],
            sort: (a, b) => (a || 0) > (b || 0) ? 1 : ((a || 0) < (b || 0) ? -1 : 0)
        },
        {
            label: "Logs"
        },
        {
            label: "Action"
        }
    ];

    constructor(private _api: ApiService, private _global: GlobalService) {
        this.refresh();
        // this.test();
    }

    ngOnInit() {
    }

    async refresh() {
        this.apiLoading = false;

        try {
            const locations = await this._api.post(environment.appApiUrl + "gmb/generic", {
                name: "get-locations-status-changes",
                payload: {
                    previous: "Published",
                    current: "Suspended",
                    // account: "sz075589@gmail.com"
                }
            }).toPromise();

            const locRts = locations.map(loc => {
                const location = {
                    email: loc.email,
                    place_id: loc.place_id,
                    locationName: loc.locationName,
                    lastAt: new Date(loc.lastAt),
                    appealId: loc.appealId,
                    checker: loc.checker,
                    checkedAt: loc.checkedAt,
                    reinstateLogs: loc.reinstateLogs,
                };
                //find non disabled RT with highest score
                const selectedRt = loc.restaurants.reduce((result, rt) =>
                    !rt.disabled && rt.score > (result || { "score": -1 }).score ? rt : result
                    , null);
                if (selectedRt) {
                    Object.assign(location, selectedRt);
                }
                return location;
            });
            this.rows = locRts;
        }
        catch (error) {
            console.error(`Error. Couldn't sync GMB`, error);
            return false;
        }

        this.apiLoading = false;
        this.filter();
    }

    // Filtering
    async filter() {
        this.filteredRows = this.rows;
        if (this.notShowComplete) {
            this.filteredRows = this.filteredRows.filter(row => !row.checker && !row.checkedAt);
        }
        this.numberOfLocations = this.filteredRows.length;
    }

    async addLog(r: any, extraOps: any = []) {
        if (r.content) {
            try {
                // Copy and add the new log
                const newLog = JSON.parse(JSON.stringify(r.reinstateLogs || []));
                newLog.push({
                    user: this._global.user.username,
                    date: new Date(),
                    content: r.content
                });
                await this._api.post(environment.appApiUrl + 'gmb/generic',
                    {
                        name: "update-one-location",
                        payload: {
                            email: r.email,
                            locationName: r.locationName,
                            ops: [{ $set: { reinstateLogs: newLog } }, ...extraOps]
                        }
                    })
                    .toPromise();
                this._global.publishAlert(AlertType.Success, `Log added successfully`);
                this.rows.find(row => row.email === r.email && row.locationName === r.locationName).reinstateLogs = newLog;
                r.content = "";
            } catch (error) {
                console.error('error while adding comment.', error);
                this._global.publishAlert(AlertType.Danger, `Error while adding comment.`);
            }
        } else {
            console.error("Log cannot be blank");
            this._global.publishAlert(AlertType.Danger, `Log cannot be blank.`);
        }
    }

    // Update the database to store the completion information
    async complete(r: any) {
        if (confirm(`Are you sure to complete ${r.name ? r.name : "this restaurant"}?`)) {
            try {
                r.content = 'marked COMPLETED';
                const userName = this._global.user.username;
                const now = new Date();
                this.addLog(r, [{
                    $set: {
                        checker: userName
                    }
                },
                {
                    $set: {
                        checkedAt: now
                    }
                }
                ]);
                r.checker = userName;
                r.checkedAt = now;
            } catch (error) {
                console.error('error while marking request complete.', error);
                this._global.publishAlert(AlertType.Danger, `Error while marking request complete.`);
            }
        }
    }

    async redo(r: any) {
        if (confirm(`Are you sure to redo ${r.name ? r.name : "this restaurant"}?`)) {
            try {
                r.content = 'reverted back to INCOMPLETED';
                this.addLog(r, [{
                    $unset: {
                        checker: 0
                    }
                },
                {
                    $unset: {
                        checkedAt: 0
                    }
                }]);
                delete r.checker;
                delete r.checkedAt;
            } catch (error) {
                console.error('error while marking request incomplete.', error);
                this._global.publishAlert(AlertType.Danger, `Error while marking request incomplete.`);
            }
        }
    }

    createAngularIndentifiableArray(array) {
        if (array) {
            return Array.from(array);
        } else {
            return [];
        }
    }

}
