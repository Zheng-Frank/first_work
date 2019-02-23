import { Component, OnInit, Input, Output, ViewChild, EventEmitter } from '@angular/core';
import { Task } from '../../../classes/tasks/task';
import { User } from '../../../classes/user';
import { ModalComponent } from "@qmenu/ui/bundles/qmenu-ui.umd";
import { Action } from '../../../classes/tasks/action';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { GlobalService } from '../../../services/global.service';
import { AlertType } from '../../../classes/alert-type';



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
  assigneeList;

  constructor(private _global: GlobalService, private _api: ApiService) { }

  async ngOnInit() {
  }

  async act(event) {
    this.activeAction = event;
    this.taskActionerModal.show();
    //console.log('Act calling');
    this.assigneeList = await this._global.getCachedUserList();
  }

  cancelAction(event) {
    this.activeAction = undefined;
    this.taskActionerModal.hide();
  }

  finishAction(event) {
    this.actionDone.emit({
      task: event,
      action: this.activeAction
    });
    this.taskActionerModal.hide();
    this.activeAction = undefined;
  }



}
