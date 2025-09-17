import { Component, OnInit, ViewChild  } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Subscription, timestamp } from 'rxjs';
import { NgZone } from '@angular/core';




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
  private messageSub!: Subscription;


  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private chatService: ChatService,
    private ngZone: NgZone
  ) {}

  @ViewChild(IonContent) content!: IonContent;


  ngOnInit() {
    const nav = this.router.getCurrentNavigation();
    if (nav?.extras?.state?.['returnTo']) {
      this.returnTo = nav.extras.state['returnTo'];
    }
  
    this.chatId = Number(this.route.snapshot.paramMap.get('chatId'));
    this.chatService.setCurrentChatId(this.chatId);


    const storedUserId = localStorage.getItem('user_id');
    this.userId = storedUserId ? Number(storedUserId) : 0;
  
    this.loadMessages();
    this.loadChatPartnerInfo();
  
    // ✅ Συνδρομή σε νέα μηνύματα από FCM
    this.messageSub = this.chatService.newChatMessage$.subscribe((message) => {
      if (!message) return;
  
      const incomingChatId = Number(message.chat_id);
      const currentChatId = Number(this.chatId);
  
      if (incomingChatId === currentChatId) {
        // ✅ Αν το μήνυμα είναι από τον ίδιο τον χρήστη, αγνόησέ το
        if (Number(message.sender_id) === this.userId) return;
      
        this.ngZone.run(() => {
          const cleanedMessage = {
            ...message,
            sender_id: Number(message.sender_id),
            timestamp: new Date(message.timestamp || message.created_at || Date.now()),
            is_read: true
          };
      
          this.messages = [...this.messages, cleanedMessage];
          console.log('📩 Messages length after push:', this.messages.length);
          this.scrollToBottom();
        });
      }      
    });
  }
  

  ngOnDestroy() {
    this.chatService.setCurrentChatId(null); 

    if (this.messageSub) {
      this.messageSub.unsubscribe();
    }
  }
  
  
  

  ionViewDidEnter() {
    this.scrollToBottom();
    const unreadMsgs = this.messages.filter(
      (m) => m.sender_id !== this.userId && !m.is_read
    ).length;

    this.markMessagesAsRead().then(() => {
      this.chatService.decreaseUnreadCount(unreadMsgs);
      this.chatService.refreshUnreadMessages(); 
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
      .get<any[]>(`${environment.API_URL}/chats/${this.chatId}/messages`, { headers })
      .subscribe({
        next: (res) => {
          this.messages = res.map(m => ({
            ...m,
            sender_id: Number(m.sender_id),
            timestamp: m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp),
            is_read: !!m.is_read
          }));
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
    next: (res: any) => {
      this.newMessage = '';

      const newMsg = {
        id: res.id,
        chat_id: this.chatId,
        sender_id: this.userId,
        content: messagePayload.content,
        timestamp: new Date(),
        is_read: true
      };

      this.messages = [...this.messages, newMsg];
      this.scrollToBottom();
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
