import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ChangeOwnershipComponent } from './change-ownership.component';

describe('ChangeOwnershipComponent', () => {
  let component: ChangeOwnershipComponent;
  let fixture: ComponentFixture<ChangeOwnershipComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ChangeOwnershipComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ChangeOwnershipComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
