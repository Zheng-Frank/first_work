import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { environment } from '../../environments/environment';
import { GmbBiz } from '../classes/gmb/gmb-biz';
import { GmbAccount } from '../classes/gmb/gmb-account';
import { zip, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TaskService {

  constructor(private _api: ApiService) { }

  /** A gmb scan found s biz is suspended. We need to insert a new task if it's not yet in the 
   * task list (both gmbAccountId and bizId)
  */
  async upsertSuspendedTask(gmbBiz: GmbBiz, gmbAccount: GmbAccount) {
    // Query existing non-closed tasks that name is 'Appeal Suspended GMB', the gmbAccount and gmbBiz
    const results = await zip(
      this._api.get(environment.adminApiUrl + "generic", {
        resource: "task",
        query: {
          name: 'Appeal Suspended GMB',
          "relatedMap.gmbBizId": gmbBiz._id,
          "relatedMap.gmbAccountId": gmbAccount._id,
          "relatedMap.appealId": gmbBiz.appealId,
          result: null // either null or non-exist
        },
        limit: 1
      }),
      this._api.get(environment.adminApiUrl + "generic", {
        resource: "gmbBiz",
        query: { _id: { $oid: gmbBiz._id } },
        projection: {
          name: 1,
          score: 1
        },
        limit: 1
      })
    ).toPromise();

    const openTask = results[0][0];

    if (openTask) {
      return openTask;
    }

    const gmbBizWithScore: GmbBiz = results[1][0];
    
    const newTask = {
      name: 'Appeal Suspended GMB',
      relatedMap: {
        gmbBizId: gmbBiz._id,
        gmbAccountId: gmbAccount._id,
        appealId: gmbBiz.appealId
      },
      scheduledAt: {
        $date: new Date()
      },
      description: gmbBiz.name + ' @ ' + gmbAccount.email.split('@')[0],
      roles: ['GMB', 'ADMIN'],
      score: gmbBizWithScore.score
    } as any;

    // lets create the task!
    const result = await this._api.post(environment.adminApiUrl + 'generic?resource=task', [newTask]);
    newTask['_id'] = result[0];
    newTask['scheduledAt'] = new Date();
    return newTask;
  }

}
