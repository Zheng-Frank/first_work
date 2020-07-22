import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiService } from 'src/app/services/api.service';
import { GlobalService } from 'src/app/services/global.service';
import { environment } from 'src/environments/environment';
import { AlertType } from 'src/app/classes/alert-type';
import { Helper } from '../../classes/helper';

@Component({
  selector: 'app-gmb-campaign',
  templateUrl: './gmb-campaign.component.html',
  styleUrls: ['./gmb-campaign.component.css']
})
export class GmbCampaignComponent implements OnInit {

  @ViewChild('addPostModal') addPostModal;

  fileName = 'Load a campaign to begin';
  gmbRestaurants = [];
  posts = [];

  imageUrl = '';
  summary = ''
  actionType = 'ORDER';
  linkTo = '';

  uploadImageError = '';
  files;

  status = {
    description: '',
    success: 0,
    failure: 0
  }


  constructor(private _api: ApiService, private _global: GlobalService, private _http: HttpClient) { }

  ngOnInit() {
  }

  resetPostData() {
    this.imageUrl = '';
    this.summary = ''
    this.actionType = 'ORDER';
    this.linkTo = '';
  }

  showAddPostModal() {
    this.addPostModal.title = "Add Post";
    this.addPostModal.show();
  }

  canPost() {
    return (this.imageUrl && this.summary && this.actionType);
  }

  cancel() {
    this.addPostModal.hide();
  }

  getActionType(actionType) {
    switch (actionType) {
      case 'BOOK':
        return 1;
      case 'ORDER':
        return 2;
      case 'SHOP':
        return 3;
      case 'LEARN_MORE':
        return 4;
      case 'SIGN_UP':
        return 5;
      case 'GET_OFFER':
        return 6;
      case 'CALL':
        return 7;
    }
  }

  async beginMassivePost() {
    const postObj = [];
    this.status.success = this.status.failure = 0;

    this.gmbRestaurants.forEach(restaurant => {
      this.posts.forEach(post => {
        postObj.unshift({
          email: restaurant.email,
          locationName: restaurant.locationName,
          post: {
            imageUrl: post.media[0].googleUrl,
            summary: post.summary,
            linkTo: restaurant.website,
            actionType: this.getActionType(post.callToAction.actionType)
          }
        });
      });
    });

    // Loop thru postData and start massive gmb posting!
    console.log(postObj);


    postObj.forEach(async (data) => {

      const postData = {
        email: data.email,
        locationName: data.locationName,
        post: {
          imageUrl: data.post.imageUrl,
          summary: data.post.summary,
          linkTo: data.post.linkTo,
          actionType: parseInt(data.post.actionType)
        }
      };

      try {
        const post = await this._api.post(environment.gmbNgrok + 'gmb/post', postData).toPromise();
        this.status.description = `Total: ${postObj.length}`;
        this.status.success++;
        // this._global.publishAlert(AlertType.Info, "GMB Post Added");
        // this.addPostModal.hide();
      } catch (error) {
        this.status.failure++;
        this._global.publishAlert(AlertType.Danger, 'Could not Add GMB Post');
        console.error(error);
        this.addPostModal.hide();
      }
    });
  }

  async onUploadImageChange(event) {
    this.uploadImageError = undefined;
    this.files = event.target.files;
    try {
      const data: any = await Helper.uploadImage(this.files, this._api, this._http);

      if (data && data.Location) {
        this.imageUrl = data.Location;
      }
    }
    catch (err) {
      this.uploadImageError = err;
    }
  }

  deleteBackgroundImage() {
    this.imageUrl = undefined;
    this.files = null;
  }

  addPost() {
    this.posts.unshift({
      id: '_' + Math.random().toString(36).substr(2, 9),
      // imageUrl: this.imageUrl,
      media: [
        {
          googleUrl: this.imageUrl
        }
      ],
      summary: this.summary,
      linkTo: this.linkTo,
      callToAction: {
        actionType: this.actionType
      }
    });

    this.addPostModal.hide();
    this.resetPostData();
  }

  removePost(post) {
    this.posts = this.posts.filter(p => p.id !== post.id);
  }

  readUploadedFileAsText = (inputFile) => {
    const temporaryFileReader = new FileReader();

    return new Promise((resolve, reject) => {
      temporaryFileReader.onerror = () => {
        temporaryFileReader.abort();
        reject(`Error reading ${inputFile.name}`);
      };

      temporaryFileReader.onload = () => {
        resolve(temporaryFileReader.result);
      };
      temporaryFileReader.readAsText(inputFile);
    });
  };

  handleUpload = async (event) => {
    const file = event.target.files[0];
    this.fileName = file.name;

    try {
      const fileContents = await this.readUploadedFileAsText(file);
      this.gmbRestaurants = JSON.parse(fileContents.toString());
    } catch (e) {
      console.error(`Error handling file upload ${e.message}`);
    }
  }

}
