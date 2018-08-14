import { Action } from "./action";
import { Task } from "./task";
import { ApiService } from "../../services/api.service";
import { environment } from '../../../environments/environment';
import { mergeMap } from "rxjs/operators";
export class ActionGeneric extends Action {
    constructor(action: any) {
        super(action);
    }
    perform(task: Task, api: ApiService) {
        if (!this.paramsObj || !this.paramsObj.field) {
            return Promise.reject('Missing field to update.');
        }
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
                if (tasks.length === 0) {
                    throw 'No task found.';
                } else {
                    const oldTask = JSON.parse(JSON.stringify(task));
                    updatedTask = JSON.parse(JSON.stringify(task));
                    updatedTask[this.paramsObj.field] = this.paramsObj.value;
                    if (this.paramsObj.field === 'result') {
                        updatedTask.resultAt = { $date: new Date() };
                    }
                    return api.patch(environment.adminApiUrl + "generic?resource=task", [{ old: oldTask, new: updatedTask }]);
                }
            })).subscribe(patched => {
                // revert resultAt back to normal date
                if (updatedTask.resultAt) {
                    updatedTask.resultAt = updatedTask.resultAt['$date'] || updatedTask.resultAt;
                }
                resolve(new Task(updatedTask));
            }, error => {
                reject(error);
            });
        });

    }
}
