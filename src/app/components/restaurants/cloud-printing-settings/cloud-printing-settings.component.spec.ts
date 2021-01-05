import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { ApiService } from 'src/app/services/api.service';
import { GlobalService } from 'src/app/services/global.service';
import { CloudPrintingSettingsComponent } from './cloud-printing-settings.component';

class ApiServiceMock {

};

class GlobalServiceMock {

};

let fixture: ComponentFixture<CloudPrintingSettingsComponent>;
let component: CloudPrintingSettingsComponent;
let element: HTMLElement;

describe('CloudPrintingSettingsComponent --- Isolated', () => {
  let component: CloudPrintingSettingsComponent;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [CloudPrintingSettingsComponent],
      providers: [
        { provide: ApiService, useClass: ApiServiceMock },
        { provide: GlobalService, useClass: GlobalServiceMock },
      ]
    });

    TestBed.compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(CloudPrintingSettingsComponent);
        component = fixture.componentInstance;
        element = fixture.nativeElement
      });
  }));



  it('should load instance', () => {
    expect(component).toBeTruthy();
    console.log(component);
  });


}); 