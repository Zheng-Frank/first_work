import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PhoneOrderingDashboardComponent } from './phone-ordering-dashboard.component';

describe('PhoneOrderingDashboardComponent', () => {
  let component: PhoneOrderingDashboardComponent;
  let fixture: ComponentFixture<PhoneOrderingDashboardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PhoneOrderingDashboardComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PhoneOrderingDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
