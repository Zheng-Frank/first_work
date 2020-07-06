import { Component, OnInit, ViewChild } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { GlobalService } from 'src/app/services/global.service';
import { environment } from 'src/environments/environment';
import { AlertType } from 'src/app/classes/alert-type';
import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import { b } from '@angular/core/src/render3';
@Component({
  selector: 'app-broadcasting-editor',
  templateUrl: './broadcasting-editor.component.html',
  styleUrls: ['./broadcasting-editor.component.css']
})
export class BroadcastingEditorComponent implements OnInit {
  @ViewChild('deleteBroadcastModal') deleteBroadcastModal: ModalComponent;

  now = new Date();
  broadcastChannels = ['Biz App', 'Postmates'];
  broadcast = {
    _id: '',
    createdAt: new Date(),
    name: '',
    channel: 'Biz App',
    template: ''
  };
  selectedBroadcast;
  broadcastList = [];
  isEditing = false;

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
    this.refresh();

  }

  ngAfterContentInit() {
    this.refresh();
  }

  async refresh() {
    this.broadcastList = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'broadcast',
      limit: 1000
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
      channel: this.broadcast.channel,
      template: this.broadcast.template
    };

    try {
      if (!this.isEditing) {
        const broadcastResult = await this._api.post(environment.qmenuApiUrl + 'generic?resource=broadcast', [broadcastData]).toPromise();
        this._global.publishAlert(AlertType.Success, `Broadcast create succesfuly`);
        this.isEditing = false;
        this.resetBroadcast();
      } else {
        const broadcastResult = await this._api.patch(environment.qmenuApiUrl + 'generic?resource=broadcast', [
          {
            old: { _id: this.selectedBroadcast._id },
            new: this.broadcast,
          }
        ]).toPromise();
        this._global.publishAlert(AlertType.Success, `Broadcast edited succesfuly`);
        this.resetBroadcast();
        this.isEditing = false;
      }

      await this.refresh();

    } catch (error) {
      this._global.publishAlert(AlertType.Danger, `Error while creating broadcast.`);
      console.error('Error while creating broadcast', error);
    }
  }

  showDeleteBroadcastModal(broadcast) {
    this.selectedBroadcast = broadcast;
    this.deleteBroadcastModal.show();
  }

  async deleteBroadcast() {
    try {
      if (this.selectedBroadcast._id) {
        await this._api.delete(environment.qmenuApiUrl + 'generic', {
          resource: 'broadcast',
          ids: [this.selectedBroadcast._id]
        }).toPromise();
        this.deleteBroadcastModal.hide();
        await this.refresh();
        this._global.publishAlert(AlertType.Success, `Broadcast deleted.`);
      }
    } catch (error) {
      this._global.publishAlert(AlertType.Danger, `Error deleting broadcast`);
      console.error('Error deleting broadcast', error);
    }

  }

  editBroadcast(broadcast) {
    this.selectedBroadcast = broadcast;
    this.isEditing = true;
    this.broadcast = { ...this.broadcastList.find(b => b._id === broadcast._id) };
    console.log(this.broadcast);
  }

  cancelEdit() {
    this.isEditing = false;
    this.resetBroadcast();
  }

  resetBroadcast() {
    this.broadcast.createdAt = new Date();
    this.broadcast.name = '';
    this.broadcast.template = '';

  }

}
