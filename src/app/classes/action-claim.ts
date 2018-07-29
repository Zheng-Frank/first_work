import { Action } from "./action";
import { Task } from "./task";
import { resolve } from "q";
import { ApiService } from "../services/api.service";
import { environment } from '../../environments/environment';

export class ActionClaim extends Action {
    constructor(action: any) {
        super(action);
    }
    perform(task: Task, api: ApiService) {
        return new Promise((resolve, reject) => {
            // query the same task: if it's not there, throw error. otherwise take it
            // there is still a chance that other peole just claimed the same taks but the probability is low
            api.get(environment.qmenuApiUrl + "generic", {
                resource: "task",
                query: {
                    _id: { $oid: task.id }
                },
                limit: 1
            }).subscribe(task => {
                resolve(task);
                console.log(task)
            }, error => {
                reject(error);
            });
        });

    }
}
