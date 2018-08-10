/**
 * @desc A task ideally is the smallest unit of work to be performed. 
 * 
 */
import { Action } from './action';
import { ActionCancel } from './action-cancel';
import { ActionAssign } from './action-assign';
import { ActionClose } from './action-close';
import { ApiService } from '../../services/api.service';
import { environment } from "../../../environments/environment";
import { Observable } from 'rxjs';

export class Task {
    _id: string;
    name: string;
    description: string;
    assignee: string;
    roles: string[] = [];
    viewers: string[];

    result: 'CLOSED' | 'CANCELED';

    // actions: Action[] = [];

    // won't be enabled unless all prerequisites are successfully CLOSED!
    prerequisiteTaskIds;

    priority: number = 0;

    createdAt: Date;

    constructor(task?: any) {
        if (task) {
            Object.keys(task).map(k => this[k] = task[k]);
        }
        // this.actions = (this.actions || []).map(a => new Action(a));
    }

    getStatus() {
        return this.result || (this.assignee ? 'ASSIGNED' : 'OPEN');
    }

    getBuiltInActions(username, roles): Action[] {
        const actions = [];
        // can claim if not finished, in role, not assigned
        if (!this.result && !this.assignee && this.roles.some(r => roles.indexOf(r) >= 0)) {
            actions.push(new ActionAssign({
                name: 'Assign to Me',
                confirmationText: 'The task will be assigned to me.',
                requiredRoles: this.roles
            }));
        }

        // can close or cancel if assigned to me but not yet finished or in my role
        if (!this.result && this.assignee === username ) {
            actions.push(new ActionClose({
                name: 'Close',
                confirmationText: 'This will close the task.',
                requiredRoles: this.roles
            }));

            actions.push(new ActionCancel({
                name: 'Cancel',
                confirmationText: 'This will cancel the task.',
                requiredRoles: this.roles
            }));
        }
        return actions;
    }

    static generate(task, api: ApiService): Observable<any> {
        return api.post(environment.adminApiUrl + 'generic?resource=task', [task]);
    }
}
