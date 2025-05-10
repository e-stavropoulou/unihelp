import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FavoriteNotesPage } from './favorite-notes.page';

describe('FavoriteNotesPage', () => {
  let component: FavoriteNotesPage;
  let fixture: ComponentFixture<FavoriteNotesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(FavoriteNotesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
