import { Component, OnInit, Input, Output, SimpleChanges, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-item-sorter',
  templateUrl: './item-sorter.component.html',
  styleUrls: ['./item-sorter.component.css']
})
export class ItemSorterComponent implements OnInit {

  @Input() items = [];
  @Input() labelField = "name";
  
  @Output() sort = new EventEmitter();
  @Output() cancel = new EventEmitter();

  sortedItems = [];
  constructor() { }

  ngOnInit() {

  }

  ngOnChanges(changes: SimpleChanges) {
    this.sortedItems = [];
    if (this.items) {
      this.sortedItems = this.items.slice();
    }
  }

  down(item) {
    const i = this.sortedItems.indexOf(item);
    if (i < this.sortedItems.length - 1) {
      this.sortedItems[i] = this.sortedItems[i + 1];
      this.sortedItems[i + 1] = item;
    }
  }
  up(item) {
    const i = this.sortedItems.indexOf(item);
    if (i > 0) {
      this.sortedItems[i] = this.sortedItems[i - 1];
      this.sortedItems[i - 1] = item;
    }
  }

  clickCancel() {
    this.cancel.emit();
  }

  clickOk() {
    this.sort.emit(this.sortedItems);
  }

}
