import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CouponImportComponent } from './coupon-import.component';

describe('CouponImportComponent', () => {
  let component: CouponImportComponent;
  let fixture: ComponentFixture<CouponImportComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CouponImportComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CouponImportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
