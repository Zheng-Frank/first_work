import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MonitoringOnboardingComponent } from './monitoring-onboarding.component';

describe('MonitoringOnboardingComponent', () => {
  let component: MonitoringOnboardingComponent;
  let fixture: ComponentFixture<MonitoringOnboardingComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MonitoringOnboardingComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MonitoringOnboardingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
