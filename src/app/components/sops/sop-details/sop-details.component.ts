import { Component, OnInit, ViewChild } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { environment } from 'src/environments/environment';
import { GlobalService } from 'src/app/services/global.service';
import { AlertType } from 'src/app/classes/alert-type';
import { ModalComponent } from "@qmenu/ui/bundles/qmenu-ui.umd";
import { PrunedPatchService } from 'src/app/services/prunedPatch.service';
import { ActivatedRoute } from '@angular/router';
@Component({
  selector: 'app-sop-details',
  templateUrl: './sop-details.component.html',
  styleUrls: ['./sop-details.component.css']
})
export class SopDetailsComponent implements OnInit {
  @ViewChild('updateModal') updateModal: ModalComponent;

  apiLoading = false;
  sopInstances = [];

  sop = {};
  links = [];
  nodes = [];

  instanceInEditing;
  fieldDescriptors = [];
  editingNodes = [];
  editingLinks = [];



  constructor(private _route: ActivatedRoute, private _api: ApiService, private _global: GlobalService, private _prunedPatch: PrunedPatchService) {

  }
  async ngOnInit() {
    await this.populate();
  }


  private getReadyToExecuteBlocks(instance) {
    const blocks = instance.sop.blocks;

    this.fieldDescriptors = [];
    // get a list of enabled blocks
    const dependencyDict = {};
    blocks.map(b => {
      (b.to || []).map(toId => {
        dependencyDict[toId] = dependencyDict[toId] || [];
        dependencyDict[toId].push(b);
      });
    });

    const readyToExecuteBlocks = blocks.filter(b => {
      if (b.starting && !b.executions) {
        return true;
      }
      // theory: if my execution count is 1 less than each count of every dependency's execution count, then we are ready to start! 
      const myExecutionCount = (b.executions || []).length;
      const dependentBlocks = dependencyDict[b.id] || [];
      if (b.starting) {
        // push a fake starter block
        dependentBlocks.push({
          executions: [{ startedAt: new Date(), endedAt: new Date() }]
        });
      }

      if (b.if) {
        // explicitly specified how to trigger
        throw "NOT YET IMPLEMENTED";
      } else {
        // default: when ALL dependencies's latest execution is done
        // it should never be more than dependencies
        const everyDependencyDone = dependentBlocks.every(db => (db.executions || []).length > 0 && db.executions[0].endedAt);
        const maxExecutionCount = Math.max(...dependentBlocks.map(db => (db.executions || []).length));
        return everyDependencyDone && maxExecutionCount > myExecutionCount;
      }
    });
    return readyToExecuteBlocks;
  }

  private fillFieldDescriptors(instance) {
    const readyBlocks = this.getReadyToExecuteBlocks(instance);
    const blocks = instance.sop.blocks;
    this.fieldDescriptors = [];

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const executed = (block.executions || [])[0]
      this.fieldDescriptors.push({
        field: `sop.blocks.${i}.done`, //
        label: block.name,
        required: false,
        inputType: "checkbox",
        disabled: !readyBlocks.some(b => b === block)
      });
    }
  }

  async addNew() {
    const instance = {
      sop: this.sop,
      username: this._global.user.username
    };
    await this._api.post(environment.qmenuApiUrl + "generic?resource=sop-instance", [instance]).toPromise();
    await this.populateInstances();
  }

  edit(instance) {
    this.instanceInEditing = JSON.parse(JSON.stringify(instance));
    this.refreshPopup(this.instanceInEditing);
    this.updateModal.show();
  }

  private refreshPopup(instance) {
    const blocks = instance.sop.blocks;
    const readyBlocks = this.getReadyToExecuteBlocks(instance);
    // put in a timeout section to repaint after modal was shown
    setTimeout(_ => {
      // making links and nodes
      const links = [];
      // this.links = (sop.flows || []).map(flow => ({
      //   source: flow.from,
      //   target: flow.to,
      //   label: flow.if
      // }));

      this.editingNodes = (blocks || []).map(block => {
        const toBlocks = block.to || [];
        toBlocks.map(tbId => links.push({
          source: block.id,
          target: tbId
        }));

        const ready = readyBlocks.some(b => b === block);
        const running = block.executions && block.executions[0] && block.executions[0].startedAt && !block.executions[0].endedAt;
        const executed = block.executions && block.executions[0] && block.executions[0].startedAt && block.executions[0].endedAt;
        const executedCount = (block.executions || []).filter(exec => exec.endedAt).length;
        let color = 'lightgray';
        if (ready) {
          color = 'lightblue'
        } else if (running) {
          color = 'yellowgreen';
        } else if (executed) {
          color = 'lime';
        }

        return {
          id: block.id,
          label: `${block.name} ${executedCount > 1 ? ('x' + executedCount) : ''}`,
          color: color,
          starting: block.starting
        }
      });

      this.editingLinks = links;
    }, 200);

    this.fillFieldDescriptors(instance);

  }

  async populate() {
    await this.populateSop();
    await this.populateInstances();
  }

  async populateSop() {
    const id = this._route.snapshot.params.id;
    console.log("populate", id)
    this.apiLoading = true;
    const [sop] = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "sop",
      query: { _id: { $oid: id } },
      // projection: { name: 1 },
      limit: 1,
    }).toPromise();
    this.sop = sop;
    // making links and nodes
    const links = [];
    // this.links = (sop.flows || []).map(flow => ({
    //   source: flow.from,
    //   target: flow.to,
    //   label: flow.if
    // }));

    this.nodes = (sop.blocks || []).map(block => {
      const toBlocks = block.to || [];
      toBlocks.map(tbId => links.push({
        source: block.id,
        target: tbId
      }));
      const isStart = block.start;
      const hasExecution = block.executions && block.executions.length > 0;
      const executionStatus = hasExecution && block.executions.slice(-1)[0].status;
      let color = 'lightgray';
      if (block.starting) {
        color = 'lightblue'
      }
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
        label: `${block.name} ${block.executions && block.executions.length > 1 ? ('x' + block.executions.length) : ''}`,
        color: color,
        starting: block.starting
      }
    });

    this.links = links;
    this.apiLoading = false;
  }

  async populateInstances() {
    // get all executions
    this.apiLoading = true;
    this.sopInstances = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "sop-instance",
      query: {
        "sop._id": this.sop['_id']
      },
      // projection: { "sop._id": 1 },
      limit: 1000000,
      sort: { createdAt: -1 }
    }).toPromise();
    this.apiLoading = false;
  }

  async formSubmit(event) {
    event.acknowledge("submit")
  }

  async formDelete(event) {
    try {
      await this._api.delete(environment.qmenuApiUrl + "generic",
        {
          resource: 'sop-instance',
          ids: [this.instanceInEditing['_id']]
        }
      ).toPromise();

      this._global.publishAlert(AlertType.Success, 'Operation removed successfully');
      await this.populateInstances();

      event.acknowledge(null);
      this.updateModal.hide();
    } catch (error) {
      console.error('Error while removing chain', error);
      event.acknowledge(error);
    }
  }

  async formChange(event) {
    console.log("change", event);
    const [editedBlock] = this.instanceInEditing.sop.blocks.filter(b => b.done);
    if (editedBlock) {

      editedBlock.executions = editedBlock.executions || [];
      editedBlock.executions.push({
        startedAt: new Date(),
        endedAt: new Date(),
        result: true
      });
      delete editedBlock.done;
      this.refreshPopup(this.instanceInEditing);

      console.log("all done!");
    }
  }

  getProgress(instance) {
    
  }

}
