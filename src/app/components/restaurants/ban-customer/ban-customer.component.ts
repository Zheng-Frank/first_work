import { Component, OnInit, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-ban-customer',
  templateUrl: './ban-customer.component.html',
  styleUrls: ['./ban-customer.component.css']
})
export class BanCustomerComponent implements OnInit {
  @Output() onBan = new EventEmitter();
  @Output() onCancel = new EventEmitter();
  reasons = [
    { text: 'Used stolen credit card', selected: false },
    { text: 'Failed payment', selected: false },
    { text: 'Failed to show up', selected: false },
    { text: 'Extremely rude', selected: false },
    { text: 'Dangerous neighborhood', selected: false },
    { text: 'Dangerous person', selected: false }];
  comments = '';

  constructor() { }

  ngOnInit() {
  }

  ban() {
    const bannedReasons = this.reasons.filter(r => r.selected).map(r => r.text);
    this.comments && this.comments.trim() && bannedReasons.push(this.comments.trim());
    this.onBan.emit(bannedReasons);
  }

  cancel() {
    this.onCancel.emit();
  }

}
