// src/app/services/notifications.service.ts
import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { map } from 'rxjs/operators';
import {
  PushNotifications,
  Token,
  PushNotificationSchema,
  ActionPerformed
} from '@capacitor/push-notifications';

import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';

import {
  getMessagingInstance,
  getToken,
  onMessage
} from '../firebase';

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {
  currentMessage = new BehaviorSubject<any>(null);

  unreadCount$ = new BehaviorSubject<number>(0);

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  async initPush(userId?: number): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      console.log('🌐 Web platform detected');
      await this.initWebFCM(userId);
    } else {
      console.log('📱 Native platform detected');
      await this.initNativePush(userId);
    }

    // 👀 Πάρε αριθμό αδιάβαστων ειδοποιήσεων στην αρχή
    this.refreshUnreadCount();
  }

  private async initWebFCM(userId?: number): Promise<void> {
    try {
      const messaging = await getMessagingInstance();
      if (!messaging) return;

      const token = await getToken(messaging, {
        vapidKey: environment.firebase.vapidKey
      });

      if (token && userId) this.sendTokenToBackend(userId, token);

      onMessage(messaging, (payload) => {
        console.log('📩 Web push:', payload);
        this.currentMessage.next(payload);
        this.refreshUnreadCount(); // 🆕
      });
    } catch (err) {
      console.error('❌ Web FCM error:', err);
    }
  }

  private async initNativePush(userId?: number): Promise<void> {
    console.log('📱 [initNativePush] Starting native push setup...');
  
    const permStatus = await PushNotifications.requestPermissions();
    if (permStatus.receive !== 'granted') {
      console.warn('❌ Push permission not granted');
      return;
    }
  
    console.log('🟢 Push permission granted, registering...');
    await PushNotifications.register();
  
    console.log('📲 Listening for registration...');
    PushNotifications.addListener('registration', (token: Token) => {
      console.log('👉 Received FCM token:', token.value);
  
      if (userId) {
        this.sendTokenToBackend(userId, token.value);
      } else {
        console.warn('⚠️ No userId passed to initPush(), token NOT sent to backend');
      }
    });
  
    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('📩 Push received (foreground):', notification);
      this.currentMessage.next(notification);
      this.refreshUnreadCount();
    });
  
    PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      console.log('👆 Notification tapped:', action);
      // Add navigation logic here if needed
    });
  }
  

  private sendTokenToBackend(userId: number, token: string) {
    const jwt = this.authService.getToken();
    if (!jwt) return;

    const headers = { Authorization: `Bearer ${jwt}` };

    this.http.post(`${environment.API_URL}/update-fcm-token`, {
      fcm_token: token
    }, { headers }).subscribe({
      next: () => console.log('✅ Token sent'),
      error: err => console.error('❌ Token send failed:', err)
    });
  }

  // 🆕 Επιστροφή αριθμού αδιάβαστων ειδοποιήσεων
  refreshUnreadCount() {
    const jwt = this.authService.getToken();
    if (!jwt) return;

    const headers = { Authorization: `Bearer ${jwt}` };

    this.http.get<{ unread_count: number }>(`${environment.API_URL}/notifications/unread-count`, { headers })
      .pipe(map(res => res.unread_count))
      .subscribe({
        next: count => this.unreadCount$.next(count),
        error: err => console.error('❌ Failed to fetch unread count', err)
      });
  }
}