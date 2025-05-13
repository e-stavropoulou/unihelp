import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-my-notes',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './my-notes.page.html',
  styleUrls: ['./my-notes.page.scss']
})
export class MyNotesPage implements OnInit {
  notes: any[] = [];

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadNotes(); 
  }

  loadNotes() {
    const token = this.authService.getToken();

    if (!token) {
      console.warn('No token found. User might not be logged in.');
      return;
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    this.http.get<any[]>(`${environment.API_URL}/my-notes`, { headers })
      .subscribe({
        next: data => this.notes = data,
        error: err => console.error('Error loading notes:', err)
      });
  }
}
