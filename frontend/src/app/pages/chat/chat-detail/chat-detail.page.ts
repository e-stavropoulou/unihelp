import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
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
  IonButtons, IonItem } from '@ionic/angular/standalone';

@Component({
  selector: 'app-chat-detail',
  templateUrl: './chat-detail.page.html',
  styleUrls: ['./chat-detail.page.scss'],
  standalone: true,
  imports: [IonItem, 
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
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
  returnTo: string = '/chat'; // default fallback

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit() {
    const nav = this.router.getCurrentNavigation();
    if (nav?.extras?.state?.['returnTo']) {
      this.returnTo = nav.extras.state['returnTo'];
    }

    this.chatId = Number(this.route.snapshot.paramMap.get('chatId'));
    const storedUserId = localStorage.getItem('user_id');
    this.userId = storedUserId ? Number(storedUserId) : 0;

    this.loadMessages();
  }

  goBack() {
    this.router.navigateByUrl(this.returnTo);
  }

  loadMessages() {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('🚫 No token found in localStorage');
      return;
    }
  
    const headers = {
      Authorization: `Bearer ${token}`
    };
  
    this.http.get(`${environment.API_URL}/chats/${this.chatId}/messages`, { headers }).subscribe({
      next: (res: any) => {
        this.messages = res;
        setTimeout(() => this.scrollToBottom(), 200);
      },
      error: (err) => console.error('🚫 Failed to fetch messages:', err)
    });
  }
  

  sendMessage() {
    if (!this.newMessage.trim()) return;
  
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('🚫 No token found in localStorage');
      return;
    }
  
    const headers = {
      Authorization: `Bearer ${token}`
    };
  
    const messagePayload = {
      content: this.newMessage
    };
  
    this.http.post(`${environment.API_URL}/chats/${this.chatId}/messages`, messagePayload, { headers }).subscribe({
      next: () => {
        this.newMessage = '';
        this.loadMessages(); // Ή push locally για καλύτερη εμπειρία
      },
      error: (err) => console.error('🚫 Failed to send message:', err)
    });
  }
  
  

  scrollToBottom() {
    const chatContainer = document.querySelector('.chat-content');
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }
}
