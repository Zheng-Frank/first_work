
import { Injectable, EventEmitter, Component, OnInit, ViewChild, HostListener, AfterViewInit, Renderer2, Inject, RendererFactory2, NgZone } from '@angular/core';
import { DOCUMENT } from '@angular/platform-browser';

declare var connect: any;

@Injectable()
export class AmazonConnectService {
  onContactConnected: EventEmitter<any> = new EventEmitter();
  onContactEnded: EventEmitter<any> = new EventEmitter();
  onEnabled: EventEmitter<any> = new EventEmitter();
  onConfigurationChanged: EventEmitter<any> = new EventEmitter();

  config = {} as any;
  connectedContacts = [];

  connectScript;

  setConfig(config) {
    this.config = config;
    this.onConfigurationChanged.emit(config);
  }

  setEnabeld(enabled) {
    console.log("a");
    const s = this.renderer2.createElement('script');
    s.type = 'text/javascript';
    s.src = 'assets/js/amazon-connect.min.js';
    s.text = `sometext`;
    this.renderer2.appendChild(this._document.body, s);
    this.connectScript = s;
    console.log("b");
    s.onload = () => {
      setTimeout(_ => {
        console.log("LOADED!!!!");
        
        console.log("after emit")
        this._zone.run(() => {
          console.log("zone run")
        });
        // if (!enabled && connect) {
        //   console.log("terminiated")
        //   connect.core.terminate();
        // }
      }, 2000);

    };
  }

  private renderer2: Renderer2;

  constructor(rendererFactory: RendererFactory2, @Inject(DOCUMENT) private _document, private _zone: NgZone) {
    this.renderer2 = rendererFactory.createRenderer(null, null);
  }

}
