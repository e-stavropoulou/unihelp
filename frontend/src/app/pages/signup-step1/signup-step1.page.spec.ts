import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SignupStep1Page } from './signup-step1.page';

describe('SignupStep1Page', () => {
  let component: SignupStep1Page;
  let fixture: ComponentFixture<SignupStep1Page>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SignupStep1Page);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
