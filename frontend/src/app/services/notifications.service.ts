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
import { ChatService } from './chat.service';
import { NgZone } from '@angular/core';
//import { MessagePayload } from 'firebase/messaging';


import {
  getMessagingInstance,
  getTokenWeb,
  onMessageWeb
} from '../firebase';

export interface MessagePayload {
  data?: { [key: string]: string };
  notification?: { title?: string; body?: string };
}

@Injectable({
  providedIn: 'root'
})

export class NotificationsService {
  currentMessage = new BehaviorSubject<any>(null);
  newChatMessage$ = new BehaviorSubject<any>(null);
  unreadCount$ = new BehaviorSubject<number>(0);
  public fcmToken: string | null = null;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private chatService: ChatService,
    private zone: NgZone  
  ) {}

  async initPush(userId?: number): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      console.log('🌐 Web platform detected');
      await this.initWebFCM();
    } else {
      console.log('📱 Native platform detected');
      await this.initNativePush(userId);
    }

    this.refreshUnreadCount();
  }

  /** 🔹 ΜΟΝΟ listener για Web (token ζητείται από user gesture) */
  private async initWebFCM(): Promise<void> {
    try {
      const messaging = await getMessagingInstance();
      if (!messaging) return;
  
      await onMessageWeb?.(messaging, (payload: MessagePayload) => {
        this.zone.run(() => {
          console.log('📩 Web push received:', payload);
  
          this.currentMessage.next(payload);
  
          const type = payload?.data?.['type'];
          const chatId = payload?.data?.['chat_id'];

          if (type === 'points') {
            console.log('🎯 Web push για επιβράβευση!');
            this.unreadCount$.next(this.unreadCount$.value + 1);
            return;
          }

          if (type === 'note') {
            console.log('🆕 Web push για νέα σημείωση!');
            this.unreadCount$.next(this.unreadCount$.value + 1);
            return;
          }
  
          if (type === 'message' && chatId) {
            const currentChatId = this.chatService.currentChatId$.value;
  
            if (currentChatId && currentChatId === Number(chatId)) {
              this.chatService.newChatMessage$.next({
                ...payload.data,
                is_read: true
              });
              this.chatService.markChatAsRead(Number(chatId))?.subscribe();
            } else {
              this.chatService.increaseUnreadCount();
              this.chatService.newChatMessage$.next({
                ...payload.data,
                is_read: false
              });
            }
  
            this.chatService.refreshUnreadMessages();
          } else {
            console.warn('⚠️ Push δεν αφορά chat ή λείπουν δεδομένα:', payload?.data);
          }
        });
      });
  
    } catch (err) {
      console.error('❌ Web FCM error:', err);
    }
  }
  

  /** 🔹 Χρησιμοποιείται με κουμπί - ΜΟΝΟ σε user gesture */
  public async requestWebPushToken(userId: number): Promise<void> {
    try {
      const messaging = await getMessagingInstance();
      if (!messaging) return;

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('🚫 User denied push permission');
        return;
      }

      const token = await getTokenWeb?.(messaging, {
        vapidKey: environment.vapidKey
      });
      

      if (!token) {
        console.warn('🚫 No token received');
        return;
      }

      this.fcmToken = token;
      localStorage.setItem('fcm_token', token);
      console.log('📲 Web push token:', token);

      this.sendTokenToBackend(userId, token);

    } catch (err) {
      console.error('❌ Failed to request web token:', err);
    }
  }

  /** 🔹 Native Push για κινητά */
  private async initNativePush(userId?: number): Promise<void> {
    console.log('📱 [initNativePush] Starting native push setup...');

    const permStatus = await PushNotifications.requestPermissions();
    if (permStatus.receive !== 'granted') {
      console.warn('❌ Push permission not granted');
      return;
    }

    console.log('🟢 Push permission granted, registering...');
    await PushNotifications.register();

    PushNotifications.addListener('registration', (token: Token) => {
      console.log('👉 Received FCM token:', token.value);
      this.fcmToken = token.value;
      if (userId) this.sendTokenToBackend(userId, token.value);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      this.zone.run(() => {
        console.log('📩 Push received (foreground):', notification);
        
        this.currentMessage.next(notification);

        if (notification?.data?.type === 'points') {
          console.log('🎯 Native push για επιβράβευση!');
          this.unreadCount$.next(this.unreadCount$.value + 1);
          return;
        }
        

        if (notification?.data?.type === 'note') {
          console.log('🆕 Native push για νέα σημείωση!');
          this.unreadCount$.next(this.unreadCount$.value + 1);
          return;
        }
    
        if (notification?.data?.type === 'chat') {
          const chatId = Number(notification.data.chat_id);
          const currentChatId = this.chatService.currentChatId$.value;
        
          if (currentChatId && currentChatId === chatId) {
            // ✅ Είμαι ήδη στο chat -> mark read
            this.chatService.newChatMessage$.next({
              ...notification.data,
              is_read: true
            });
            this.chatService.markChatAsRead(chatId)?.subscribe();
          } else {
            // ❌ Εκτός chat -> unread
            this.chatService.increaseUnreadCount();
            this.chatService.newChatMessage$.next({
              ...notification.data,
              is_read: false
            });
          }
        }
        
      });
    });
    
    

    PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      console.log('👆 Notification tapped:', action);
      // optional redirect here
    });
  }

  /** 🔹 Στέλνει FCM token στο backend */
  private sendTokenToBackend(userId: number, token: string) {
    const jwt = this.authService.getToken();
    if (!jwt) return;

    const headers = { Authorization: `Bearer ${jwt}` };

    this.http.post(`${environment.API_URL}/update-fcm-token`, {
      fcm_token: token
    }, { headers }).subscribe({
      next: () => console.log('✅ Token sent to backend'),
      error: err => console.error('❌ Token send failed:', err)
    });
  }

  /** 🔹 Πάρε αριθμό αδιάβαστων ειδοποιήσεων */
  refreshUnreadCount() {
    const jwt = this.authService.getToken();
    if (!jwt) return;
  
    const headers = { Authorization: `Bearer ${jwt}` };
  
    this.http.get<{ unread_count: number }>(`${environment.API_URL}/notifications/unread-count`, { headers })
      .pipe(map(res => res.unread_count))
      .subscribe({
        next: count => {
          console.log('🔄 Νέο unread count:', count); // 👈 Δες αν αλλάζει
          setTimeout(() => this.unreadCount$.next(count), 0); // 🔁 async trigger για UI refresh

        },
        error: err => console.error('❌ Failed to fetch unread count', err)
      });
  }
  
}
