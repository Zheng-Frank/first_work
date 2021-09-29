import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderlessSignupsComponent } from './orderless-signups.component';

describe('OrderlessSignupsComponent', () => {
  let component: OrderlessSignupsComponent;
  let fixture: ComponentFixture<OrderlessSignupsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ OrderlessSignupsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OrderlessSignupsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
