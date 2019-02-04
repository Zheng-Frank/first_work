/**
 * @desc A task ideally is the smallest unit of work to be performed. 
 * 
 */
import { Action } from './action';
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

    etc: any;

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

            if (!this.scheduledAt) {
                this.scheduledAt = new Date();
            }

            if (task.steps) {
                this.steps = task.steps.map(step => new Step(step));
            }

            if (task.transfer) {
                this.transfer = new GmbTransfer(task.transfer);
            }

            // BAD code: very specific dates conversion
            if (task.etc && task.etc.appealedAt) {
                task.etc.appealedAt = new Date((Date.parse(task.etc.appealedAt)));
            }
        }

    }

    getStatus() {
        return this.result || (this.assignee ? 'ASSIGNED' : 'OPEN');
    }

    getActionsOnlyForAssignee(username): Action[] {
        const actions = [];
        if (this.assignee === username) {

            switch (this.name) {
                case 'Transfer GMB Ownership':
                    actions.push(new Action({
                        name: 'Transfer',
                        requiredRoles: this.roles
                    }));
                    break;
                case 'Apply GMB Ownership':
                    actions.push(new Action({
                        name: 'Apply GMB',
                        requiredRoles: this.roles
                    }));
                    break;
                case 'Appeal Suspended GMB':
                    actions.push(new Action({
                        name: 'Appeal Suspended',
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

        }

        return actions;
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

        actions.push(...this.getActionsOnlyForAssignee(user.username));
        return actions;
    }

    static predefinedTasks =
        [
            {
                name: 'Gain GMB Ownership',
                roles: ['ADMIN', 'GMB'],
                // assignee: 'ted',
                scheduledAt: new Date()
            },
            {
                name: 'Input Google PIN',
                roles: ['ADMIN', 'GMB'],
                // assignee: 'ted',
                scheduledAt: new Date()
            },
            {
                name: 'Update Menu',
                roles: ['ADMIN', 'MENU_EDITOR'],
                scheduledAt: new Date()
            },
            {
                name: 'Update Temporary Hours',
                roles: ['ADMIN', 'MENU_EDITOR'],
                scheduledAt: new Date()
            },
            {
                name: 'Resolve Billing or Invoicing',
                roles: ['ADMIN', 'ACCOUNTANT'],
                scheduledAt: new Date()
            },
            {
                name: 'Cancel qMenu Service',
                roles: ['ADMIN'],
                assignee: 'chris',
                scheduledAt: new Date()
            },
            {
                name: 'Escalade to Chris',
                roles: ['ADMIN'],
                assignee: 'chris',
                scheduledAt: new Date()
            },
            {
                name: 'Escalade to Dixon',
                roles: ['ADMIN'],
                assignee: 'dixon',
                scheduledAt: new Date()
            },
        ].sort((a, b) => a.name > b.name ? 1 : -1);

}
