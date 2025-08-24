import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PointsInfoPage } from './points-info.page';

describe('PointsInfoPage', () => {
  let component: PointsInfoPage;
  let fixture: ComponentFixture<PointsInfoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PointsInfoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
