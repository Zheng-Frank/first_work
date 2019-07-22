import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { environment } from 'src/environments/environment';
import { GlobalService } from 'src/app/services/global.service';
import { AlertType } from 'src/app/classes/alert-type';
@Component({
  selector: 'app-automation-dashboard2',
  templateUrl: './automation-dashboard2.component.html',
  styleUrls: ['./automation-dashboard2.component.css']
})
export class AutomationDashboard2Component implements OnInit {

  rows = [];
  constructor(private _api: ApiService, private _global: GlobalService) {
    this.loadWorkflows();
  }

  ngOnInit() {
  }

  async loadWorkflows() {
    const workflows = await this._api.get(environment.qmenuApiUrl + 'generic', {
      query: {},
      resource: 'workflow',
      limit: 8000
    }).toPromise();
    workflows.sort((w1, w2) => (w2.createdAt || 0) - (w1.createdAt || 0));
    this.rows = workflows.map(wf => ({
      workflow: wf
    }));

    this.computeRowStatuses();

  }

  computeRowStatuses() {

    this.rows = this.rows.map(row => {

      const wf = row.workflow;
      const links = (wf.flows || []).map(flow => ({
        source: flow.from,
        target: flow.to,
        label: flow.if
      }));

      const nodes = (wf.blocks || []).map(block => {
        const hasExecution = block.executions && block.executions.length > 0;
        const executionStatus = hasExecution && block.executions.slice(-1)[0].status;
        let color = 'lightgray';
        if (hasExecution) {
          switch (executionStatus) {
            case 200:
              color = 'lime';
              break;
            case undefined:
              color = 'yellowgreen';
              break;
            default:
              color = 'pink'
              break;
          }
        }
        return {
          id: block.id,
          label: `${block.id}: ${block.name} ${block.executions && block.executions.length > 1 ? ('x' + block.executions.length) : ''}`,
          color: color,
          isDecider: block.type === 'DECIDER'
        }
      });

      const canStart = !(wf.blocks || []).some(block => block.executions && block.executions.length > 0);

      // resume: 1. nothing is running, 2. there is an error in last execution of some blocks
      const running = (wf.blocks || []).some(block => (block.executions || []).some(execution => !execution.status));
      const hasLastErrorExecutions = (wf.blocks || []).map(block => (block.executions || []).slice(-1)[0]).filter(exe => exe).some(exe => exe.status !== 200);
      const canRetry = !running && hasLastErrorExecutions;
      const canReload = running;

      return {
        workflow: wf,
        links: links,
        nodes: nodes,
        canStart: canStart,
        canRetry: canRetry,
        canReload: canReload
      }
    });

  }

  consoleOut(taskRow) {
    console.log(taskRow.workflow);
    this._global.publishAlert(AlertType.Info, 'Check console for details');
  }

  async start(row) {
    row.canStart = false;
    this._api.post(environment.appApiUrl + 'workflows/events', [{
      eventType: 'pubsub-event',
      eventObj: {
        workflowId: row.workflow._id
      }
    }]).subscribe(
      response => {
        console.log('response=', response);
        setTimeout(_ => this.refresh(row), 3000);
        // let's poll every 10 seconds for one minutes
        // let counter = 0;
        // const intervalID = setInterval(async _ => {
        //   if (row.workflow.blocks.some(b => !b.executions || b.executions.length === 0 || b.executions.some(exec => !exec.status))) {
        //     await this.refresh(row);
        //   }
        //   if (++counter === 7) {
        //     clearInterval(intervalID);
        //   }
        // }, 10000);
      },
      error => {
        this._global.publishAlert(AlertType.Danger, 'Error: ' + JSON.stringify(error));
        this.refresh(row);
      });

  }

  async retry(row) {
    // re-activate each executor???
    const lastFailedBlocks = row.workflow.blocks.filter(b => b.executions && b.executions.length > 0 && b.executions.slice(-1)[0].status && b.executions.slice(-1)[0].status !== 200);
    // post a new execution events!
    if (lastFailedBlocks.length > 0) {

      const getInputsOfBlock = function (blockId, workflow) {

        const block = workflow.blocks.filter(b => b.id === blockId)[0];

        // 0. carry all inputs from workflow itself
        const allInputs = { ...workflow.inputs || {} };

        const inflows = (workflow.flows || []).filter(flow => flow.to === blockId);
        // order inflow by last execution
        const sortedTimedInflows = inflows.filter(flow => flow.executions && flow.executions.length > 0).map(flow => ({
          time: flow.executions.slice(-1)[0].end,
          flow: flow
        })).sort((f1, f2) => f1.time - f2.time);

        // 1. carry inputs from previous results
        sortedTimedInflows.map(f => {
          const inputs = f.flow.executions.slice(-1)[0].inputs || {};
          Object.assign(allInputs, inputs);
        });

        // 2. get current block's inputs
        Object.assign(allInputs, block.inputs || {});

        // 3. lastly, inject explicitly defined carried outputs

        sortedTimedInflows.map(f => {
          const outputs = f.flow.executions.slice(-1)[0].outputs || {};
          Object.assign(allInputs, outputs);
        });

        return allInputs;
      }

      const postBody = lastFailedBlocks.map(b => ({
        eventType: 'executor-event',
        eventObj: {
          name: b.name,
          inputs: getInputsOfBlock(b.id, row.workflow),
          workflowId: row.workflow._id,
          executorId: b.id,
          executionId: new Date().valueOf().toString(),
          isRetry: true
        }
      }));
      console.log(lastFailedBlocks);
      console.log(postBody);
      const result = await this._api.post(environment.appApiUrl + 'workflows/events', postBody).toPromise();

    }

  }

  async stop(row) {
    // making sure it's not running!
    this.refresh(row);

    const executions = row.task.executions || [];

    const lastExecution = executions.slice(-1)[0];
    if (!lastExecution || !lastExecution.running) {
      this._global.publishAlert(AlertType.Info, 'No running execution found');
      return;
    }

    // emulate running
    setTimeout(async () => {
      lastExecution.running = false;
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=task', [{
        old: {
          _id: row.task._id
        },
        new: {
          _id: row.task._id,
          executions: executions
        }
      }]).toPromise();
    }, 0);

    // call run and refresh
    setTimeout(() => {
      this.refresh(row);
    }, 1000);
  }

  async refresh(row) {
    const workflowFromDb = (await this._api.get(environment.qmenuApiUrl + 'generic', {
      query: {
        _id: { $oid: row.workflow._id }
      },
      resource: 'workflow',
      limit: 1
    }).toPromise())[0];
    if (workflowFromDb) {
      for (let i = 0; i < this.rows.length; i++) {
        if (this.rows[i].workflow._id === workflowFromDb._id) {
          this.rows[i].workflow = workflowFromDb;
        }
      }
    }

    this.computeRowStatuses();
    return row;
  }

}
