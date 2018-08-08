import { Action } from "./action";
import { Task } from "./task";
import { ApiService } from "../../services/api.service";
import { environment } from '../../../environments/environment';
import { mergeMap } from "rxjs/operators";
export class ActionCancel extends Action {
    constructor(action: any) {
        super(action);
    }
    perform(task: Task, api: ApiService, paramsObj) {
        return new Promise((resolve, reject) => {
            // query the same task: if it's not there, throw error. otherwise take it
            // there is still a chance that other peole just claimed the same taks but the probability is low
            api.get(environment.adminApiUrl + "generic", {
                resource: "task",
                query: {
                    _id: { $oid: task._id }
                },
                limit: 1
            }).pipe(mergeMap(tasks => {
                if(tasks.length === 0) {
                    throw 'No task found.';
                } else {
                    const oldTask = JSON.parse(JSON.stringify(task));
                    const newTask = JSON.parse(JSON.stringify(task));
                    newTask.result = 'CANCELED';
                    return api.patch(environment.adminApiUrl + "generic?resource=task", [{ old: oldTask, new: newTask }]);
                }                
            })).subscribe(pached => {
                resolve();
            }, error => {
                reject(error);
            });
        });

    }
}

