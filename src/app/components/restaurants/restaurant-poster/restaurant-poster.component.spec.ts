import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RestaurantPosterComponent } from './restaurant-poster.component';

describe('RestaurantPosterComponent', () => {
  let component: RestaurantPosterComponent;
  let fixture: ComponentFixture<RestaurantPosterComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RestaurantPosterComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RestaurantPosterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
