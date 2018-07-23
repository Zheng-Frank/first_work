import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MenuItemsEditorComponent } from './menu-items-editor.component';

describe('MenuItemsEditorComponent', () => {
  let component: MenuItemsEditorComponent;
  let fixture: ComponentFixture<MenuItemsEditorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MenuItemsEditorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MenuItemsEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
