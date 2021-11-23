import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RestaurantSetupMenuComponent } from './restaurant-setup-menu.component';

describe('RestaurantSetupMenuComponent', () => {
  let component: RestaurantSetupMenuComponent;
  let fixture: ComponentFixture<RestaurantSetupMenuComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RestaurantSetupMenuComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RestaurantSetupMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
