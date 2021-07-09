import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SplitMenuLangComponent } from './split-menu-lang.component';

describe('SplitMenuLangComponent', () => {
  let component: SplitMenuLangComponent;
  let fixture: ComponentFixture<SplitMenuLangComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SplitMenuLangComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SplitMenuLangComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
