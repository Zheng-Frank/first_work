import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GmbBizListComponent } from './gmb-biz-list.component';

describe('GmbBizListComponent', () => {
  let component: GmbBizListComponent;
  let fixture: ComponentFixture<GmbBizListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GmbBizListComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GmbBizListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
