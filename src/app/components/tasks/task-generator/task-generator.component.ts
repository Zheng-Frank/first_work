import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { Task } from '../../../classes/tasks/task';

@Component({
  selector: 'app-task-generator',
  templateUrl: './task-generator.component.html',
  styleUrls: ['./task-generator.component.css']
})
export class TaskGeneratorComponent implements OnInit {
  @Output() submit = new EventEmitter<Task>();

  obj = {} as any;
  constructor() { }
  ngOnInit() {
  }

}
