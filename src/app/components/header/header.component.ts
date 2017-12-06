import { Component, OnInit, Input, Output } from '@angular/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  @Input() brandLogo;
  @Input() brandName;
  @Input() menuItems = []; // {name: 'A', href: '#/a', fa: 'car'}
  @Input() rightItem = null; // {name: 'A', href: '#/a', fa: 'car'}
  
  constructor() { }

  ngOnInit() {
  }

}
