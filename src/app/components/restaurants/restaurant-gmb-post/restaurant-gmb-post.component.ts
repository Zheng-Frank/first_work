import { Component, OnInit, Input } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-restaurant-gmb-post',
  templateUrl: './restaurant-gmb-post.component.html',
  styleUrls: ['./restaurant-gmb-post.component.css']
})
export class RestaurantGmbPostComponent implements OnInit {

  @Input() post: any;

  imgSrc;

  // email = '07katiereagan02@gmail.com';
  // locationName = 'accounts/103785446592950428715/locations/3777873802242891617' // location for 'Qmenu Inc'

  constructor(private _api: ApiService) { }

  ngOnInit() {
    this.imgSrc = (this.post.media.length) > 0 ? this.post.media[0].googleUrl: '';
    // this.imgSrc = this.post.imageUrl;
    console.log(this.post);
  }

  goToLink() {
    // window.open(this.post.callToAction.url, "_blank");
    window.open(this.post.callToAction.url, "_blank");
  }

  getActionLabel() {
    switch (this.post.callToAction.actionType) {
      case 'BOOK':
        return 'Book Now';
      case 'ORDER':
        return 'Order Online';
      case 'SHOP':
        return 'Shop Now';
      case 'LEARN_MORE':
        return 'Learn More';
      case 'SIGN_UP':
        return 'Sign Up Now'
      case 'GET_OFFER':
        return 'See Offer';
      case 'CALL':
        return 'Call Now';
    }
  }

}

