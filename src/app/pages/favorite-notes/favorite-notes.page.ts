import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { AuthService } from 'src/app/services/auth.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-favorite-notes',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './favorite-notes.page.html',
  styleUrls: ['./favorite-notes.page.scss'],
})
export class FavoriteNotesPage implements OnInit {
  favoriteNotes: any[] = [];

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.http.get<any[]>(`${environment.API_URL}/favorites`, {
      headers: {
        Authorization: `Bearer ${this.authService.getToken()}`
      }
    }).subscribe(data => {
      this.favoriteNotes = data;
    });
  }
}
