import { Component, OnInit, Input, Output, ViewChild, EventEmitter } from '@angular/core';
import { Task } from '../../../classes/tasks/task';
import { GlobalService } from '../../../services/global.service';
import { User } from '../../../classes/user';
import { ModalComponent } from "@qmenu/ui/bundles/qmenu-ui.umd";
import { Action } from '../../../classes/tasks/action';



@Component({
  selector: 'app-task-action-bar',
  templateUrl: './task-action-bar.component.html',
  styleUrls: ['./task-action-bar.component.css']
})
export class TaskActionBarComponent implements OnInit {
  @ViewChild('taskActionerModal') taskActionerModal: ModalComponent;
  @Input() task: Task;
  @Input() user: User;
  @Output() actionDone = new EventEmitter();

  activeAction: Action;

  constructor(private _global: GlobalService) { }

  ngOnInit() {

  }

  act(event) {
    console.log(event)
    this.activeAction = event;
    this.taskActionerModal.show();
  }

  cancelAction(event) {
    this.activeAction = undefined;
    this.taskActionerModal.hide();
  }

  finishAction(event) {
    console.log('action done!', event);
    this.actionDone.emit({
      task: event,
      action: this.activeAction
    });
    this.taskActionerModal.hide();
    this.activeAction = undefined;
  }

}
