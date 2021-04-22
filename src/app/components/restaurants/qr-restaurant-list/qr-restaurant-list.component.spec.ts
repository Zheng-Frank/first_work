import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { QrRestaurantListComponent } from './qr-restaurant-list.component';

describe('QrRestaurantListComponent', () => {
  let component: QrRestaurantListComponent;
  let fixture: ComponentFixture<QrRestaurantListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ QrRestaurantListComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(QrRestaurantListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
