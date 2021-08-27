import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CleanMenusComponent } from './clean-menus.component';

describe('CleanMenusComponent', () => {
  let component: CleanMenusComponent;
  let fixture: ComponentFixture<CleanMenusComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CleanMenusComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CleanMenusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
