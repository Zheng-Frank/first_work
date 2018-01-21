import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  @Input() brandLogo;
  @Input() brandName;
  @Input() menuItems = []; // [{name: 'A', href: '#/a', fa: 'car'}, ..]
  @Input() user = null; //
  @Output() logout = new EventEmitter(); //

  toggle = false;
  constructor() { }

  ngOnInit() {
  }

  clickLogout() {
    this.toggle = false;
    this.logout.emit();
  }

  clickItem() {
    this.toggle = false;
  }

  isActive(menu) {
    return location.href.indexOf(menu.href) >= 0;
  }
}
