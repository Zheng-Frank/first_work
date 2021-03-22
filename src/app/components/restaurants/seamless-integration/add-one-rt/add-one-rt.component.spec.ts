import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AddOneRtComponent } from './add-one-rt.component';

describe('AddOneRtComponent', () => {
  let component: AddOneRtComponent;
  let fixture: ComponentFixture<AddOneRtComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AddOneRtComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AddOneRtComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
