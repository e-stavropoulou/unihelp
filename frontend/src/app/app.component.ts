import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Capacitor } from '@capacitor/core';
import { getMessagingInstance, getTokenWeb } from 'src/app/firebase';
import { NotificationsService } from './services/notifications.service';
import { ChatService } from './services/chat.service';


interface SSOMessage {
  type: 'READY' | 'UNIHELP_TOKEN' | 'TOKEN_RECEIVED' | 'LOGOUT_REQUEST';
  token?: string;
  refresh?: string | null; 
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
  
    // Global error listeners
    window.addEventListener('error', (event) => {
      console.log('🌍 Global JS error:', event.error);
      console.log('📌 Error source:', event.filename, 'line:', event.lineno, 'col:', event.colno);
    });
  
    window.addEventListener('unhandledrejection', (event) => {
      console.log('🌍 Unhandled promise rejection:', event.reason);
    });
  
    // update badge without call backend
    window.addEventListener('new-chat-message', () => {
      console.log('📬 Push: νέο μήνυμα! +1 στο badge');
      this.chatService.increaseUnreadCount();
    });
  
    setTimeout(() => {
      this.sendTokenToAdmin(window.parent);
  
      const platform = Capacitor.getPlatform();
      console.log('📱 Detected platform:', platform);
  
      if (platform === 'web') {
        this.notificationsService.initPush(); 
      } else {
        console.log('🚫 Push notifications skipped on native platform:', platform);
      }
    }, 1000);
  }
  
  
  

  /* Setup SSO communication with Admin Dashboard */
  private setupSSO() {
    window.addEventListener('message', (event) => {
      if (event.origin !== environment.ADMIN_ORIGIN) {
        console.warn('🚫 [SSO] Ignored message from untrusted origin:', event.origin);
        return;
      }

      const message: SSOMessage = event.data;
      console.log('📨 [SSO] Message received:', message);

      if (message.type === 'READY') {
        this.sendTokenToAdmin(event.source as Window);
      }
    });

    console.log('✅ [SSO] Listener setup complete');
  }

  enableWebPush() {
    this.notificationsService.requestWebPushToken();
    
  }
  

/* token to admin dashboard */
private sendTokenToAdmin(adminWindow: Window) {
  const token = localStorage.getItem('token');
  const refresh = localStorage.getItem('refresh_token');
  const userIdStr = localStorage.getItem('user_id');
  const email = localStorage.getItem('email');
  const role = localStorage.getItem('role');

  console.log('📤 [SSO] Sending UNIHELP_TOKEN with credentials...');

  const response: SSOMessage = token && userIdStr && email && role
    ? {
        type: 'UNIHELP_TOKEN',
        token: token,
        refresh: refresh,
        userInfo: {
          user_id: parseInt(userIdStr, 10),
          email: email,
          role: role
        }
      }
    : { type: 'UNIHELP_TOKEN' };

  try {
    const targetOrigin = environment.ADMIN_ORIGIN;
    console.log('📤 [SSO] Sending token to:', targetOrigin);
    adminWindow.postMessage(response, targetOrigin);
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
