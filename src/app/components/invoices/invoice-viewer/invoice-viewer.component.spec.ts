import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { InvoiceViewerComponent } from './invoice-viewer.component';

describe('InvoiceViewerComponent', () => {
  let component: InvoiceViewerComponent;
  let fixture: ComponentFixture<InvoiceViewerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ InvoiceViewerComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(InvoiceViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
