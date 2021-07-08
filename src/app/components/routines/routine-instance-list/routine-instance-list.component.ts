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

  pagination = true;

  ngOnChanges() {
    this.groupAndSortInstances()
    this.createInstanceColumnDescriptors();
    this.createResultsTable();
    console.log(this.resultsTable)
  }

  columnDescriptors = [
    {
      label: 'Number'
    },
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
    this.groupedInstances = this.routineList.map(routine => {
      routine.instances = this.instanceList.filter(inst => inst.routineId === routine._id).sort((a, b) => new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf());
      return routine;
    });
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
      const instanceData = {}
      inst.results.forEach(res => {
        instanceData[res.name] = res.result
      })
      this.resultsTable[inst._id] = instanceData;
    });
  }

  displayStuff(p1, p2) {
    if (p1 === "60df720a5f322f680d674d50" || p1 === "60df74d15f322f680d6af516") {


      console.log('name: ', p2)
      console.log('value: ', this.resultsTable[p1][p2])
    }

  }
}
