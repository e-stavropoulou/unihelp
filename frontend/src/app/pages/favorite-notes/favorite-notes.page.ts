import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from 'src/app/services/auth.service';
import { environment } from 'src/environments/environment';

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
}

