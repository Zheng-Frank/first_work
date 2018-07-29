import { Task } from "./task";
import { ApiService } from "../services/api.service";

/**
 * @desc An action is performed on a task, causing changes of the task 
 * 
 */
export abstract class Action {
    name: string;
    confirmationText: string;
    requiredRoles: any[];
    prerequisites: Action[];
    username: string;
    comments: string;
    constructor(action: any) {
        if (action) {
            Object.keys(action).map(k => this[k] = action[k]);
        }
    }
    abstract perform(task: Task, api: ApiService) : Promise<any>;
}
