import { ViewChild } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { environment } from './../../../../environments/environment';
import { ApiService } from 'src/app/services/api.service';
import { Input } from '@angular/core';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-restaurant-broadcasts',
  templateUrl: './restaurant-broadcasts.component.html',
  styleUrls: ['./restaurant-broadcasts.component.css']
})
export class RestaurantBroadcastsComponent implements OnInit {

  @ViewChild('textPreviewModal') textPreviewModal;
  @Input() restaurant;
  rows = [];
  columnDescriptors = [
    {
      label: '#'
    },
    {
      label: "Broadcast Name",
      paths: ['name'],
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },
    {
      label: "Text"
    },
    {
      label: "Acknowledged At",
      paths: ['acknowledgedAt'],
      sort: (a, b) => {
        if ((a && !b) || (!a && b)) {
          return 1;
        } else if(a && b) {
          return new Date(a).valueOf() - new Date(b).valueOf(); 
        } else if (!a && !b) {
          return -1;
        }
      }
    },
    {
      label: 'Sent At'
    }
  ];
  pagination = false;
  current;
  constructor(private _api: ApiService, private sanitizer: DomSanitizer) { }

  async ngOnInit() {
    await this.populateBroadcasts();
  }

  sanitized(origin) {
    return this.sanitizer.bypassSecurityTrustHtml(origin);
  }

  showFullText(row) {
    this.current = row;
    this.textPreviewModal.show();
  }

  async populateBroadcasts() {
    const broadcasts = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'broadcast',
      projection: {
        _id: 1,
        name: 1,
        template: 1
      },
      limit: 500
    }).toPromise();
    (this.restaurant.broadcasts || []).forEach(broadcast => {
      const b = (broadcasts || []).find( b => b._id === broadcast._id) || {};
      let item = {
        name: b.name || '',
        text: b.template || '',
        acknowledged: broadcast.acknowledged || false,
        acknowledgedAt: broadcast.acknowledgedAt,
        sentAt: broadcast.sentAt
      }
      this.rows.push(item);
    });
  }

}
