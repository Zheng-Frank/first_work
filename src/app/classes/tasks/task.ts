/**
 * @desc A task ideally is the smallest unit of work to be performed. 
 * 
 */
import { Action } from './action';
import { ApiService } from '../../services/api.service';
import { environment } from "../../../environments/environment";
import { Observable } from 'rxjs';
import { User } from '../user';
import { Step } from './step';
import { GmbTransfer } from '../gmb/gmb-transfer';

export class Task {
    _id: string;
    name: string;
    description: string;
    assignee: string;
    roles: string[] = [];

    scheduledAt: Date;

    result: 'CLOSED' | 'CANCELED';
    resultAt: Date;

    steps: Step[];

    // won't be enabled unless all prerequisites are successfully CLOSED!
    prerequisiteTaskIds;

    score: number;

    relatedMap: any;   // {gmbBizId: xxxx, gmbRequestId: xxxx, ....}

    transfer: GmbTransfer; // this should not be here! but for temp tasks, let's attach this 

    comments: string;

    createdAt: Date;

    constructor(task?: any) {
        if (task) {
            Object.keys(task).map(k => this[k] = task[k]);

            ['scheduledAt', 'resultAt', 'createdAt', 'updatedAt'].map(dateField => {
                if (this[dateField]) {
                    this[dateField] = new Date((Date.parse(this[dateField])));
                }
            });

            if (task.steps) {
                this.steps = task.steps.map(step => new Step(step));
            }

            if (task.transfer) {
                this.transfer = new GmbTransfer(task.transfer);
            }
        }

    }

    getStatus() {
        return this.result || (this.assignee ? 'ASSIGNED' : 'OPEN');
    }

    getActions(user: User): Action[] {
        const username = user.username;
        const roles = user.roles || [];
        const actions = [];
        // can claim if not finished, in role, not assigned
        if (!this.result && !this.assignee && this.roles.some(r => roles.indexOf(r) >= 0)) {
            actions.push(new Action({
                name: 'Claim',
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
        }

        if (this.assignee === username) {

            switch (this.name) {
                case 'Transfer GMB Ownership':
                    actions.push(new Action({
                        name: 'Transfer',
                        requiredRoles: this.roles
                    }));
                    break;
                default:
                    actions.push(new Action({
                        name: 'Update',
                        requiredRoles: this.roles
                    }));
                    break;
            }

            // actions.push(new Action({
            //     name: 'Close',
            //     requiredRoles: this.roles,
            //     paramsObj: {
            //         field: 'result',
            //         value: 'CLOSED'
            //     }
            // }));
        }
        return actions;
    }
}
