import { Injectable, Injector } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { map } from 'rxjs/operators';


import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';
import { ChatService } from './chat.service';
import { NgZone } from '@angular/core';
import { registerFcmToken, forceRefreshToken } from '../firebase';
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
  private isInitialized = false;
  private isListenerAttached = false;

  constructor(
    private http: HttpClient,
    private injector: Injector, 
    private chatService: ChatService,
    private zone: NgZone  
  ) {}

  private get authService(): AuthService {
    return this.injector.get(AuthService);
  }
  

  async initPush(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;
  
    const platform = Capacitor.getPlatform();
    console.log("🖥️ [Push] Platform detected:", platform);
  
    if (platform === 'web') {
      if (Notification.permission === 'granted') {
        console.log("🔑 Permission already granted, requesting token...");
        const token = await registerFcmToken();
        if (token) this.fcmToken = token;
      }
      await this.initWebFCM();
    }
  
    this.refreshUnreadCount();
  }
  
  
  private async initWebFCM(): Promise<void> {
    try {
      const messaging = await getMessagingInstance();
      if (!messaging) return;
  
      if (this.isListenerAttached) {
        console.log('⚠️ [Push] Listener already attached – skipping');
        return;
      }
  
      this.isListenerAttached = true;

  
      await onMessageWeb?.(messaging, (payload: MessagePayload) => {
        console.log('📩 [Push] Web message received (raw):', JSON.stringify(payload));
  
        this.zone.run(() => {
          console.log('📩 [Push] Web message received:', payload);
  
          this.currentMessage.next(payload);
  
          // 👇 Αν υπάρχει notification στο payload → δείξε system notification
          if (payload?.notification) {
            const { title, body } = payload.notification;
            if (Notification.permission === 'granted') {
              new Notification(title || 'UniHelp', {
                body: body || 'Νέα ειδοποίηση',
                icon: '/assets/icons/icon-192x192.png',
                data: payload.data || {}
              });
            }
          }
  
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

  public async registerToken(): Promise<void> {
    console.log("🔄 [Push] registerToken() called – refreshing FCM token...");
    await this.requestWebPushToken();
  }  
  

  public async requestWebPushToken(): Promise<void> {
    try {
      const token = await registerFcmToken();
      if (token) {
        this.fcmToken = token;
        console.log('📡 Got FCM token:', token);
  
        const userId = this.authService.getUserId(); // helper που διαβάζει το user_id από localStorage
        if (userId) {
          this.sendTokenToBackend(userId, token);
        }
      } else {
        console.warn('⚠️ Token not received from Firebase');
      }
    } catch (err) {
      console.error('❌ Failed to request push token:', err);
    }
  }
  
  
  
  private sendTokenToBackend(userId: number, token: string) {
    const jwt = this.authService.getToken();
    if (!jwt) {
      console.warn('🚫 No JWT token – skipping token send');
      return;
    }
  
    const headers = { Authorization: `Bearer ${jwt}` };
    console.log(`📡 [Push] Στέλνω FCM token στο backend...`);
    console.log(`🆔 userId=${userId}, token=${token.substring(0, 20)}...`);
  
    this.http.post(`${environment.API_URL}/update-fcm-token`, {
      fcm_token: token
    }, { headers }).subscribe({
      next: res => {
        console.log('✅ [Push] Token sent successfully!');
        console.log('📥 Backend response:', res);
      },
      error: async err => {
        console.error('❌ [Push] Token send failed:', err);
      
        if (err?.status === 404 && err?.error?.details?.[0]?.errorCode === 'UNREGISTERED') {
          console.warn("⚠️ Token UNREGISTERED, retrying force refresh...");
          const newToken = await forceRefreshToken();
          if (newToken) {
            this.sendTokenToBackend(userId, newToken);
          }
        }
      }
      
    });
  }
  

  refreshUnreadCount() {
    const jwt = this.authService.getToken();
    if (!jwt) {
      console.warn('🚫 No JWT token – skipping unread count refresh');
      return;
    }
  
    const headers = { Authorization: `Bearer ${jwt}` };
    console.log('📤 Fetching unread count with token:', jwt);
  
    this.http.get<{ unread_count: number }>(`${environment.API_URL}/notifications/unread-count`, { headers })
      .pipe(map(res => res.unread_count))
      .subscribe({
        next: count => {
          console.log('🔄 Νέο unread count:', count);
          setTimeout(() => this.unreadCount$.next(count), 0);
        },
        error: err => {
          console.error('❌ Failed to fetch unread count');
          if (err && typeof err === 'object') {
            try {
              console.log('🔍 Error object:', JSON.stringify(err));
            } catch {
              console.log('🔍 Raw error (non-serializable):', err);
            }
          } else {
            console.log('🔍 Non-object error:', err);
          }
        }
        
      });
  }
  
  
}
