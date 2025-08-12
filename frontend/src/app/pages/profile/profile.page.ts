import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/app/services/auth.service';
import { FooterNavComponent } from '../../components/footer-nav/footer-nav.component';
import { Browser } from '@capacitor/browser';
import { SsoService } from 'src/app/services/sso.service'; 

import {
  IonHeader,
  IonFooter,
  IonToolbar,
  IonTitle,
  IonContent,
  IonLabel,
  IonList,
  IonItem,
  IonButton,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardContent,
  IonIcon
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FooterNavComponent,
    HttpClientModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonCard,
    IonCardContent,
    IonIcon
  ],
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss']
})
export class ProfilePage implements OnInit {
  userData: any = null;
  canHelpCourses: string[] = [];
  needsHelpCourses: string[] = [];
  avatarUrl: string | null = null;
  avatarVisible = false; // για animation
  userPoints: number = 0;


  constructor(private router: Router, private http: HttpClient, private authService: AuthService, private ssoService: SsoService ) {}

  ngOnInit() {
    this.loadUserData();
  }

  ionViewWillEnter() {
    this.loadUserData();
  }

  loadUserData() {
    const token = this.authService.getToken();
    if (!token) {
      console.warn('[DEBUG] No JWT token found, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }
  
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  
    this.http.get<any>(`${environment.API_URL}/profile`, { headers }).subscribe({
      next: (data) => {
        console.log('[DEBUG] /profile response data:', data);
        console.log('[DEBUG] /profile full data:', data);
        console.log('[DEBUG] upoints received:', data.upoints);
        this.userData = data;
        this.canHelpCourses = data.can_help_courses || [];
        this.needsHelpCourses = data.needs_help_courses || [];
        this.userPoints = data.upoints || 0;

  
        this.avatarVisible = false; // για fade-in
        setTimeout(() => {
          const backendBase = environment.API_URL;
          const rawAvatar = data.avatar_url;
  
          if (rawAvatar?.startsWith('http')) {
            this.avatarUrl = `${rawAvatar}?v=${new Date().getTime()}`;
          } else if (rawAvatar) {
            this.avatarUrl = `${backendBase}${rawAvatar}?v=${new Date().getTime()}`;
          } else {
            this.avatarUrl = 'assets/img/placeholder-avatar.png';
          }
  
          this.avatarVisible = true;
        }, 100);
      },
      error: (error) => {
        console.error('[DEBUG] /profile load error:', error);
        this.router.navigate(['/login']);
      }
    });
  }

  openAdminDashboard(): void {
    this.ssoService.openAdminDashboard();
  }
  
  
  

  onAvatarChange(event: Event) {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files[0]) {
      const file = input.files[0];
      const formData = new FormData();
      formData.append('avatar', file);

      const token = this.authService.getToken();
      if (!token) return;

      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`
      });

      this.http.post<any>(`${environment.API_URL}/upload-avatar`, formData, { headers }).subscribe({
        next: () => {
          this.loadUserData(); 
        },
        error: (err) => {
          console.error('Σφάλμα στο ανέβασμα avatar:', err);
        }
      });
    }
  }
}

