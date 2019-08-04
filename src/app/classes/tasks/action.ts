
import { Task } from "./task";
import { ApiService } from "../../services/api.service";
import { environment } from '../../../environments/environment';
import { mergeMap } from "rxjs/operators";
export class Action {
    name: string;
    requiredRoles: any[];

    prerequisites: Action[];
    confirmationText: string;
    relatedMap: any;

    constructor(action: any) {
        if (action) {
            Object.keys(action).map(k => this[k] = action[k]);
        }
    }

    // for generic perform, let's just perform update to task itself
    perform(originalTask: Task, api: ApiService, paramsObj: any) {
        if (!paramsObj) {
            console.log(originalTask);
            console.log(paramsObj);
            return Promise.reject('Missing paramsObj to update.');
        }
        return new Promise((resolve, reject) => {
            // query the same task: if it's not there, throw error. otherwise take it
            // there is still a chance that other peole just claimed the same taks but the probability is low
            api.get(environment.qmenuApiUrl + "generic", {
                resource: "task",
                query: {
                    _id: { $oid: originalTask._id }
                },
                limit: 1
            }).pipe(mergeMap(tasks => {
                if (tasks.length === 0) {
                    throw 'No task found.';
                } else {
                    const oldTask = {
                        _id: originalTask._id
                    };
                    const updatedTask = {
                        _id: originalTask._id
                    };

                    Object.keys(paramsObj).map(key => {
                        if (paramsObj[key] === undefined) {
                            oldTask[key] = originalTask[key];
                        }
                        if (originalTask[key] !== paramsObj[key]) {
                            updatedTask[key] = paramsObj[key];
                        }
                    });

                    console.log(updatedTask);

                    return api.patch(environment.qmenuApiUrl + "generic?resource=task", [{ old: oldTask, new: updatedTask }]);
                }
            })).subscribe(patched => {
                const updatedTask = new Task(originalTask);
                Object.keys(paramsObj).map(key => {
                    updatedTask[key] = paramsObj[key];
                });
                // also make $date thing back to normal!
                Object.keys(updatedTask).map(key => {
                    if (updatedTask[key] && updatedTask[key].$date) {
                        updatedTask[key] = new Date(Date.parse(updatedTask[key].$date));
                    }
                });
                resolve(updatedTask);
            }, error => {
                reject(error);
            });
        });

    }
}
