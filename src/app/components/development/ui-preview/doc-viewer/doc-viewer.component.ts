import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-doc-viewer',
  templateUrl: './doc-viewer.component.html',
  styleUrls: ['./doc-viewer.component.css']
})

export class DocViewerComponent implements OnInit {
  @Input() name: string;
  @Input() description: string;
  @Input() inputs: string[];
  @Input() outputs: string[];
  @Input() methods: string[];
  @Input() fields: string[];

  constructor() { }

  ngOnInit() {
  }

}
