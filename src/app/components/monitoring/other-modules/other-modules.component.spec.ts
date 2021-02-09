import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { OtherModulesComponent } from './other-modules.component';

describe('OtherModulesComponent', () => {
  let component: OtherModulesComponent;
  let fixture: ComponentFixture<OtherModulesComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ OtherModulesComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OtherModulesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
