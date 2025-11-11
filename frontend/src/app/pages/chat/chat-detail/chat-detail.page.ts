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
  recipientId: number | null = null;
  isNewChat = false;
  isUserNearBottom: boolean = true;




  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private chatService: ChatService,
    private ngZone: NgZone
  ) {}

  @ViewChild(IonContent) content!: IonContent;

  private pollingInterval: any;

  ngOnInit() {
    const nav = this.router.getCurrentNavigation();
    if (nav?.extras?.state?.['returnTo']) {
      this.returnTo = nav.extras.state['returnTo'];
    }
  
    const idParam = this.route.snapshot.paramMap.get('chatId');
    this.chatId = idParam === 'new' ? 0 : Number(idParam);
    this.isNewChat = idParam === 'new';
  
    this.recipientId = Number(this.route.snapshot.queryParamMap.get('recipient_id'));
  
    this.chatService.setCurrentChatId(this.chatId || null);
  
    const storedUserId = localStorage.getItem('user_id');
    this.userId = storedUserId ? Number(storedUserId) : 0;

    if (this.isNewChat) {
      this.loadChatPartnerInfo();
    } else {
      this.loadMessages();
      this.loadChatPartnerInfo();
    }
  
   
    this.messageSub = this.chatService.newChatMessage$.subscribe((message) => {
      if (!message) return;
  
      const incomingChatId = Number(message.chat_id);
      const currentChatId = Number(this.chatId);
  
      if (incomingChatId === currentChatId) {
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
    if (this.pollingInterval) clearInterval(this.pollingInterval);
  }
  
  
  ionViewWillLeave() {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
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

    
    setTimeout(() => this.scrollToBottom(), 200);

    this.pollingInterval = setInterval(() => {
      this.loadMessages(true); 
    }, 3000);
  }

  loadChatPartnerInfo() {
    const token = localStorage.getItem('token');
    if (!token) return;
  
    const headers = { Authorization: `Bearer ${token}` };
  
    if (this.isNewChat && this.recipientId) {
      this.http
        .get(`${environment.API_URL}/user-profile/${this.recipientId}`, { headers })
        .subscribe({
          next: (res: any) => {
            this.chatPartnerName = res.username;
  
            if (res.avatar_url) {
              const isAbsolute = res.avatar_url.startsWith('http');
              this.chatPartnerAvatarUrl = isAbsolute
                ? res.avatar_url
                : `${environment.API_URL}${res.avatar_url}`;
            } else {
              this.chatPartnerAvatarUrl = 'assets/img/placeholder-avatar.png';
            }
          },
          error: (err) => {
            console.error('❌ Σφάλμα φόρτωσης προφίλ παραλήπτη:', err);
            this.chatPartnerName = 'Χρήστης';
            this.chatPartnerAvatarUrl = 'assets/img/placeholder-avatar.png';
          },
        });
      return;
    }
  
    this.http
      .get(`${environment.API_URL}/chats/${this.chatId}/partner`, { headers })
      .subscribe({
        next: (res: any) => {
          this.chatPartnerName = res.other_username;
  
          if (res.other_avatar) {
            const isAbsolute = res.other_avatar.startsWith('http');
            this.chatPartnerAvatarUrl = isAbsolute
              ? res.other_avatar
              : `${environment.API_URL}${res.other_avatar}`;
          } else {
            this.chatPartnerAvatarUrl = 'assets/img/placeholder-avatar.png';
          }
        },
        error: (err) => {
          console.error('❌ Σφάλμα συνομιλητή:', err);
          this.chatPartnerName = 'Χρήστης';
          this.chatPartnerAvatarUrl = 'assets/img/placeholder-avatar.png';
        },
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

  loadMessages(append: boolean = false) {
    const token = localStorage.getItem('token');
    if (!token) return;
  
    const headers = { Authorization: `Bearer ${token}` };
  
    this.http
      .get<any[]>(`${environment.API_URL}/chats/${this.chatId}/messages`, { headers })
      .subscribe({
        next: (res) => {
          const parsed = res.map(m => ({
            ...m,
            sender_id: Number(m.sender_id),
            timestamp: new Date(m.timestamp),
            is_read: !!m.is_read
          }));
  
          if (append) {
            const lastId = this.messages.length > 0 ? this.messages[this.messages.length - 1].id : 0;
            const newOnes = parsed.filter(m => m.id > lastId);
            if (newOnes.length > 0) {
              this.messages = [...this.messages, ...newOnes];
              this.markMessagesAsRead().then(() => this.chatService.refreshUnreadMessages());
            }
          } else {
            this.messages = parsed;
          }
  
          setTimeout(() => this.scrollToBottom(), 400);

        },
        error: (err) => console.error('🚫 Failed to fetch messages:', err)
      });
  }
  
  

  async sendMessage() {
    const content = this.newMessage.trim();
    if (!content) return;
  
    const token = localStorage.getItem('token');
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
  
    try {
      if (this.isNewChat && this.recipientId) {
        const res: any = await this.http
          .post(`${environment.API_URL}/chats/${this.recipientId}`, {}, { headers })
          .toPromise();
  
        this.chatId = res.chat_id;
        this.isNewChat = false;
      }
  
      const res: any = await this.http
        .post(`${environment.API_URL}/chats/${this.chatId}/messages`, { content }, { headers })
        .toPromise();
  
      this.newMessage = '';
      const newMsg = {
        id: res.id,
        chat_id: this.chatId,
        sender_id: this.userId,
        content,
        timestamp: new Date(),
        is_read: true
      };
  
      this.messages = [...this.messages, newMsg];
      this.scrollToBottom(true);

  
      if (this.recipientId && !this.chatPartnerName) {
        this.loadChatPartnerInfo();
      }
    } catch (err) {
      console.error('🚫 Failed to send or create chat:', err);
    }
  }
  

  async scrollToBottom(force: boolean = false) {
    if (!this.isUserNearBottom && !force) return;
  
    try {
      await this.content.scrollToBottom(300);
    } catch {
      setTimeout(() => this.content.scrollToBottom(300), 200);
    }
  }
  

  async onScroll(ev: CustomEvent) {
    const detail = ev.detail as any; 
    const el = await this.content.getScrollElement();
    const distanceFromBottom = detail.scrollHeight - detail.scrollTop - el.clientHeight;
    const threshold = 100;
    this.isUserNearBottom = distanceFromBottom < threshold;
  }
  
  
  
}
