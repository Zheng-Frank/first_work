import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-chain',
  templateUrl: './chain.component.html',
  styleUrls: ['./chain.component.css']
})
export class ChainComponent implements OnInit {
  @Input() chain: any;
  @Output() onRemoveChain = new EventEmitter();
  @Output() onRemoveAssociatedRestaurant = new EventEmitter();
  @Output() onAssociateToChain = new EventEmitter();

  restaurantIdToAssociate = '';
  constructor() { }

  ngOnInit() {
  }

  removeChain(chainId) {
    this.onRemoveChain.emit(chainId);
  }

  removeAssociatedRestaurant(chainId, restaurantId) {
    this.onRemoveAssociatedRestaurant.emit({ chainId, restaurantId });
  }

  associateToChain(chainId) {
    this.onAssociateToChain.emit( {chainId, restaurantIdToAssociate: this.restaurantIdToAssociate})
  }
}
