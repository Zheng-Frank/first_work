import { Component, OnInit, Input, Output, EventEmitter } from "@angular/core";
import { GmbInfo } from "../../../classes/gmb-info";

@Component({
  selector: "app-gmb-info",
  templateUrl: "./gmb-info.component.html",
  styleUrls: ["./gmb-info.component.scss"]
})
export class GmbInfoComponent implements OnInit {
  @Input() gmbInfo;
  @Input() showRefresh = false;
  @Output() scan = new EventEmitter();

  loading = false;
  constructor() { }

  ngOnInit() { }

  getGoogleQuery() {
    if (this.gmbInfo["address"]) {
      return (
        "https://www.google.com/search?q=" +
        encodeURIComponent(
          this.gmbInfo["name"] +
          " " +
          this.gmbInfo["address"]["formatted_address"]
        )
      );
    }
  }

  scanLead() {
    this.loading = true;
    this.scan.emit({
      lead: this.gmbInfo,
      acknowledge: () => {
        this.loading = false;
      }
    });
  }
}
