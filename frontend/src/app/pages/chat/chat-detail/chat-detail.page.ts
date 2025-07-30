import { Component, OnInit, ViewChild  } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';


import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonInput,
  IonButton,
  IonIcon,
  IonBackButton,
  IonButtons,
  IonItem
} from '@ionic/angular/standalone';
import { ChatService } from 'src/app/services/chat.service';

@Component({
  selector: 'app-chat-detail',
  templateUrl: './chat-detail.page.html',
  styleUrls: ['./chat-detail.page.scss'],
  standalone: true,
  imports: [
    IonItem,
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonContent,
    IonFooter,
    IonButton,
    IonIcon,
    IonBackButton,
    IonButtons
  ]
})
export class ChatDetailPage implements OnInit {
  chatId!: number;
  messages: any[] = [];
  newMessage: string = '';
  userId: number = 0;
  returnTo: string = '/chat';
  chatPartnerName: string = '';
  chatPartnerAvatarUrl: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private chatService: ChatService
  ) {}

  @ViewChild(IonContent) content!: IonContent;


  ngOnInit() {
    const nav = this.router.getCurrentNavigation();
    if (nav?.extras?.state?.['returnTo']) {
      this.returnTo = nav.extras.state['returnTo'];
    }

    this.chatId = Number(this.route.snapshot.paramMap.get('chatId'));
    const storedUserId = localStorage.getItem('user_id');
    this.userId = storedUserId ? Number(storedUserId) : 0;

    this.loadMessages();
    this.loadChatPartnerInfo();
  }

  ionViewDidEnter() {
    this.scrollToBottom();
    const unreadMsgs = this.messages.filter(
      (m) => m.sender_id !== this.userId && !m.is_read
    ).length;

    this.markMessagesAsRead().then(() => {
      this.chatService.decreaseUnreadCount(unreadMsgs);
    });

    // ✅ Scroll στο τέλος αφού μπεις
    setTimeout(() => this.scrollToBottom(), 200);
  }

  loadChatPartnerInfo() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const headers = {
      Authorization: `Bearer ${token}`
    };

    this.http
      .get(`${environment.API_URL}/chats/${this.chatId}/partner`, { headers })
      .subscribe({
        next: (res: any) => {
          this.chatPartnerName = res.other_username;
          this.chatPartnerAvatarUrl = res.other_avatar;
        },
        error: (err) => {
          console.error('❌ Σφάλμα συνομιλητή:', err);
          this.chatPartnerName = 'Χρήστης';
        }
      });
  }

  goBack() {
    this.router.navigateByUrl(this.returnTo);
  }

  markMessagesAsRead(): Promise<void> {
    return new Promise((resolve, reject) => {
      const token = localStorage.getItem('token');
      if (!token) return reject();

      const headers = {
        Authorization: `Bearer ${token}`
      };

      this.http
        .put(`${environment.API_URL}/chats/${this.chatId}/mark-read`, {}, { headers })
        .subscribe({
          next: () => resolve(),
          error: (err) => {
            console.error('🚫 Mark read error:', err);
            reject(err);
          }
        });
    });
  }

  loadMessages() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const headers = {
      Authorization: `Bearer ${token}`
    };

    this.http
      .get(`${environment.API_URL}/chats/${this.chatId}/messages`, { headers })
      .subscribe({
        next: (res: any) => {
          this.messages = res;
          this.scrollToBottom();

        },
        error: (err) => console.error('🚫 Failed to fetch messages:', err)
      });
  }

  sendMessage() {
    if (!this.newMessage.trim()) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const headers = {
      Authorization: `Bearer ${token}`
    };

    const messagePayload = {
      content: this.newMessage
    };

    this.http
      .post(`${environment.API_URL}/chats/${this.chatId}/messages`, messagePayload, { headers })
      .subscribe({
        next: () => {
          this.newMessage = '';
          this.loadMessages();

          // ✅ Μετά την αποστολή scroll κάτω
          setTimeout(() => this.scrollToBottom(), 300);
        },
        error: (err) => console.error('🚫 Failed to send message:', err)
      });
  }

  scrollToBottom() {
    setTimeout(() => {
      this.content.scrollToBottom(300);
    }, 100); // μικρό delay για να έχει κάνει render
  }
  
}
