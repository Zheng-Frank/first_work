import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PostmatesListComponent } from './postmates-list.component';

describe('PostmatesListComponent', () => {
  let component: PostmatesListComponent;
  let fixture: ComponentFixture<PostmatesListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PostmatesListComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PostmatesListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
