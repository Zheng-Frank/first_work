import { Component, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { FormEvent } from '@qmenu/ui';
import { ModalComponent } from "@qmenu/ui/bundles/qmenu-ui.umd";


@Component({
  selector: 'app-routine-list',
  templateUrl: './routine-list.component.html',
  styleUrls: ['./routine-list.component.css']
})
export class RoutineListComponent {
  constructor() { }

  @Input() routineList = [];
  @Input() user;
  // fullDisplayMode - if false, only shows routine name and the report button. If true, shows more detail and allows editing. 
  @Input() fullDisplayMode = false;
  @Input() instanceList = [];

  @Output() sendReport = new EventEmitter();
  @Output() editRoutine = new EventEmitter();

  @ViewChild('routineReportModal') routineReportModal: ModalComponent;

  routineInReporting;

  routineInstanceResults;
  routineInstanceFieldDescriptors = [];

  instanceColumnDesciptors = [
    {
      label: 'Number'
    },
  ]

  simpleColumnDescriptors = [
    {
      label: 'Number'
    },
    {
      label: "Routine Name",
      paths: ['name'],
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },
    {
      label: "Report"
    },
  ];

  fullColumnDescriptors = [
    {
      label: 'Number'
    },
    {
      label: "Routine Name",
      paths: ['name'],
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },
    {
      label: "Recurrence",
      paths: ['recurrence'],
      sort: (a, b) => a.valueOf() - b.valueOf()
    },
    {
      label: "Created At",
      paths: ['createdAt'],
      sort: (a, b) => a.valueOf() - b.valueOf()
    },
    {
      label: "Version",
      paths: ['version']
    },
    {
      label: "Assignees",
    },
    {
      label: "Metrics",
    },
    {
      label: "",
    }
  ];

  displayRecurrenceInHours(rec) { // input: period of time, represented in ms --> output: that period of time, represented in hrs
    return rec / (3600000);
  }

  createReport(routine) {
    this.routineInReporting = routine;
    this.routineInstanceResults = {};

    // build dynamic field descriptors by using metrics!

    this.routineInstanceFieldDescriptors = (routine.metrics || []).map(metric => {
      const required = true;
      const field = metric.name;
      const label = metric.name;
      const type = metric.type || 'string';
      const values = metric.values || [];
      let inputType;
      let items;
      if (values.length > 0) {
        // this is the case we have enumerations => use single select!
        inputType = 'single-select';
        items = values.map(v => ({
          object: v,
          text: v,
          selected: false
        }));
      } else {
        inputType = type === 'number' ? 'number' : 'text';
      }

      return {
        required,
        field,
        label,
        inputType,
        items
      };
    });

    this.routineReportModal.show()
  }

  isAssignedToMe(routine) {
    return (routine.assignees || []).includes(this.user.username);
  }

  edit(routine) {
    this.editRoutine.emit(routine);
  }

  async submitReport(formEvent: FormEvent) {
    const resultArray = Object.keys(this.routineInstanceResults).map(key => ({
      name: key,
      result: this.routineInstanceResults[key]
    }));

    const routineInstance = {
      routineId: this.routineInReporting._id,
      assignee: this.user.username,
      results: resultArray
    }

    this.sendReport.emit(routineInstance);
    this.routineReportModal.hide();
    formEvent.acknowledge(null);
  }

  isOverdue(routine) {
    const applicableInstances = (this.instanceList || [])
      .filter(ri => ri.routineId === routine._id);
    if (applicableInstances.length) {
      applicableInstances.sort((b, a) => new Date(a.createdAt).valueOf() - new Date(b.createdAt).valueOf());
      return new Date().valueOf() - new Date(applicableInstances[0].createdAt).valueOf() > routine.recurrence;
    } else {
      return true; // this implies that if a routine has never been submitted, we consider it overdue
    }
  }
}
