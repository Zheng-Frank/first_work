import { Component, OnInit, Input } from '@angular/core';
import { Task } from 'src/app/classes/tasks/task';

@Component({
  selector: 'app-task-bar',
  templateUrl: './task-bar.component.html',
  styleUrls: ['./task-bar.component.css']
})
export class TaskBarComponent implements OnInit {
  @Input() task: Task;
  now = new Date();
  constructor() { }

  ngOnInit() {
  }

}
