import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { ApiService } from 'src/app/services/api.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-restaurant-gmb-posts',
  templateUrl: './restaurant-gmb-posts.component.html',
  styleUrls: ['./restaurant-gmb-posts.component.css']
})
export class RestaurantGmbPostsComponent implements OnInit {

  @Input() restaurant: Restaurant;
  @ViewChild('addPostModal') addPostModal;

  // TODO: get from gmbApi
  posts = {"localPosts": []};

  email = '07katiereagan02@gmail.com';
  locationName = 'accounts/103785446592950428715/locations/3777873802242891617' // location for 'Qmenu Inc'

  constructor(private _api: ApiService) { }

  async ngOnInit() {
    this.posts = await this._api.post(environment.gmbNgrok + 'gmb/post-list', {
      email: this.email,
      locationName: this.locationName
    }).toPromise();

    console.log(this.posts);
  }

  showAddPostModal() {
    this.addPostModal.title = "Add Post";
    this.addPostModal.show();
  }

  addPost() {

  }

  cancel() {
    this.addPostModal.hide();

  }

}

