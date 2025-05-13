import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VerifyInfoPage } from './verify-info.page';

describe('VerifyInfoPage', () => {
  let component: VerifyInfoPage;
  let fixture: ComponentFixture<VerifyInfoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(VerifyInfoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
