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
  email = '07katiereagan02@gmail.com';
  locationName = 'accounts/103785446592950428715/locations/3777873802242891617' // location for 'Qmenu Inc'

  constructor(private _api: ApiService) { }

  ngOnInit() {
    this.imgSrc = (this.post.media && this.post.media.length) > 0 ? this.post.media[0].googleUrl: '';
  }

  goToLink() {
    window.open(this.post.callToAction.url, "_blank");
  }

  async removePost() {
    const deletedPost = await this._api.post(environment.gmbNgrok + 'gmb/delete', {
      email: this.email,
      locationName: this.locationName,
      postRef: this.post.name.substr(this.post.name.lastIndexOf('/') + 1, this.post.name.length)
    }).toPromise();

    console.log(deletedPost);
  }

}

