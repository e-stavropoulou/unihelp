import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditNeedsHelpPage } from './edit-needs-help.page';

describe('EditNeedsHelpPage', () => {
  let component: EditNeedsHelpPage;
  let fixture: ComponentFixture<EditNeedsHelpPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EditNeedsHelpPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
