import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SendFaxComponent } from './send-fax.component';

describe('SendFaxComponent', () => {
  let component: SendFaxComponent;
  let fixture: ComponentFixture<SendFaxComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SendFaxComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SendFaxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
