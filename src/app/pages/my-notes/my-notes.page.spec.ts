import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MyNotesPage } from './my-notes.page';

describe('MyNotesPage', () => {
  let component: MyNotesPage;
  let fixture: ComponentFixture<MyNotesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MyNotesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
