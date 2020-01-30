import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { environment } from 'src/environments/environment';
import { GlobalService } from 'src/app/services/global.service';
import { AlertType } from 'src/app/classes/alert-type';
@Component({
  selector: 'app-workflow-dashboard',
  templateUrl: './workflow-dashboard.component.html',
  styleUrls: ['./workflow-dashboard.component.css']
})
export class WorkflowDashboardComponent implements OnInit {

  statusOptions = ['NEW', 'HALFWAY', 'COMPLETED'];
  selectedStatus = 'NEW';
  rows = [];
  workflows = [];
  showingRow;
  constructor(private _api: ApiService, private _global: GlobalService) {
    this.loadWorkflows();
  }

  ngOnInit() {
  }

  async manualFinish(row) {
    if (confirm('Are you sure you want to manually mark this workflow as finished?')) {
      console.log(row);
      row.workflow.blocks.map(each => {
        if (!each.executions) {
          each.executions = [{ status: 200 }]
        }
        else {
          each.executions.push({ status: 200 })
        }
      }

      );
      try {
        const result = await this._api.patch(environment.qmenuApiUrl + 'generic?resource=workflow', [{
          old: { _id: row.workflow._id },
          new: row.workflow
        }]).toPromise();
        this._global.publishAlert(AlertType.Success, 'Success');
        // remove the row form rows!
        this.workflows = this.workflows.filter(wf => wf._id !== row.workflow._id);
        this.changeFilter();
      } catch (error) {
        this._global.publishAlert(AlertType.Danger, JSON.stringify(error));
      }
    }
  }
  async changeFilter() {
    this.rows = this.workflows.filter(wf => {
      const blocks = wf.blocks || [];
      const flows = wf.flows || [];
      const leafBlocks = blocks.filter(b => !flows.some(f => f.from === b.id));
      switch (this.selectedStatus) {
        case 'NEW':
          return blocks.every(b => (b.executions || []).length === 0);
        case 'HALFWAY':
          // some leaf block is not yet completed or executed
          const someLeafNotCompleted = leafBlocks.some(b => (b.executions || []).length === 0 || b.executions[b.executions.length - 1].status !== 200);
          const started = blocks.some(b => (b.executions || []).length > 0);
          return started && someLeafNotCompleted;

        case 'COMPLETED':
          // completed: every leaf block's last execution is 200
          return leafBlocks.every(b => (b.executions || []).length > 0 && b.executions[b.executions.length - 1].status === 200);
        default:
          return true;
      }
    }).map(wf => ({
      workflow: wf
    }));

    this.computeRowStatuses();
  }


  async loadWorkflows() {
    const workflows = await this._api.get(environment.qmenuApiUrl + 'generic', {
      query: {},
      resource: 'workflow',
      projection: {
        id: 1,
        name: 1,
        inputs: 1,
        "blocks.id": 1,
        "blocks.name": 1,
        "blocks.type": 1,
        "blocks.executions.status": 1,
        "flows.from": 1,
        "flows.to": 1,
        "flows.if": 1,
        "flows.executions.status": 1,
        createdAt: 1
      },
      limit: 8000
    }).toPromise();
    workflows.sort((w1, w2) => (w2.createdAt || 0) - (w1.createdAt || 0));
    this.workflows = workflows;
    this.changeFilter();

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

  async consoleOut(taskRow) {
    await this.refresh(taskRow);
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
    await this.refresh(row);
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
    const workflowId = row.workflow._id;
    const detailedWorkflow = (await this._api.get(environment.qmenuApiUrl + 'generic', {
      query: {
        _id: { $oid: row.workflow._id }
      },
      resource: 'workflow',
      limit: 1
    }).toPromise())[0];

    // replace blocks and flows contents!
    this.workflows.map(wf => {
      if (wf._id === workflowId) {
        (wf.blocks || []).map((b, index) => {
          Object.assign(b, detailedWorkflow.blocks[index]);
        });
        (wf.flows || []).map((f, index) => {
          Object.assign(f, detailedWorkflow.flows[index]);
        });
      }
    });
    this.computeRowStatuses();
    return row;

  }


  async remove(row) {
    if (confirm('Are you sure to delete the workflow?')) {
      try {
        const result = await this._api.delete(environment.qmenuApiUrl + 'generic', {
          resource: 'workflow',
          ids: [row.workflow._id]
        }).toPromise();
        this._global.publishAlert(AlertType.Success, 'Success');
        // remove the row form rows!
        this.workflows = this.workflows.filter(wf => wf._id !== row.workflow._id);
        this.changeFilter();
      } catch (error) {
        this._global.publishAlert(AlertType.Danger, JSON.stringify(error));
      }
    }
  }
}
