import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UploadNotesPage } from './upload-notes.page';

describe('UploadNotesPage', () => {
  let component: UploadNotesPage;
  let fixture: ComponentFixture<UploadNotesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(UploadNotesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
