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
  @Input() instanceList = [];
  @Input() routineList = [];

  groupedInstances;

  @ViewChild('routineReportModal') routineReportModal: ModalComponent;

  routineInReporting;
  resultsTable = {};

  pagination = {};

  ngOnChanges() {
    if ((this.routineList || []).length && (this.instanceList || []).length) {
      this.groupAndSortInstances()
      this.createInstanceColumnDescriptors();
      this.createResultsTable();
      this.createPaginationTable();
    }
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
      this.instanceColumnDescriptors[routine.name] = [createdAt, ...routineDescriptors];
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
