import { Component, OnInit, ViewChild } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { GlobalService } from 'src/app/services/global.service';
import { environment } from 'src/environments/environment';
import { AlertType } from 'src/app/classes/alert-type';
import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
@Component({
  selector: 'app-broadcasting-editor',
  templateUrl: './broadcasting-editor.component.html',
  styleUrls: ['./broadcasting-editor.component.css']
})
export class BroadcastingEditorComponent implements OnInit {
  @ViewChild('deleteBroadcastModal') deleteBroadcastModal: ModalComponent;

  now = new Date();
  
  broadcastChannelType = {
    'Biz App': 'QM_OWNER_APP',
  };
  
  broadcast = {
    createdAt: new Date(),
    name: '',
    channel: 'Biz App',
    template: ''
  };

  broadcastList = [];

  currentBroadcastId;

  constructor(private _api: ApiService, private _global: GlobalService) { }

  async ngOnInit() {
    await this.refresh();
  }

  async refresh() {
    this.broadcastList = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'broadcast',
      query: {
      },
      projection: {
      }
    }).toPromise();

    console.log(this.broadcastList);
  }

  canCreateBroadcast() {
    return !!this.broadcast.name && !!this.broadcast.channel && !!this.broadcast.template;
  }

  async createBroadcast() {
    const broadcastData = {
      createAt: new Date(),
      name: this.broadcast.name,
      channel: this.broadcastChannelType[this.broadcast.channel],
      template: this.broadcast.template
    };

    try {
      if(broadcastData.channel) {
        const broadcastResult = await this._api.post(environment.qmenuApiUrl + 'generic?resource=broadcast', [broadcastData]).toPromise();
        this._global.publishAlert(AlertType.Success, `Broadcast create succesfuly`);
        await this.refresh();
      } else {
        this._global.publishAlert(AlertType.Danger, `Invalid broadcast channel`);
        console.error('Bad broadcast channel', broadcastData);
      }
    } catch (error) {
      this._global.publishAlert(AlertType.Danger, `Error while creating broadcast.`);
      console.error('Error while creating broadcast', error);
    }
  }

  showDeleteBroadcastModal(broadcastId) {
    this.currentBroadcastId = broadcastId;
    this.deleteBroadcastModal.show();
  }

  async deleteBroadcast() {
    try {
      if(this.currentBroadcastId !== '') {
        await this._api.delete(environment.qmenuApiUrl + 'generic', {
          resource: 'broadcast',
          ids: [this.currentBroadcastId]
        }).toPromise();
      }
      this.currentBroadcastId = '';
    } catch (error) {
      console.error('Error deleting broadcast');
    }
   
  }

}
