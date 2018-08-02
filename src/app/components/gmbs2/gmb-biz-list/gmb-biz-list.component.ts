import { Component, OnInit, Input } from '@angular/core';
import { GmbBiz } from '../../../classes/gmb/gmb-biz';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { GmbAccount } from '../../../classes/gmb/gmb-account';
import { GlobalService } from '../../../services/global.service';
import { AlertType } from '../../../classes/alert-type';

@Component({
  selector: 'app-gmb-biz-list',
  templateUrl: './gmb-biz-list.component.html',
  styleUrls: ['./gmb-biz-list.component.css']
})
export class GmbBizListComponent implements OnInit {

  @Input() bizList: GmbBiz[] = []
  
  searchFilter;
  filteredBizList: GmbBiz[] = []

  constructor(private _api: ApiService, private _global: GlobalService) {
    this._api.get(environment.adminApiUrl + "generic", {
      resource: "gmbBiz",
      projection: {
        cid: 1,
        place_id:  1,
        qmenuId:  1,

        name:  1,
        phone:  1,
        zipcode:  1,
        homepage:  1,
        address:  1,
    
        // qMenu related information (injected to listing once we have ownership)
        qWebsite:  1,
        qPop3Email:  1,
        qPop3Host:  1,
        qPop3Password:  1,
    
        score:  1,
        ownerships: 1
      },
      limit: 5000
    })
      .subscribe(
        bizList => {
          this.bizList = bizList.map(b => new GmbBiz(b)).sort((g1, g2) => g1.name > g2.name ? 1 : -1);
          this.filterBizList();
        },
        error => {
          this._global.publishAlert(AlertType.Danger, error);
        }
      );
  }
  ngOnInit() {
  }

  debounce(event) {
    this.filterBizList();
  }

  filterBizList() {
    this.filteredBizList = this.bizList;
  }

}
