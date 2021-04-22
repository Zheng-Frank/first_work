import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RestaurantStatsComponent } from './restaurant-stats.component';

describe('RestaurantStatsComponent', () => {
  let component: RestaurantStatsComponent;
  let fixture: ComponentFixture<RestaurantStatsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RestaurantStatsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RestaurantStatsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
