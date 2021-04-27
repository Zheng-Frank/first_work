import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RestaurantTranslationsComponent } from './restaurant-translations.component';

describe('MenuLanguagesComponent', () => {
  let component: RestaurantTranslationsComponent;
  let fixture: ComponentFixture<RestaurantTranslationsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RestaurantTranslationsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RestaurantTranslationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
