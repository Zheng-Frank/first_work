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

  ngOnInit() {
    // grab all users and make an assignee list!
    // get all users
    this._api
      .get(environment.adminApiUrl + "generic", {
        resource: "user",
        limit: 1000
      })
      .subscribe(
      result => {
        this.assigneeList = result.map(u => new User(u)).sort((a, b) => a.username.toLowerCase().localeCompare(b.username.toLowerCase()));
          console.log('assigneeList', this.assigneeList);
      },
      error => {
        this._global.publishAlert(
          AlertType.Danger,
          "Error pulling users from API"
        );
      }
      );
  }

  act(event) {
    this.activeAction = event;
    this.taskActionerModal.show();
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
