import { AlertType } from 'src/app/classes/alert-type';
import { GlobalService } from './../../../services/global.service';
import { Input, Output, EventEmitter } from '@angular/core';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-menu-item-adjust-number',
  templateUrl: './menu-item-adjust-number.component.html',
  styleUrls: ['./menu-item-adjust-number.component.css']
})
export class MenuItemAdjustNumberComponent implements OnInit {

  @Input() items = [];
  
  @Output() adjustNumber = new EventEmitter();
  @Output() cancel = new EventEmitter();

  formatNumber = '';

  constructor(private _global: GlobalService) {
  }

  ngOnInit() {
  }

  onChange(item){
    item['beChecked'] = !item['beChecked'];
  }

  clickCancel(){
    this.cancel.emit();
  }

  clickOk(){
    if(this.formatNumber === ''){
      return this._global.publishAlert(AlertType.Danger,'Input format number error.');
    }
    let filterItems = this.items.filter(item=>item.beChecked);
    let number = Number(this.formatNumber.replace(/\W/g,''));
    let word = this.formatNumber.replace(/\D/g,'');
    console.log(number+","+word);
    filterItems.forEach(item=>{
      item.number=word+number;
      number++;
    });
    this.items = this.items.filter(item=>!item.beChecked);
    this.items = [...filterItems,this.items];
    this.adjustNumber.emit(this.items);
  }
}
