import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LaunchPage } from './launch.page';

describe('LaunchPage', () => {
  let component: LaunchPage;
  let fixture: ComponentFixture<LaunchPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(LaunchPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
