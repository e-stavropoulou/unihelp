import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { FooterNavComponent } from 'src/app/components/footer-nav/footer-nav.component';


// 🧩 Ionic Components
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
  IonText
} from '@ionic/angular/standalone';

// ✅ Για ngIf, ngFor
import { CommonModule } from '@angular/common';

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
    FooterNavComponent,
    IonText
  ]
})
export class ChatListPage implements OnInit {
  chats: any[] = [];

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.fetchChats();
  }

  fetchChats() {
    const token = localStorage.getItem('token');  // ✅ Πάρε το JWT token
  
    this.http.get(`${environment.API_URL}/chats`, {
      headers: {
        Authorization: `Bearer ${token}`  // ✅ Βάλε το token στα headers
      }
    }).subscribe({
      next: (res: any) => this.chats = res,
      error: (err) => console.error('🚫 Error fetching chats:', err)
    });
  }
  

  goToChat(chatId: number) {
    this.router.navigate(['/chat', chatId]);
  }

  ionViewWillEnter() {
    this.fetchChats();  // ✅ Επαναφόρτωση κάθε φορά που μπαίνεις
  }
  
}
