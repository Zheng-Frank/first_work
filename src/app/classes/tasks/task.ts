/**
 * @desc A task ideally is the smallest unit of work to be performed. 
 * 
 */
import { Action } from './action';
import { ApiService } from '../../services/api.service';
import { environment } from "../../../environments/environment";
import { Observable } from 'rxjs';
import { User } from '../user';

export class Task {
    _id: string;
    name: string;
    description: string;
    assignee: string;
    roles: string[] = [];

    scheduledAt: Date;
    
    result: 'CLOSED' | 'CANCELED';
    resultAt: Date;

    // actions: Action[] = [];

    // won't be enabled unless all prerequisites are successfully CLOSED!
    prerequisiteTaskIds;

    score: number;
    
    relatedMap: any;   // {gmbBizId: xxxx, gmbRequestId: xxxx, ....}

    
    comments: string;
    
    createdAt: Date;

    constructor(task?: any) {
        if (task) {
            Object.keys(task).map(k => this[k] = task[k]);
        }
        ['scheduledAt', 'resultAt', 'createdAt', 'updatedAt'].map(dateField => {
            if (this[dateField]) {
                this[dateField] = new Date((Date.parse(this[dateField])));
            }
        });
    }

    getStatus() {
        return this.result || (this.assignee ? 'ASSIGNED' : 'OPEN');
    }

    getBuiltInActions(user: User): Action[] {
        const username = user.username;
        const roles = user.roles || [];
        const actions = [];
        // can claim if not finished, in role, not assigned
        if (!this.result && !this.assignee && this.roles.some(r => roles.indexOf(r) >= 0)) {
            actions.push(new Action({
                name: 'Assign to Me',
                confirmationText: 'Assign this task to me.',
                requiredRoles: this.roles
            }));
        }

        // can close or cancel if assigned to me but not yet finished or in my role
        if (!this.result && this.assignee === username) {

            actions.push(new Action({
                name: 'Release',
                confirmationText: 'Release this task back to unassigned list.',
                requiredRoles: this.roles,
                paramsObj: {
                    field: 'assignee',
                    value: undefined
                }
            }));

            actions.push(new Action({
                name: 'Update',
                requiredRoles: this.roles
            }));

            actions.push(new Action({
                name: 'Close',
                requiredRoles: this.roles,
                paramsObj: {
                    field: 'result',
                    value: 'CLOSED'
                }
            }));
        }
        return actions;
    }
}
