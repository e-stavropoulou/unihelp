import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/app/services/auth.service';
import { FooterNavComponent } from '../../components/footer-nav/footer-nav.component';
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
  styleUrls: ['./profile.page.scss'],
})
export class ProfilePage implements OnInit {
  userData: any = null;
  avatarUrl: string | null = null;

  constructor(private router: Router, private http: HttpClient, private authService: AuthService) {}

  ngOnInit() {
    const email = this.authService.getCurrentUserEmail();
    console.log('Φόρτωση προφίλ για email:', email);

    if (!email) {
      this.router.navigate(['/login']);
      return;
    }

    this.http.get<any>(`${environment.API_URL}/profile/${email}`).subscribe({
      next: (data) => {
        console.log('Δεδομένα χρήστη:', data);
        this.userData = data;
        this.avatarUrl = data.avatar_url || 'assets/img/placeholder-avatar.png';
      },
      error: () => {
        this.router.navigate(['/login']);
      }
    });
  }

  onAvatarChange(event: Event) {
    const input = event.target as HTMLInputElement;
  
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const formData = new FormData();
  
      formData.append('avatar', file);
      formData.append('email', this.userData.email); 
  
      this.http.post<any>(`${environment.API_URL}/upload-avatar`, formData).subscribe({
        next: (res) => {
          this.avatarUrl = res.avatar_url;
          this.userData.avatar_url = res.avatar_url;
        },
        error: (err) => {
          console.error('Σφάλμα στο ανέβασμα avatar:', err);
        }
      });
    }
  }
}
