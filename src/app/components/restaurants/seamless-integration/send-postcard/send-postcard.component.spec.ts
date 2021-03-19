import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SendPostcardComponent } from './send-postcard.component';

describe('SendPostcardComponent', () => {
  let component: SendPostcardComponent;
  let fixture: ComponentFixture<SendPostcardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SendPostcardComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SendPostcardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
