// src/app/pages/bot/bot.page.ts

import { Component, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonInput,
  IonButton,
  IonList,
  IonItem,
  IonLabel,
  IonTextarea,
  IonButtons,
  IonBackButton,
  IonIcon,
  AlertController
} from '@ionic/angular/standalone';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-bot',
  templateUrl: './bot.page.html',
  styleUrls: ['./bot.page.scss'],
  standalone: true,
  imports: [
    IonIcon,
    IonBackButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonInput,
    IonButton,
    IonList,
    IonItem,
    IonLabel,
    IonTextarea,
    CommonModule,
    FormsModule,
    HttpClientModule
  ]
})
export class BotPage implements OnInit {

  @ViewChild(IonContent) content: IonContent | undefined;

  userInput: string = '';
  messages: { role: 'user' | 'bot', text: string }[] = [];
  isLoading = false;

  constructor(private http: HttpClient, private router: Router, private alertCtrl: AlertController) {}

  ngOnInit() {
    this.loadHistory();
  }

  async sendMessage() {
    const question = this.userInput.trim();
    if (!question) return;

    this.messages.push({ role: 'user', text: question });
    await this.saveBotMessage(question, false); 
    this.userInput = '';
    this.isLoading = true;
    this.scrollToBottom();

    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    try {
      const res: any = await this.http
        .post(`${environment.API_URL}/ask-rag`, { query: question }, { headers })
        .toPromise();

      const responseText = typeof res?.result === 'string'
        ? res.result
        : res?.result?.result || '🤖 Δεν βρέθηκε απάντηση.';

      this.messages.push({ role: 'bot', text: responseText });
      await this.saveBotMessage(responseText, true); 

    } catch (err) {
      console.error('❌ Σφάλμα:', err);
      this.messages.push({ role: 'bot', text: '⚠️ Σφάλμα κατά την επικοινωνία με το bot.' });
    } finally {
      this.isLoading = false;
      this.scrollToBottom();
    }
  }

  async loadHistory() {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  
    try {
      const res: any = await this.http
        .get(`${environment.API_URL}/bot/messages`, { headers })
        .toPromise();
  
      this.messages = res.map((msg: any) => ({
        role: msg.role,
        text: msg.content
      }));
  
      if (!this.messages || this.messages.length === 0) {
        const welcomeText = 'Γεια σου!👋 Είμαι η Thinkerbell 🧚‍♀️, η προσωπική σου βοηθός στην κοινότητα του UniHelp. Ρώτησέ με ό,τι θέλεις και θα σε καθοδηγήσω!';
        
        
        this.messages.push({
          role: 'bot',
          text: welcomeText
        });
      
        
        await this.saveBotMessage(welcomeText, true);
      }
      
  
      this.scrollToBottom();
  
    } catch (err) {
      console.error('❌ Σφάλμα κατά την ανάκτηση ιστορικού bot:', err);
    }
  }
  

  async saveBotMessage(content: string, isBot: boolean) {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const body = {
      content,
      role: isBot ? 'bot' : 'user'
    };

    try {
      await this.http
        .post(`${environment.API_URL}/bot/message`, body, { headers })
        .toPromise();
    } catch (err) {
      console.error('❌ Σφάλμα αποθήκευσης bot μηνύματος:', err);
    }
  }

  scrollToBottom() {
    setTimeout(() => {
      this.content?.scrollToBottom(300);
    }, 100);
  }

  goBack() {
    this.router.navigate(['/chat']);
  }

  async confirmClearMessages() {
    const alert = await this.alertCtrl.create({
      header: 'Καθαρισμός Συνομιλίας',
      message: 'Θέλεις σίγουρα να διαγράψεις όλα τα μηνύματα του bot;',
      buttons: [
        {
          text: 'Ακύρωση',
          role: 'cancel'
        },
        {
          text: 'Ναι',
          handler: () => {
            this.clearBotMessages();
          }
        }
      ]
    });

    await alert.present();
  }

  async clearBotMessages() {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    try {
      await this.http
        .delete(`${environment.API_URL}/bot/messages`, { headers })
        .toPromise();

      this.messages = [];
      this.scrollToBottom();

    } catch (err) {
      console.error('❌ Σφάλμα διαγραφής μηνυμάτων bot:', err);
    }
  }
}
