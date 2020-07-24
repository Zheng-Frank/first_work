import { TestBed } from '@angular/core/testing';

import { RestaurantCourierService } from './restaurant-courier.service';

describe('RestaurantCourierService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: RestaurantCourierService = TestBed.get(RestaurantCourierService);
    expect(service).toBeTruthy();
  });
});
