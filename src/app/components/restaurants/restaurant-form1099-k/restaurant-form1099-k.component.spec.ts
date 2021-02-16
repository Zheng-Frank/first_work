import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { Form1099KComponent } from './form1099-k.component';

describe('Form1099KComponent', () => {
  let component: Form1099KComponent;
  let fixture: ComponentFixture<Form1099KComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ Form1099KComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(Form1099KComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
