import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SignupStep2Page } from './signup-step2.page';

describe('SignupStep2Page', () => {
  let component: SignupStep2Page;
  let fixture: ComponentFixture<SignupStep2Page>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SignupStep2Page);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
