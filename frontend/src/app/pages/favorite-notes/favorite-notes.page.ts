import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from 'src/app/services/auth.service';
import { environment } from 'src/environments/environment';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';


@Component({
  selector: 'app-favorite-notes',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './favorite-notes.page.html',
  styleUrls: ['./favorite-notes.page.scss']
})
export class FavoriteNotesPage implements OnInit {
  favoriteNotes: any[] = [];

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit() {
    const token = this.authService.getToken();

    if (!token) {
      console.warn('No token found. User might not be logged in.');
      return;
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    this.http.get<any[]>(`${environment.API_URL}/favorites`, { headers })
      .subscribe({
        next: data => this.favoriteNotes = data,
        error: err => console.error('Error loading favorites:', err)
      });
  }

  
  removeFromFavorites(noteId: number) {
    const token = this.authService.getToken();

    if (!token) {
      console.warn('No token found');
      return;
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    this.http.post(`${environment.API_URL}/favorite`, { note_id: noteId }, { headers })
      .subscribe({
        next: () => {
          this.favoriteNotes = this.favoriteNotes.filter(note => note.id !== noteId);
          console.log(`Note ${noteId} removed from favorites`);
        },
        error: (err) => {
          console.error('❌ Σφάλμα κατά την αφαίρεση από τα αγαπημένα:', err);
        }
      });
  }

  openNote(note: any) {
    const token = this.authService.getToken();
    if (!token) {
      console.warn('No token found. User might not be logged in.');
      return;
    }
  
    const directUrl = `${environment.API_URL}/download/${note.id}?jwt=${encodeURIComponent(token)}`;
  
    if (Capacitor.isNativePlatform()) {
      Browser.open({ url: directUrl });
    } else {
      window.open(directUrl, '_blank', 'noopener,noreferrer');
    }
  }
  
  
}
