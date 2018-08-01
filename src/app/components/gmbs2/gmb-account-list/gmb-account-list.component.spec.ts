import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GmbAccountListComponent } from './gmb-account-list.component';

describe('GmbAccountListComponent', () => {
  let component: GmbAccountListComponent;
  let fixture: ComponentFixture<GmbAccountListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GmbAccountListComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GmbAccountListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
