import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/app/services/auth.service';
import { NotificationsService } from 'src/app/services/notifications.service';

import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonText,
  IonButtons,
  IonButton,
  IonIcon
} from '@ionic/angular/standalone';

import { CommonModule } from '@angular/common';
import { FooterNavComponent } from 'src/app/components/footer-nav/footer-nav.component';

@Component({
  selector: 'app-notifications',
  standalone: true,
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
  imports: [
    CommonModule, 
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonText,
    IonButtons, 
    IonButton,  
    IonIcon,    
    FooterNavComponent
  ]
})
export class NotificationsPage implements OnInit {
  notifications: any[] = [];
  isLoading = true;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private notificationsService: NotificationsService
  ) {}

  showEnableBtn = false;
  

  async ngOnInit() {
  console.log('🚀 Notifications page loaded');

  // ✅ Εμφάνισε κουμπί ενεργοποίησης μόνο αν δεν έχει token
  if (!this.notificationsService.fcmToken) {
    this.showEnableBtn = true;
  }

  try {
    await this.notificationsService.initPush();
    this.showEnableBtn = false;
  } catch (err) {
    console.warn('⚠️ Push init failed (ignored):', err);
  }

  const token = this.authService.getToken();
  if (!token) {
    console.warn('⛔️ JWT token not found, skipping fetch');
    this.isLoading = false;
    return;
  }

  this.fetchNotifications(token);
  this.notificationsService.currentMessage.subscribe((msg) => {
    if (msg) {
      console.log('📥 Λήφθηκε νέα push ειδοποίηση, φέρνω από backend...');
      const token = this.authService.getToken();
      if (token) this.fetchNotifications(token);
    }
  });
  
  
}

  fetchNotifications(token: string) {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.get<any[]>(`${environment.API_URL}/notifications`, { headers })
      .subscribe({
        next: (data) => {
          console.log('✅ Notifications fetched:', data);
          this.notifications = data;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('❌ Failed to fetch notifications:', err);
          this.isLoading = false;
        }
      });
  }

  markAsRead(id: number) {
    const token = this.authService.getToken();
    if (!token) return;
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
  
    this.http.post(`${environment.API_URL}/notifications/${id}/read`, {}, { headers }).subscribe({
      next: () => {
        this.notifications = this.notifications.map(n => n.id === id ? { ...n, is_read: true } : n);
        this.notificationsService.refreshUnreadCount(); // ✅ Ενημέρωση badge
      },
      error: err => console.error('❌ Read failed:', err)
    });
  }
  

  deleteNotification(id: number) {
    const token = this.authService.getToken();
    if (!token) return;
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
  
    this.http.delete(`${environment.API_URL}/notifications/${id}`, { headers }).subscribe({
      next: () => {
        const deleted = this.notifications.find(n => n.id === id);
        this.notifications = this.notifications.filter(n => n.id !== id);
        if (deleted?.is_read === false) {
          this.notificationsService.refreshUnreadCount(); // ✅ Αν ήταν αδιάβαστη, μείωσε
        }
      },
      error: err => console.error('❌ Delete failed:', err)
    });
  }  

  enablePush() {
    const userId = this.authService.getUserId();
    if (userId !== null) {
      this.notificationsService.initPush(userId).then(() => {
        this.showEnableBtn = false;
      });
    } else {
      console.warn('⛔️ Δεν βρέθηκε userId, δεν ενεργοποιήθηκαν οι ειδοποιήσεις');
    }
  }
  
  
}
