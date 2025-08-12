import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { FooterNavComponent } from 'src/app/components/footer-nav/footer-nav.component';

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
  chats: Array<{
    chat_id: number;
    other_username: string;
    other_avatar?: string | null;
    unread_count?: number;
  }> = [];

  constructor(
    private http: HttpClient,
    private router: Router,
    private alertCtrl: AlertController,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.fetchChats();
  }

  ionViewWillEnter() {
    this.fetchChats();
  }

  fetchChats() {
    const token = localStorage.getItem('token') || '';
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    this.http.get<any[]>(`${environment.API_URL}/chats`, { headers }).subscribe({
      next: (res) => {
        this.chats = res || [];
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

  goToChat(chatId: number) {
    this.router.navigate(['/chat', chatId]);
  }

  async confirmDelete(chat: any, sliding?: any, ev?: Event) {
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

  trackByChatId = (_: number, item: { chat_id: number }) => item.chat_id;
}
