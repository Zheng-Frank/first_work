import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { ApiService } from 'src/app/services/api.service';
import { environment } from 'src/environments/environment';
import { GlobalService } from 'src/app/services/global.service';
import { AlertType } from 'src/app/classes/alert-type';
import { Helper } from '../../../classes/helper';

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

  uploadImageError = '';

  files;

  email;
  locationName;

  // email = '07katiereagan02@gmail.com';
  // locationName = 'accounts/103785446592950428715/locations/3777873802242891617' // location for 'Qmenu Inc'

  constructor(private _api: ApiService, private _global: GlobalService) { }

  async ngOnInit() {

    // let gmbAccounts = await this._api.get(environment.qmenuApiUrl + 'generic', {
    //   resource: 'gmbAccount',
    //   projection: {
    //     email: 1,
    //     locations: 1
    //   }
    // }).toPromise();

    const gmbAccounts = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbAccount',
      query: {
        locations: { $exists: 1 }
      },
      projection: {
        email: 1,
        "locations.name": 1,
        "locations.locationName": 1,
        "locations.place_id": 1,
      },
      limit: 6000
    }).toPromise();

    let matchingAccounts = [];

    for (const account of gmbAccounts) {
      const result = account.locations.filter(loc => {
          return loc.name === this.restaurant.name && loc.place_id === this.restaurant.googleAddress.place_id;
      });

      if (result.length > 0) {
        matchingAccounts.push(account);
      }
    }

    if (matchingAccounts.length > 0) {
      const account = matchingAccounts[Math.floor(Math.random() * matchingAccounts.length)];
      const [location] = account.locations.filter(loc => (loc.name === this.restaurant.name) && (loc.status === 'Published'));

      // console.log('Account:', account.email, 'Location:', location);

      if(account && location) {
        this.email = account.email;
        this.locationName = location.locationName;

        this.posts = await this._api.post(environment.gmbNgrok + 'gmb/post-list', {
          email: account.email,
          locationName: location.locationName
        }).toPromise();

      } else {
        console.log('no matching accounts');
      }
    }
  }

  showAddPostModal() {
    this.addPostModal.title = "Add Post";
    this.addPostModal.show();
  }

  deleteBackgroundImage() {
    this.imageUrl = undefined;
    this.files = null;
  }

  async onUploadImageChange(event) {
    this.uploadImageError = undefined;
    this.files = event.target.files;
    try {
      const data: any = await Helper.uploadImage(this.files, this._api);

      if (data && data.Location) {
        this.imageUrl = data.Location;
      }
    }
    catch (err) {
      this.uploadImageError = err;
    }
  }

  async addPost() {
    const postData = {
      email: this.email,
      locationName: this.locationName,
      post: {
        imageUrl: this.imageUrl,
        summary: this.summary,
        website: this.linkTo,
        actionType: parseInt(this.actionType)
      }
    };

    console.log(postData);

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

