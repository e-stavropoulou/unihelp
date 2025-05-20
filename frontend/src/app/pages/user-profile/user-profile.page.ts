import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './user-profile.page.html',
  styleUrls: ['./user-profile.page.scss']
})
export class UserProfilePage implements OnInit {
  user: {
    id: number;
    username: string;
    email: string;
    avatar: string;
    department: string;
    upoints: number;
    can_help_courses: string[];
    needs_help_courses: string[];
  } | null = null;

  avatarUrl: string = 'assets/img/placeholder-avatar.png';
  avatarVisible = false;  // για animation fade-in (αν το θέλεις)

  constructor(
    private route: ActivatedRoute, 
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadUserProfile();
  }

  loadUserProfile() {
    const userId = Number(this.route.snapshot.paramMap.get('id'));
    if (isNaN(userId)) {
      console.error('❌ Το ID δεν είναι έγκυρο');
      return;
    }

    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    this.http.get<any>(`${environment.API_URL}/user-profile/${userId}`, { headers }).subscribe({
      next: (res) => {
        this.user = res;
    
        this.avatarVisible = false;
        setTimeout(() => {
          this.avatarUrl = res.avatar_url 
            ? `${environment.API_URL}${res.avatar_url}` 
            : 'assets/img/placeholder-avatar.png';
          this.avatarVisible = true;
        }, 100);
      },
      error: (err) => {
        console.error('❌ Σφάλμα:', err);
        this.user = null;
      }
    });    
  }
}
