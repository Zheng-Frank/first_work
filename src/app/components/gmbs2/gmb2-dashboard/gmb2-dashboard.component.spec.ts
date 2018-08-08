import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { Gmb2DashboardComponent } from './gmb2-dashboard.component';

describe('Gmb2DashboardComponent', () => {
  let component: Gmb2DashboardComponent;
  let fixture: ComponentFixture<Gmb2DashboardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ Gmb2DashboardComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(Gmb2DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
