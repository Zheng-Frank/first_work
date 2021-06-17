import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardItemOrderStatsComponent } from './dashboard-item-order-stats.component';

describe('DashboardItemOrderStatsComponent', () => {
  let component: DashboardItemOrderStatsComponent;
  let fixture: ComponentFixture<DashboardItemOrderStatsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DashboardItemOrderStatsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardItemOrderStatsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
