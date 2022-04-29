import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RestaurantPhoneOrderingSettingsComponent } from './restaurant-phone-ordering-settings.component';

describe('RestaurantPhoneOrderingSettingsComponent', () => {
  let component: RestaurantPhoneOrderingSettingsComponent;
  let fixture: ComponentFixture<RestaurantPhoneOrderingSettingsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RestaurantPhoneOrderingSettingsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RestaurantPhoneOrderingSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
