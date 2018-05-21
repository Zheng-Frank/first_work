import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-radio-group',
  templateUrl: './radio-group.component.html',
  styleUrls: ['./radio-group.component.css']
})
export class RadioGroupComponent implements OnInit {

  @Input() items = []; // [{ name: 'Pickup', value: 'PICKUP' }, { name: 'Delivery', value: 'DELIVERY' }];
  @Input() selectedValue; // if _other_, it matches everything else
  @Output() onValueChange = new EventEmitter();
  @Output() onOtherClick = new EventEmitter();
  @Input() showOther = false;
  @Input() fixed = true;
  bordered = true;
  constructor() { }

  ngOnInit() {
  }

  select(item) {
    if (this.selectedValue === item.value) {
      this.selectedValue = undefined;
    } else {
      this.selectedValue = item.value;
    }
    this.onValueChange.emit(this.selectedValue);
  }

  clickOther() {
    this.onOtherClick.emit();
  }
}
