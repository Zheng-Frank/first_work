import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RestaurantSetupHoursComponent } from './restaurant-setup-hours.component';

describe('RestaurantSetupHoursComponent', () => {
  let component: RestaurantSetupHoursComponent;
  let fixture: ComponentFixture<RestaurantSetupHoursComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RestaurantSetupHoursComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RestaurantSetupHoursComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
