/**
 * please use only ONCE since we initialize connect.js and detroy it here
 */
import { Component, OnInit, ViewChild, HostListener, AfterViewInit, Renderer2, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/platform-browser';

import { ApiService } from '../../../services/api.service';
import { GlobalService } from '../../../services/global.service';
import { AmazonConnectService } from 'src/app/services/amazon-connect.service';
declare var connect: any;

@Component({
  selector: 'app-ivr-widget',
  templateUrl: './ivr-widget.component.html',
  styleUrls: ['./ivr-widget.component.css'],
})
export class IvrWidgetComponent implements OnInit, AfterViewInit {
  @ViewChild('widgetContainer') widgetContainer;
  @ViewChild('connectContainer') connectContainer;

  connectScript;

  showClose = false;

  connectedContact = undefined;
  pos1 = 0;
  pos2 = 0;
  pos3 = 0;
  pos4 = 0;

  dragging = false;
  now = new Date();
  minimized = false;

  constructor(private renderer2: Renderer2, @Inject(DOCUMENT) private _document, private _api: ApiService, private _global: GlobalService, private _connect: AmazonConnectService) {
    this._connect.onContactConnected.subscribe(contact => {
      console.log("onContactConnected");
      this.connectedContact = contact;
      this.populateConnectedContact();
    });
    this._connect.onContactEnded.subscribe(contact => {
      console.log("onContactEnded");
      this.connectedContact = undefined;
    });
    this._connect.onEnabled.subscribe(enabled => {
      console.log("INNER ON ENABLED");
    });
  }

  populateConnectedContact() {
    console.log("populateConnectedContact", this.connectedContact.value);
    if (this.connectedContact && this.connectedContact.value) {
      console.log("enter")
      this._global.getCachedRestaurantListForPicker().then(restaurants => {
        // situation could have changed by now because of async!
        if (this.connectedContact && (!this.connectedContact.restaurants || this.connectedContact.restaurants.length === 0)) {
          console.log("same connectedContact and filter")
          const existingOnes = restaurants.filter(rt => (rt.channels || []).some(c => c.value === this.connectedContact.value));
          this.connectedContact.restaurants = existingOnes;
        } else {
          console.log("contact changed during");
        }
      });

    }
  }

  ngOnInit() {
  }

  ngOnDestroy() {

    this.renderer2.removeChild(this._document.body, this.connectScript);
    console.log("remove connect script!")
    if (connect) {
      connect.core.terminate();
    }
  }

  confirmClose() {
    this._connect.setEnabeld(false);
    this.showClose = false;
  }

  ngAfterViewInit() {
    const s = this.renderer2.createElement('script');
    s.type = 'text/javascript';
    s.src = 'assets/js/amazon-connect.min.js';
    s.text = `sometext`;
    this.renderer2.appendChild(this._document.body, s);
    this.connectScript = s;
    s.onload = () => {
      this.initConnect();
    };
  }

  private initConnect() {
    /*************** End Mod Area ***************/
    let ready = false;
    connect.core.initCCP(this.connectContainer.nativeElement, {
      ccpUrl: "https://qmenu.awsapps.com/connect/ccp#",
      loginPopup: false,
      region: "us-east-1",
      softphone: {
        allowFramedSoftphone: true
      }
    });

    setTimeout(_ => {
      if (!ready) {
        window.open('https://qmenu.awsapps.com/connect/ccp#');
      }
    }, 5000);

    connect.agent(agent => {
      ready = true;
      this._connect.setConfig(agent.getConfiguration());
      console.log("new config@");
      // agent.onStateChange(function(agentStateChange) { console.log('state change', agentStateChange) });
      // subscribe interested events
      agent.onContactPending(agent => {
        console.log("contactPending");
      });
      agent.onStateChange(agentStateChange => {
        console.log("onStateChange");
        setTimeout(_ => {
          const possibleNewConfig = agentStateChange.agent.getConfiguration();
          console.log(possibleNewConfig);
          if (this._connect.config.username !== possibleNewConfig.username) {
            this._connect.setConfig(agentStateChange.agent.getConfiguration());
            console.log("CONFIG CHANGED");
          }
        }, 2000); // wait 2 sec
      });
      agent.onError(agent => { console.log("onError"); });
    });
    connect.contact(contact => {
      ready = true;
      console.log("on contact", contact);
      const attributeMap = contact.getAttributes();
      console.log(attributeMap);
      console.log("contact phone", attributeMap.customerNumber.value);
      if (attributeMap.customerNumber && attributeMap.customerNumber.value) {
        if (!this._connect.connectedContacts.some(c => contact.contactId === c.contactId)) {
          const connectedContact = {
            contactId: contact.contactId,
            value: attributeMap.customerNumber.value.replace("+1", "")
          };
          this._connect.connectedContacts.push(connectedContact);
          this._connect.onContactConnected.emit(connectedContact);
        }
      }
      contact.onPending(contact => {
        console.log("onPending");
      });
      contact.onConnecting(contact => {
        console.log("onConnecting");
      });
      contact.onMissed(contact => {
        console.log("PenonMissedding");
      });
      contact.onEnded(contact => {
        console.log("onEnded");
        const disconnected = this._connect.connectedContacts.filter(c => c.contactId === contact.contactId)[0];
        this._connect.connectedContacts = this._connect.connectedContacts.filter(c => c.contactId !== contact.contactId);
        if (disconnected) {
          this._connect.onContactEnded.emit(disconnected);
        }
      });
    });
    this.setInitialPosition();
  }

  setInitialPosition() {
    this.pos3 = 0;
    this.pos4 = 0;
    this.pos1 = -window.innerWidth + 340;
    this.pos2 = -window.innerHeight + 580;
    this.setPostion();
  }

  refresh() {
  }

  @HostListener('document:mouseup', ['$event'])
  onMouseup(event: MouseEvent) {
    this.dragging = false;
  }

  @HostListener('mousedown', ['$event'])
  onMousedown(event: MouseEvent) {
    this.dragging = true;
    const e: any = event || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    this.pos3 = e.clientX;
    this.pos4 = e.clientY;
  }

  @HostListener('document:mousemove', ['$event'])
  onMousemove(event: MouseEvent) {
    if (this.dragging) {
      const e: any = event || window.event;
      e.preventDefault();
      // calculate the new cursor position:
      this.pos1 = this.pos3 - e.clientX;
      this.pos2 = this.pos4 - e.clientY;
      this.pos3 = e.clientX;
      this.pos4 = e.clientY;
      this.setPostion();
    }
  }

  setPostion() {
    const elmnt = this.widgetContainer.nativeElement;
    elmnt.style.top = (elmnt.offsetTop - this.pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - this.pos1) + "px";
  }

  resize() {
    this.minimized = !this.minimized;
  }
}
