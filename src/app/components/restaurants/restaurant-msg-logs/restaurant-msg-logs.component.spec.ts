import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RestaurantMsgLogsComponent } from './restaurant-msg-logs.component';

describe('RestaurantMsgLogsComponent', () => {
  let component: RestaurantMsgLogsComponent;
  let fixture: ComponentFixture<RestaurantMsgLogsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RestaurantMsgLogsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RestaurantMsgLogsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
