import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RestaurantsCourierListComponent } from './restaurants-courier-list.component';

describe('RestaurantsCourierListComponent', () => {
  let component: RestaurantsCourierListComponent;
  let fixture: ComponentFixture<RestaurantsCourierListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RestaurantsCourierListComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RestaurantsCourierListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
