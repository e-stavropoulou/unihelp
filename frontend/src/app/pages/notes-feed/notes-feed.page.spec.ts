import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotesFeedPage } from './notes-feed.page';

describe('NotesFeedPage', () => {
  let component: NotesFeedPage;
  let fixture: ComponentFixture<NotesFeedPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(NotesFeedPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
