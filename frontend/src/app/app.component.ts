// src/app/app.component.ts (Simple SSO version)
import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Capacitor } from '@capacitor/core';
import { getMessagingInstance, getToken } from 'src/app/firebase';
import { initPushCapacitor } from './push-capacitor';

interface SSOMessage {
  type: 'TOKEN_REQUEST' | 'TOKEN_RESPONSE' | 'LOGOUT_REQUEST';
  token?: string;
  userInfo?: {
    user_id: number;
    email: string;
    role: string;
  };
}

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {

  constructor(private http: HttpClient) {
    this.initPush();
  }

  ngOnInit() {
    console.log('🟢 [UniHelp] App initialized');
    this.setupSSO(); // ✅ Κάλεσέ το πάντα

    setTimeout(() => {
      this.sendTokenToAdmin(window.parent);
    }, 500); // ✅ στείλε token προληπτικά στο admin iframe
    
  }
  

  /**
   * ✅ Setup SSO communication με το Admin Dashboard
   */
  private setupSSO() {
    window.addEventListener('message', (event) => {
      // Security check - μόνο από το admin origin
      if (event.origin !== environment.ADMIN_ORIGIN) {
        console.warn('🚫 [SSO] Ignored message from untrusted origin:', event.origin);
        return;
      }

      const message: SSOMessage = event.data;
      console.log('📨 [SSO] Message received:', message);

      if (message.type === 'TOKEN_REQUEST') {
        this.sendTokenToAdmin(event.source as Window);
      }
    });

    console.log('✅ [SSO] Listener setup complete');
  }

  /**
   * ✅ Στέλνει token στο Admin Dashboard
   */
  private sendTokenToAdmin(adminWindow: Window) {
    const token = localStorage.getItem('token');
    const userIdStr = localStorage.getItem('user_id');
    const email = localStorage.getItem('email');
    const role = localStorage.getItem('role');

    console.log('📤 [SSO] Token request received, checking credentials...');

    if (token && userIdStr && email && role) {
      const response: SSOMessage = {
        type: 'TOKEN_RESPONSE',
        token: token,
        userInfo: {
          user_id: parseInt(userIdStr, 10),
          email: email,
          role: role
        }
      };

      console.log('✅ [SSO] Sending token to admin dashboard');
      adminWindow.postMessage(response, environment.ADMIN_ORIGIN);
    } else {
      console.warn('⚠️ [SSO] No valid credentials found');
      const response: SSOMessage = {
        type: 'TOKEN_RESPONSE'
        // Χωρίς token/userInfo = not logged in
      };
      adminWindow.postMessage(response, environment.ADMIN_ORIGIN);
    }
  }

  // ✅ Υπόλοιπες μέθοδοι παραμένουν ίδιες
  async initPush() {
    if (Capacitor.getPlatform() === 'web') {
      this.initWebPush();
    } else {
      await initPushCapacitor();
    }
  }

  async initWebPush() {
    try {
      const messaging = await getMessagingInstance();
      if (!messaging) {
        console.warn('⚠️ Firebase messaging not supported or not initialized.');
        return;
      }

      const currentToken = await getToken(messaging, {
        vapidKey: environment.firebase.vapidKey,
      });

      if (currentToken) {
        console.log('📲 Web FCM Token:', currentToken);
        this.saveTokenToBackend(currentToken);
      } else {
        console.warn('⚠️ No registration token available.');
      }
    } catch (err) {
      console.error('❌ Error getting web push token:', err);
    }
  }

  saveTokenToBackend(token: string) {
    const jwt = localStorage.getItem('token');
    if (!jwt) {
      console.warn('⛔ No JWT token found. Skipping FCM token upload.');
      return;
    }

    this.http
      .post(
        `${environment.API_URL}/update-fcm-token`,
        { fcm_token: token },
        { headers: { Authorization: `Bearer ${jwt}` } }
      )
      .subscribe({
        next: () => console.log('✅ FCM Token saved to backend'),
        error: (err) => console.error('❌ Failed to save FCM token:', err),
      });
  }
}