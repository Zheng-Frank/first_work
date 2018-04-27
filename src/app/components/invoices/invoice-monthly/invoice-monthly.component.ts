import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-invoice-monthly',
  templateUrl: './invoice-monthly.component.html',
  styleUrls: ['./invoice-monthly.component.css']
})
export class InvoiceMonthlyComponent implements OnInit {
  startDatesOfEachMonth: Date[] = [];
  constructor() {
    // we start from now and back unti 10/1/2016
    let d = new Date(2016, 9, 1);
    while (d < new Date()) {
      this.startDatesOfEachMonth.unshift(new Date(d.valueOf()));
      d.setMonth(d.getMonth() + 1);
    }
  }

  ngOnInit() {
  }

}
