import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ItemSorterComponent } from './item-sorter.component';

describe('ItemSorterComponent', () => {
  let component: ItemSorterComponent;
  let fixture: ComponentFixture<ItemSorterComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ItemSorterComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ItemSorterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
