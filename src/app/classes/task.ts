/**
 * @desc A task ideally is the smallest unit of work to be performed. 
 * 
 */
import { Action } from './action';
import { ActionCancel } from './action-cancel';
import { ActionClaim } from './action-claim';
import { ActionClose } from './action-close';

export class Task {
    id: string;
    name: string;
    description: string;
    assignee: string;
    roles: string[] = [];
    viewers: string[];

    result: 'CLOSED' | 'CANCELED';

    // actions: Action[] = [];

    // won't be enabled unless all prerequisites are successfully CLOSED!
    prerequisiteTaskIds;

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
            actions.push(new ActionClaim({
                name: 'Claim',
                confirmationText: 'This will assign you to the task',
                requiredRoles: this.roles
            }));
        }

        // can close or cancel if assigned to me but not yet finished or in my role
        if (!this.result && (this.assignee === username || (!this.assignee && this.roles.some(r => roles.indexOf(r) >= 0)))) {
            actions.push(new ActionClose({
                name: 'Close',
                confirmationText: 'This will close the task',
                requiredRoles: this.roles
            }));

            actions.push(new ActionCancel({
                name: 'Cancel',
                confirmationText: 'This will cancel the task',
                requiredRoles: this.roles
            }));
        }

        return actions;
    }
}
