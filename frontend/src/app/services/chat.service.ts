// src/app/services/chat.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthService } from './auth.service';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ChatService {
  unreadMessages$ = new BehaviorSubject<number>(0);

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

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
    );
  }

  // ✅ Άμεσο update του badge χωρίς refresh
  setUnreadCount(value: number) {
    this.unreadMessages$.next(value);
  }

  // ✅ Μείωση του badge κατά n
  decreaseUnreadCount(by: number = 1) {
    const current = this.unreadMessages$.value;
    this.unreadMessages$.next(Math.max(0, current - by));
  }
}
