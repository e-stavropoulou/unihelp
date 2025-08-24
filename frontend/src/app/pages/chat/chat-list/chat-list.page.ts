import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { FooterNavComponent } from 'src/app/components/footer-nav/footer-nav.component';
import { NotificationsService } from 'src/app/services/notifications.service';
import { ChatService } from 'src/app/services/chat.service';

import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonAvatar,
  IonText,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonIcon,
} from '@ionic/angular/standalone';
import { AlertController } from '@ionic/angular';
import { CommonModule } from '@angular/common';

import { ToastService } from 'src/app/services/toast.service';


// ✅ ΔΗΛΩΣΗ ΤΥΠΟΥ CHAT
interface ChatPreview {
  chat_id: number;
  other_username: string;
  other_avatar?: string | null;
  unread_count?: number;
  last_message_time?: string;
}

@Component({
  selector: 'app-chat-list',
  templateUrl: './chat-list.page.html',
  styleUrls: ['./chat-list.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonAvatar,
    IonBadge,
    IonText,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
    IonIcon,
    FooterNavComponent,
  ],
})
export class ChatListPage implements OnInit {
  chats: ChatPreview[] = [];

  constructor(
    private http: HttpClient,
    private router: Router,
    private alertCtrl: AlertController,
    private toast: ToastService,
    private notificationsService: NotificationsService,
    private chatService: ChatService
  ) {}

  ngOnInit() {
    this.fetchChats();
    this.listenForMessages(); // ✅ για real-time push
  }

  ionViewWillEnter() {
    this.fetchChats(); // Επαναφόρτωση όταν μπαίνει πάλι στη σελίδα
  }

  fetchChats() {
    const token = localStorage.getItem('token') || '';
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    this.http.get<ChatPreview[]>(`${environment.API_URL}/chats`, { headers }).subscribe({
      next: (res) => {
        this.chats = (res || []).sort((a, b) => {
          const dateA = new Date(a.last_message_time || 0).getTime();
          const dateB = new Date(b.last_message_time || 0).getTime();
          return dateB - dateA;
        });

        if (this.chats.length === 0) {
          this.toast.present('Δεν υπάρχουν ενεργές συνομιλίες.', 'warning', 1800);
        }
      },
      error: (err) => {
        console.error('🚫 Error fetching chats:', err);
        this.toast.present('Αποτυχία φόρτωσης συνομιλιών.', 'error');
      },
    });
  }

  listenForMessages() {
    this.notificationsService.currentMessage.subscribe((msg) => {
      const chatId = Number(msg?.data?.['chat_id']);
      if (chatId) {
        this.handleIncomingMessage(chatId);
      }
    });
  
    this.notificationsService.newChatMessage$.subscribe((data) => {
      const chatId = Number(data?.chat_id);
      if (chatId) {
        this.handleIncomingMessage(chatId);
      }
    });
  }
  
  // ➕ Νέα helper μέθοδος
  private handleIncomingMessage(chatId: number) {
    const currentChatId = this.chatService.currentChatId$.value;
  
    if (currentChatId === chatId) {
      // ✅ Είμαι ήδη μέσα σε αυτή τη συνομιλία -> δεν αυξάνω unread
      console.log(`📩 [ChatListPage] Μήνυμα στο ανοιχτό chat ${chatId}, αγνοώ unread`);
      // αλλά απλώς μετακινώ το chat στην κορυφή
      this.moveChatToTop(chatId);
    } else {
      // ❌ Εκτός -> αυξάνω unread
      this.updateUnreadCount(chatId);
    }
  }
  
  private moveChatToTop(chatId: number) {
    const index = this.chats.findIndex(c => c.chat_id === chatId);
  
    if (index !== -1) {
      const chat = this.chats.splice(index, 1)[0];
      this.chats.unshift(chat);
      this.chats = [...this.chats];
      console.log(`🔝 Chat ${chatId} μεταφέρθηκε στην κορυφή χωρίς αύξηση unread`);
    } else {
      this.fetchChats();
    }
  }
  
  
  
  

  updateUnreadCount(chatId: number) {
    console.log('🛠️ Ενημέρωση unread για chat:', chatId);
    const index = this.chats.findIndex(c => c.chat_id === chatId);
  
    if (index !== -1) {
      const chat = this.chats.splice(index, 1)[0];
      chat.unread_count = (chat.unread_count || 0) + 1;
      this.chats.unshift(chat);
      this.chats = [...this.chats];
  
      console.log(`🔁 Chat ${chatId} μεταφέρθηκε στην κορυφή με unread:`, chat.unread_count);
    } else {
      console.log('🆕 Το chat δεν βρέθηκε στη λίστα. Κάνω refetch.');
      this.fetchChats();
    }
  }
  

  goToChat(chatId: number) {
    this.router.navigate(['/chat', chatId]);
  }

  async confirmDelete(chat: ChatPreview, sliding?: any, ev?: Event) {
    ev?.stopPropagation();
    if (sliding?.close) {
      await sliding.close();
    }

    const alert = await this.alertCtrl.create({
      header: 'Διαγραφή συνομιλίας',
      message: `Θέλεις σίγουρα να διαγράψεις τη συνομιλία με ${chat.other_username};`,
      buttons: [
        {
          text: 'Άκυρο',
          role: 'cancel',
          handler: () => this.toast.present('Η διαγραφή ακυρώθηκε.', 'warning', 1500),
        },
        {
          text: 'Διαγραφή',
          role: 'destructive',
          handler: () => this.deleteChat(chat.chat_id),
        },
      ],
    });
    await alert.present();
  }

  deleteChat(chatId: number) {
    const token = localStorage.getItem('token') || '';
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    this.http.delete(`${environment.API_URL}/chats/${chatId}`, { headers }).subscribe({
      next: () => {
        this.chats = this.chats.filter((c) => c.chat_id !== chatId);
        this.toast.present('Η συνομιλία διαγράφηκε.', 'success');
      },
      error: (err) => {
        console.error('[deleteChat] error', err);
        this.toast.present('Αποτυχία διαγραφής. Προσπάθησε ξανά.', 'error');
      },
    });
  }

  trackByChatId = (_: number, item: ChatPreview) => item.chat_id;
}
