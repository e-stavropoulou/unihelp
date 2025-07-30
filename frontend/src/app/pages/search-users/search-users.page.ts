// src/app/pages/search-users/search-users.page.ts

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/app/services/auth.service';
import { RouterModule } from '@angular/router';
import { FooterNavComponent } from 'src/app/components/footer-nav/footer-nav.component';


@Component({
  selector: 'app-search-users',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, RouterModule, FooterNavComponent],
  templateUrl: './search-users.page.html',
  styleUrls: ['./search-users.page.scss']
})
export class SearchUsersPage {
  query: string = '';
  users: any[] = [];

  constructor(private http: HttpClient, private authService: AuthService) {}

  searchUsers() {
    const trimmedQuery = this.query.trim();
    if (!trimmedQuery) {
      this.users = [];
      return;
    }

    const token = this.authService.getToken(); // παίρνουμε το JWT από localStorage

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    this.http
      .get<any[]>(`${environment.API_URL}/search-users?query=${trimmedQuery}`, { headers })
      .subscribe({
        next: (res) => {
          const currentUserId = this.authService.getUserId();
          this.users = res.filter(user => user.id !== currentUserId);
        },
        error: (err) => console.error('❌ Σφάλμα αναζήτησης χρηστών:', err)
      });
       
  }
}
