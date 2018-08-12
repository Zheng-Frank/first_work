import { Action } from "./action";
import { Task } from "./task";
import { ApiService } from "../../services/api.service";
import { environment } from '../../../environments/environment';
import { mergeMap } from "rxjs/operators";
export class ActionRelease extends Action {
    constructor(action: any) {
        super(action);
    }
    perform(task: Task, api: ApiService) {
        return new Promise((resolve, reject) => {
            // query the same task: if it's not there, throw error. otherwise take it
            // there is still a chance that other peole just claimed the same taks but the probability is low
            let updatedTask;
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
                    updatedTask = JSON.parse(JSON.stringify(task));
                    updatedTask.assignee = undefined;

                    return api.patch(environment.adminApiUrl + "generic?resource=task", [{ old: oldTask, new: updatedTask }]);
                }                
            })).subscribe(patched => {
                resolve(new Task(updatedTask));
            }, error => {
                reject(error);
            });
        });

    }
}
