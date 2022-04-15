import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MenuOptionsAndAddonsComponent } from './menu-options-and-addons.component';

describe('MenuOptionsAndAddOnsComponent', () => {
  let component: MenuOptionsAndAddonsComponent;
  let fixture: ComponentFixture<MenuOptionsAndAddonsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MenuOptionsAndAddonsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MenuOptionsAndAddonsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
