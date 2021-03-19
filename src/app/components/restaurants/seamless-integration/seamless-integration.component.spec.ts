import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SeamlessIntegrationComponent } from './seamless-integration.component';

describe('SeamlessIntegrationComponent', () => {
  let component: SeamlessIntegrationComponent;
  let fixture: ComponentFixture<SeamlessIntegrationComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SeamlessIntegrationComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SeamlessIntegrationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
