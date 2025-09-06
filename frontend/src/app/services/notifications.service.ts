import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { map } from 'rxjs/operators';


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
  private isInitialized = false;
  private isListenerAttached = false;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private chatService: ChatService,
    private zone: NgZone  
  ) {}

  async initPush(userId?: number): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ [Push] initPush already called – skipping');
      return;
    }
  
    this.isInitialized = true;
  
    const platform = Capacitor.getPlatform();
    if (platform === 'web') {
      await this.initWebFCM();
    }
  
    this.refreshUnreadCount();
  }
  
  

  /** 🔹 ΜΟΝΟ listener για Web (token ζητείται από user gesture) */
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
        this.zone.run(() => {
          console.log('📩 [Push] Web message received:', payload);
  
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
