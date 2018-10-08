import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FaxSettingsComponent } from './fax-settings.component';

describe('FaxSettingsComponent', () => {
  let component: FaxSettingsComponent;
  let fixture: ComponentFixture<FaxSettingsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FaxSettingsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FaxSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
