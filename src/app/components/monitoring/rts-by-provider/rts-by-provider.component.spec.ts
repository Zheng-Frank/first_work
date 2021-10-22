import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RtsByProviderComponent } from './rts-by-provider.component';

describe('RtsByProviderComponent', () => {
  let component: RtsByProviderComponent;
  let fixture: ComponentFixture<RtsByProviderComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RtsByProviderComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RtsByProviderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
