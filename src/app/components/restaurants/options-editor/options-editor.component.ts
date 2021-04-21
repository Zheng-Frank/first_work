/* ElementRef must be present for ngOnChanges to work! */
import { Component, OnInit, Input, OnChanges } from '@angular/core';
import { FormControl } from '@angular/forms';
import {Item} from '@qmenu/ui';


@Component({
  selector: 'app-options-editor',
  templateUrl: './options-editor.component.html',
  styleUrls: ['./options-editor.component.css']
})
export class OptionsEditorComponent implements OnInit, OnChanges {

  @Input() options: Item[] = [];
  @Input() priceRequired: boolean = false;
  @Input() itemPlaceHolderString: string;
  @Input() pricePlaceHolderString: string;
  @Input() suggestions: string[] = ['a', 'b', 'c'];
  uniqueId: string;

  nameBox = new FormControl('', []);

  constructor() {
    // a 'good' enough random id
    this.uniqueId = 'id-' + Math.floor(Math.random() * (1000000));
  }
  ngOnInit() {
  }

  ngOnChanges(d) {

    // insert empty field at end of the list. use timeout otherwise checked error (changed)
    setTimeout(() => {
      this.options = this.options || [];
      if (this.options.length === 0 || this.options[this.options.length - 1].name) {
        this.options.push(new Item());
      }
    }, 0);
  }

  optionChanged(changedOption: Item) {
    let index = this.options.indexOf(changedOption);

    // if it's not the last option and its name's empty, then delete it!
    if (index >= 0 && !changedOption.name && index < this.options.length - 1) {
      this.options.splice(index, 1);
    }

    // if it's the last item and name is not empty, we add an extra line
    if (this.options[this.options.length - 1].name) {
      this.options.push(new Item());
    }
  }

  // getUsedSuggestions(options: Item[]) {
  //   return options.map(o => o.name);
  // }
  // getNonUsedSuggestions(allSuggestions: string[], usedSuggestions: string[]): string[] {
  //   if (allSuggestions) {
  //     return allSuggestions.filter(n => usedSuggestions.indexOf(n) < 0);
  //   }
  //   return [];
  // }
  isPriceValid(option: Item) {
    if (this.priceRequired && option.name) {
      return +option.price > 0;
    }
    return !option.price || (+option.price) >= 0;
  }
}
