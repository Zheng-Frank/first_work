import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { HolidayMonitorComponent } from './holiday-monitor.component';

describe('HolidayMonitorComponent', () => {
  let component: HolidayMonitorComponent;
  let fixture: ComponentFixture<HolidayMonitorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ HolidayMonitorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HolidayMonitorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
