import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Capacitor } from '@capacitor/core';
import { getMessagingInstance, getTokenWeb } from 'src/app/firebase';
import { initPushCapacitor } from './push-capacitor';
import { NotificationsService } from './services/notifications.service';
import { ChatService } from './services/chat.service';


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

  constructor(
    private http: HttpClient,
    private notificationsService: NotificationsService,
    private chatService: ChatService
  ) {}
  

  ngOnInit() {
    console.log('🟢 [UniHelp] App initialized');
    this.setupSSO();
  
    // 🌍 Global error listeners
    window.addEventListener('error', (event) => {
      console.log('🌍 Global JS error:', event.error);
      console.log('📌 Error source:', event.filename, 'line:', event.lineno, 'col:', event.colno);
    });
  
    window.addEventListener('unhandledrejection', (event) => {
      console.log('🌍 Unhandled promise rejection:', event.reason);
    });
  
    // ✅ Άμεσο update badge χωρίς call στο backend
    window.addEventListener('new-chat-message', () => {
      console.log('📬 Push: νέο μήνυμα! +1 στο badge');
      this.chatService.increaseUnreadCount();
    });
  
    setTimeout(() => {
      this.sendTokenToAdmin(window.parent);
  
      const platform = Capacitor.getPlatform();
      console.log('📱 Detected platform:', platform);
  
      if (platform === 'web') {
        this.notificationsService.initPush(); // ✅ Μόνο στο web
      } else {
        console.log('🚫 Push notifications skipped on native platform:', platform);
      }
    }, 1000);
  }
  
  
  

  /**
   * ✅ Setup SSO communication με το Admin Dashboard
   */
  private setupSSO() {
    window.addEventListener('message', (event) => {
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

  enableWebPush() {
    const userId = Number(localStorage.getItem('user_id'));
    if (!userId) return;
  
    this.notificationsService.requestWebPushToken(userId);
    this.notificationsService.initPush(userId);
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

    const response: SSOMessage = token && userIdStr && email && role
      ? {
          type: 'TOKEN_RESPONSE',
          token: token,
          userInfo: {
            user_id: parseInt(userIdStr, 10),
            email: email,
            role: role
          }
        }
      : { type: 'TOKEN_RESPONSE' };

    try {
      const origin = new URL(document.referrer).origin;
      console.log('📤 [SSO] Sending token to:', origin);
      adminWindow.postMessage(response, origin);
    } catch (e) {
      console.warn('⚠️ [SSO] Fallback to * origin (unsafe):', e);
      adminWindow.postMessage(response, '*');
    }
  }
  

  async initWebPush() {
    try {
      const messaging = await getMessagingInstance();
      if (!messaging) {
        console.warn('⚠️ Firebase messaging not supported or not initialized.');
        return;
      }

      const currentToken = await getTokenWeb?.(messaging, {
        vapidKey: environment.vapidKey
      });
      

      if (currentToken) {
        console.log('📲 Web FCM Token:', currentToken);
        localStorage.setItem('fcm_token', currentToken); 
        console.log('✅ Token stored in localStorage:', localStorage.getItem('fcm_token'));
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
      console.warn('⛔ No JWT token found. Retrying in 1 second...');
      setTimeout(() => this.saveTokenToBackend(token), 1000);
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
