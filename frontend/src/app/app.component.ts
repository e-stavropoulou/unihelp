import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Capacitor } from '@capacitor/core';
import { NotificationsService } from './services/notifications.service';
import { ChatService } from './services/chat.service';
import { AuthService } from './services/auth.service';
import { jwtDecode } from 'jwt-decode';


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
  private globalPolling: any;

  constructor(
    private http: HttpClient,
    private notificationsService: NotificationsService,
    private chatService: ChatService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    console.log('🟢 [UniHelp] App initialized');
    this.setupSSO();

    this.startGlobalPolling();
    this.startTokenAutoRefresh();


    const token = this.authService.getToken();
    if (token) {
      if (this.isTokenExpired(token)) {
        const refresh = this.authService.getRefreshToken();
        if (refresh) {
          console.log('⏳ Token expired → trying refresh...');
          this.authService.refreshAccess().subscribe({
            next: () => console.log('✅ Token refreshed'),
            error: () => console.warn('⚠️ Refresh failed, keeping old token'),
          });
        }
      } else {
        console.log('🔑 Token still valid');
      }
    }

    // Global error listeners
    window.addEventListener('error', (event) => {
      console.log('🌍 Global JS error:', event.error);
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
        if (this.authService.getToken()) {
          this.notificationsService.requestWebPushToken();
        }
      } else {
        console.log('🚫 Push notifications skipped on native platform:', platform);
      }
    }, 1000);
  }

  private isTokenExpired(token: string): boolean {
    try {
      const decoded: any = jwtDecode(token);
      if (!decoded.exp) return false;
      return Date.now() > decoded.exp * 1000;
    } catch {
      return true;
    }
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
    const token = this.authService.getToken();
    const refresh = this.authService.getRefreshToken();
    const userIdStr = localStorage.getItem('user_id');
    const email = localStorage.getItem('email');
    const role = localStorage.getItem('role');

    console.log('📤 [SSO] Sending UNIHELP_TOKEN with credentials...');

    const response: SSOMessage =
      token && userIdStr && email && role
        ? {
            type: 'UNIHELP_TOKEN',
            token: token,
            refresh: refresh,
            userInfo: {
              user_id: parseInt(userIdStr, 10),
              email: email,
              role: role,
            },
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

  ngOnDestroy() {
    if (this.globalPolling) clearInterval(this.globalPolling);
  }

  private startGlobalPolling() {
    this.globalPolling = setInterval(() => {
      this.chatService.refreshUnreadMessages();
      this.notificationsService.refreshUnreadCount();
    }, 3000); // κάθε 3 δευτερόλεπτα
  }

  private startTokenAutoRefresh() {
    setInterval(() => {
      const token = this.authService.getToken();
      if (token && this.isTokenExpiredSoon(token, 5)) { // 5 λεπτά πριν
        const refresh = this.authService.getRefreshToken();
        if (refresh) {
          console.log("🔄 Προληπτικό refresh...");
          this.authService.refreshAccess().subscribe({
            next: () => console.log("✅ Token ανανεώθηκε"),
            error: () => console.warn("⚠️ Αποτυχία προληπτικού refresh")
          });
        }
      }
    }, 60_000); 
  }
  
  private isTokenExpiredSoon(token: string, minutes: number): boolean {
    try {
      const decoded: any = jwtDecode(token);
      if (!decoded.exp) return false;
      const expiry = decoded.exp * 1000;
      return Date.now() > expiry - minutes * 60 * 1000;
    } catch {
      return true;
    }
  }
  

}
