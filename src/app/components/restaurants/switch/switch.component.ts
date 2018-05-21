import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-switch',
  templateUrl: './switch.component.html',
  styleUrls: ['./switch.component.css']
})
export class SwitchComponent implements OnInit {

  @Input() values: string[] = ['Available', 'Not Available'];
  @Input() selectedValue: string = 'No';
  @Output() onSelectValue = new EventEmitter();
  constructor() { }

  ngOnInit() {
  }

  select(index) {
    this.selectedValue = this.values[index];
    this.onSelectValue.emit(this.selectedValue);
  }

}
