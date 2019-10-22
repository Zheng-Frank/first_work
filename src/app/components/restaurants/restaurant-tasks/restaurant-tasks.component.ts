import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { ApiService } from 'src/app/services/api.service';
import { GlobalService } from 'src/app/services/global.service';
import { AlertType } from 'src/app/classes/alert-type';
import { environment } from 'src/environments/environment';
import { Task } from 'src/app/classes/tasks/task';

@Component({
  selector: 'app-restaurant-tasks',
  templateUrl: './restaurant-tasks.component.html',
  styleUrls: ['./restaurant-tasks.component.css']
})
export class RestaurantTasksComponent implements OnInit, OnChanges {

  @Input() restaurant: Restaurant;

  tasks: Task[] = [];
  constructor(private _api: ApiService, private _global: GlobalService) { }

  scanning = false;
  ngOnInit() {
  }

  async ngOnChanges(changes: SimpleChanges) {
    console.log('changes')
    if (this.restaurant) {
      console.log('changes2')
      // refresh tasks for the restaurant
      await this.reloadTasks();
    }
  }

  async reloadTasks() {
    console.log('called')
    this.tasks = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "task",
      query: {
        $or: [
          {
            "relatedMap.restaurantId": this.restaurant._id
          },
          {
            "relatedMap.qmenuId": this.restaurant._id
          }
        ]
      },
      limit: 10000000
    }).toPromise();
  }

  async scanGmbTasks() {
    this.scanning = true;
    try {
      await this._api.post(environment.gmbNgrok + 'task/scan-restaurant', {
        restaurantId: this.restaurant._id
      }).toPromise();

      this._global.publishAlert(AlertType.Success, 'Scanned Successfully');
      await this.reloadTasks();
    } catch (error) {
      console.log(error);
      const result = error.error || error.message || error;
      this._global.publishAlert(AlertType.Danger, JSON.stringify(result));
    }
    this.scanning = false;
  }

}
