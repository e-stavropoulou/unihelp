import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SsoRedirectPage } from './sso-redirect.page';

describe('SsoRedirectPage', () => {
  let component: SsoRedirectPage;
  let fixture: ComponentFixture<SsoRedirectPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SsoRedirectPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
