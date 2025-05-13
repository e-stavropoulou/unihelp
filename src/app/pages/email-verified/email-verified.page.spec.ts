import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmailVerifiedPage } from './email-verified.page';

describe('EmailVerifiedPage', () => {
  let component: EmailVerifiedPage;
  let fixture: ComponentFixture<EmailVerifiedPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EmailVerifiedPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
