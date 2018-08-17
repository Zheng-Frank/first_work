import { GmbBiz } from "../gmb/gmb-biz";
import { GmbAccount } from "../gmb/gmb-account";
import { GmbRequest } from "../gmb/gmb-request";
import { Task } from "./task";

/**
 * @desc A task templates
 * 
 */

export class TaskTemplates {

    static templates = [
        {
            name: 'Request GMB Ownership',
            getTask: function (gmbBiz: GmbBiz, gmbAccount: GmbAccount, gmbRequest: GmbRequest, scheduledAt: Date) {
                return new Task({
                    name: 'Request GMB Ownership',
                    description: gmbBiz.name,
                    relatedMap: {
                        gmbBizId: gmbBiz._id,
                        gmbAccountId: gmbAccount._id,
                        gmbRequestId: (gmbRequest || {})['_id']
                    },
                    scheduledAt: scheduledAt,
                    roles: ['GMB', 'ADMIN']
                });
            }
        },
        {
            name: 'Verify GMB via Postcard',
            getTask: function (gmbBiz: GmbBiz, gmbAccount: GmbAccount, gmbRequest: GmbRequest, scheduledAt: Date) {
                return new Task({
                    name: 'Verify GMB via Postcard',
                    description: gmbBiz.name,
                    relatedMap: {
                        gmbBizId: gmbBiz._id,
                        gmbAccountId: gmbAccount._id,
                        gmbRequestId: (gmbRequest || {})['_id']
                    },
                    scheduledAt: scheduledAt,
                    roles: ['GMB', 'ADMIN']
                });
            }
        },
        {
            name: 'Invalidate GMB Request C',
            getTask: function (gmbBiz: GmbBiz, gmbAccount: GmbAccount, gmbRequest: GmbRequest, scheduledAt: Date) {
                return new Task({
                    name: 'Invalidate GMB Request C',
                    description: gmbBiz.name,
                    relatedMap: {
                        gmbBizId: gmbBiz._id,
                        gmbAccountId: gmbAccount._id,
                        gmbRequestId: (gmbRequest || {})['_id']
                    },
                    scheduledAt: scheduledAt,
                    roles: ['GMB', 'ADMIN']
                });
            }
        }

    ];
}
