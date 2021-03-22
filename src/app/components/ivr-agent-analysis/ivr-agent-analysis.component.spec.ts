import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { IvrAgentAnalysisComponent } from './ivr-agent-analysis.component';

describe('IvrAgentAnalysisComponent', () => {
  let component: IvrAgentAnalysisComponent;
  let fixture: ComponentFixture<IvrAgentAnalysisComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ IvrAgentAnalysisComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(IvrAgentAnalysisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
