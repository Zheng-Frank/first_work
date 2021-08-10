import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MonitoringPromotionRowComponent } from './monitoring-promotion-row.component';

describe('MonitoringPromotionRowComponent', () => {
  let component: MonitoringPromotionRowComponent;
  let fixture: ComponentFixture<MonitoringPromotionRowComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MonitoringPromotionRowComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MonitoringPromotionRowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
