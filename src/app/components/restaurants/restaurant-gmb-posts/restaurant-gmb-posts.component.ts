import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { ApiService } from 'src/app/services/api.service';
import { environment } from 'src/environments/environment';
import { GlobalService } from 'src/app/services/global.service';
import { AlertType } from 'src/app/classes/alert-type';

@Component({
  selector: 'app-restaurant-gmb-posts',
  templateUrl: './restaurant-gmb-posts.component.html',
  styleUrls: ['./restaurant-gmb-posts.component.css']
})
export class RestaurantGmbPostsComponent implements OnInit {

  @Input() restaurant: Restaurant;
  @ViewChild('addPostModal') addPostModal;

  posts = {
    localPosts: []
  };

  imageUrl = '';
  summary = ''
  actionType = '2';
  linkTo = '';

  email = '07katiereagan02@gmail.com';
  locationName = 'accounts/103785446592950428715/locations/3777873802242891617' // location for 'Qmenu Inc'

  constructor(private _api: ApiService, private _global: GlobalService) { }

  async ngOnInit() {
    this.posts = await this._api.post(environment.gmbNgrok + 'gmb/post-list', {
      email: this.email,
      locationName: this.locationName
    }).toPromise();
    // console.log(this.posts);
  }

  showAddPostModal() {
    this.addPostModal.title = "Add Post";
    this.addPostModal.show();
  }

  async addPost() {
    const postData = {
      email: this.email,
      locationName: this.locationName,
      post: {
        imageUrl: this.imageUrl,
        summary: this.summary,
        linkTo: this.linkTo,
        actionType: parseInt(this.actionType)
      }
    };

    try {
      const post = await this._api.post(environment.gmbNgrok + 'gmb/post', postData).toPromise();
      this._global.publishAlert(AlertType.Info, "GMB Post Added");
      this.posts.localPosts.unshift(post);
      this.addPostModal.hide();
    } catch (error) {
      this._global.publishAlert(AlertType.Danger, 'Could not Add GMB Post');
      console.error(error);
      this.addPostModal.hide();
    }

  }

  async removePost(post) {
    try {
      const deletedPost = await this._api.post(environment.gmbNgrok + 'gmb/delete', {
        email: this.email,
        locationName: this.locationName,
        postRef: post.name.substr(post.name.lastIndexOf('/') + 1, post.name.length)
      }).toPromise();
      this.posts.localPosts = this.posts.localPosts.filter(p => p.name !== post.name);
    } catch (error) {
      this._global.publishAlert(AlertType.Danger, 'Could not Remove GMB Post');
      console.error(error);
    }
  }

  canPost() {
    return (this.imageUrl && this.summary && this.linkTo && this.actionType);
  }

  cancel() {
    this.addPostModal.hide();
  }

}

