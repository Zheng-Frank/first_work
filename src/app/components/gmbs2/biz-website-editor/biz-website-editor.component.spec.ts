import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BizWebsiteEditorComponent } from './biz-website-editor.component';

describe('BizWebsiteEditorComponent', () => {
  let component: BizWebsiteEditorComponent;
  let fixture: ComponentFixture<BizWebsiteEditorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BizWebsiteEditorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BizWebsiteEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
