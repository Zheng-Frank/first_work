import { Component, Input, ViewChild, OnChanges } from '@angular/core';
import { ModalComponent } from "@qmenu/ui/bundles/qmenu-ui.umd";


@Component({
  selector: 'app-routine-instance-list',
  templateUrl: './routine-instance-list.component.html',
  styleUrls: ['./routine-instance-list.component.css']
})
export class RoutineInstanceListComponent implements OnChanges {
  constructor() { }
  // fullDisplayMode - if false, only shows routine name and the report button. If true, shows more detail and allows editing. 
  @Input() fullDisplayMode = false;
  @Input() fullDisplayModeAndShowAll = false;
  @Input() instanceList = [];
  @Input() routineList = [];

  groupedInstances;

  @ViewChild('routineReportModal') routineReportModal: ModalComponent;

  routineInReporting;
  resultsTable = {};
  allInstanceList = [];// if display full mode and show all, then use it to show all routine instances. 

  pagination = {};

  ngOnChanges() {
    if ((this.routineList || []).length && (this.instanceList || []).length) {
      if (this.fullDisplayModeAndShowAll) {
        this.createTableDescAndDataOfAll();
      } else {
        this.groupAndSortInstances()
        this.createInstanceColumnDescriptors();
        this.createResultsTable();
        this.createPaginationTable();
      }
    }
  }

  createTableDescAndDataOfAll(){
    this.allInstanceList = [];
    this.resultsTable = {};
    // 1. create table description
    const createdAt =
    {
      label: 'Created At',
      paths: ['createdAt'],
      sort: (a, b) => new Date(a).valueOf() - new Date(b).valueOf()
    };
    const username = {
      label: 'Username',
      paths: ['assignee'],
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    };
    const routineType = {
      label: 'Routine Type'
    }
    const routineDescriptors = [];
    this.routineList.forEach(routine => {
      routine.metrics.forEach(metric => {
        if(!routineDescriptors.some(desc=>desc.label === metric.name)){
          routineDescriptors.push({
            label: metric.name,
          })
        }
      });
    });
    this.fullDisplayInstanceColumnDescriptors = [createdAt, username, routineType, ...routineDescriptors];
    // 2. create table datas
    this.instanceList.forEach(inst => {
      const instanceData = {
        _id: inst._id,
        createdAt: inst.createdAt,
        assignee: inst.assignee
      };
      instanceData['Routine Type'] = (this.routineList.find(r=>r._id === inst.routineId)||{}).name || 'None';
      (inst.results || []).forEach(res => {
        instanceData[res.name] = res.result
      })
      this.allInstanceList.push(instanceData);
      this.resultsTable[inst._id] = instanceData;
    });
  }

  columnDescriptors = [
    {
      label: "Routine Name",
      paths: ['name'],
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },
    {
      label: "Instance Data"
    }
  ];

  instanceColumnDescriptors = {};

  fullDisplayInstanceColumnDescriptors = {};

  displayRecurrenceInHours(rec) { // input: period of time, represented in ms --> output: that period of time, represented in hrs
    return rec / (3600000);
  }

  groupAndSortInstances() {
    this.groupedInstances = this.routineList.reduce((dict, routine) => {
      dict[routine._id] = this.instanceList.filter(inst => inst.routineId === routine._id).sort((a, b) => new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf());
      return dict;
    }, {});
  }

  createInstanceColumnDescriptors() {
    const number = {
      label: 'Number'
    }
    const createdAt =
    {
      label: 'Created At',
      paths: ['createdAt'],
      sort: (a, b) => new Date(a).valueOf() - new Date(b).valueOf()
    };
    const username = {
      label: 'Username',
      paths: ['assignee'],
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    };

    this.routineList.forEach(routine => {
      const routineDescriptors = [];
      routine.metrics.forEach(metric => {
        routineDescriptors.push({
          label: metric.name,
        })
      });
      this.instanceColumnDescriptors[routine.name] = [number, createdAt, ...routineDescriptors];
      this.fullDisplayInstanceColumnDescriptors[routine.name] = [createdAt, username, ...routineDescriptors];
    });
  }

  createResultsTable() {
    this.instanceList.forEach(inst => {
      const instanceData = {};
      (inst.results || []).forEach(res => {
        instanceData[res.name] = res.result
      })
      this.resultsTable[inst._id] = instanceData;
    });
  }

  createPaginationTable() {
    this.routineList.forEach(routine => {
      this.pagination[routine._id] = true;
    });
  }

  togglePagination(routineId) {
    this.pagination[routineId] = !this.pagination[routineId];
  }
}
