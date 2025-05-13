import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VerifyInvalidPage } from './verify-invalid.page';

describe('VerifyInvalidPage', () => {
  let component: VerifyInvalidPage;
  let fixture: ComponentFixture<VerifyInvalidPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(VerifyInvalidPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
