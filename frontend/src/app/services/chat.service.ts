// src/app/services/chat.service.ts
import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthService } from './auth.service';
import { map } from 'rxjs/operators';
import { getMessagingInstance, onMessageWeb } from 'src/app/firebase';
import { MessagePayload } from './notifications.service'; 

//import { onMessage, getMessaging } from 'firebase/messaging';
//import { firebaseApp } from 'src/app/firebase';

@Injectable({ providedIn: 'root' })
export class ChatService {
  unreadMessages$ = new BehaviorSubject<number>(0);
  newChatMessage$ = new BehaviorSubject<any>(null);  
  currentChatId$ = new BehaviorSubject<number | null>(null);

  setCurrentChatId(chatId: number | null) {
    this.currentChatId$.next(chatId);
  }

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private ngZone: NgZone
  ) {
  }

  async listenForNewMessages() {
    const messaging = await getMessagingInstance();
    if (!messaging) return; 
  
    await onMessageWeb?.(messaging, (payload: MessagePayload) => {
      console.log('📥 Νέο μήνυμα από FCM:', payload);
  
      let parsedDate: Date;
      const rawDate = payload.data?.['created_at'];
  
      try {
        parsedDate = new Date(rawDate ?? '');
        if (isNaN(parsedDate.getTime())) throw new Error('Invalid date format');
      } catch (err) {
        console.warn('❌ Invalid created_at date, fallback to now:', rawDate);
        parsedDate = new Date();
      }
  
      const message = {
        chat_id: Number(payload.data?.['chat_id']),
        sender_id: Number(payload.data?.['sender_id']),
        content: payload.data?.['content'],
        created_at: parsedDate
      };
  
      this.ngZone.run(() => {
        const currentChatId = this.currentChatId$.value;
  
        if (currentChatId && currentChatId === message.chat_id) {
          this.newChatMessage$.next({ ...message, is_read: true });
          setTimeout(() => {
            this.markChatAsRead(message.chat_id)?.subscribe();
          }, 300);
        } else {
          this.increaseUnreadCount();
          this.newChatMessage$.next({ ...message, is_read: false });
        }
      });
    });
  }
  
  

  refreshUnreadMessages() {
    const token = this.authService.getToken();
    if (!token) return;

    const headers = { Authorization: `Bearer ${token}` };

    this.http
      .get<{ unread_count: number }>(
        `${environment.API_URL}/messages/unread-count`,
        { headers }
      )
      .pipe(map((res) => res.unread_count))
      .subscribe({
        next: (count) => this.unreadMessages$.next(count),
        error: (err) =>
          console.error('❌ Failed to fetch unread messages count', err),
      });
  }

  markChatAsRead(chatId: number) {
    const token = this.authService.getToken();
    if (!token) return;
  
    const headers = { Authorization: `Bearer ${token}` };
  
    return this.http.put(
      `${environment.API_URL}/chats/${chatId}/mark-read`,
      {},
      { headers }
    ).pipe(
      map((res) => {
        this.refreshUnreadMessages();  
        return res;
      })
    );
  }
  

  setUnreadCount(value: number) {
    this.unreadMessages$.next(value);
  }

  decreaseUnreadCount(by: number = 1) {
    const current = this.unreadMessages$.value;
    this.unreadMessages$.next(Math.max(0, current - by));
  }

  increaseUnreadCount(by: number = 1) {
    const newCount = this.unreadMessages$.value + by;
    this.unreadMessages$.next(newCount);
    console.log('🔁 Badge updated via increaseUnreadCount:', newCount);
  }
}
