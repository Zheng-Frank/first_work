import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RestaurantSetupEntryComponent } from './restaurant-setup-entry.component';

describe('RestaurantSetupEntryComponent', () => {
  let component: RestaurantSetupEntryComponent;
  let fixture: ComponentFixture<RestaurantSetupEntryComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RestaurantSetupEntryComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RestaurantSetupEntryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
