import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';

type IncomingType = 'UNIHELP_NEED_TOKEN' | 'TOKEN_REQUEST' | 'LOGOUT_REQUEST' | 'READY';

@Injectable({ providedIn: 'root' })
export class SsoService {
  private pendingWin: Window | null = null;
  private sendTimer: any = null;
  private attempts = 0;

  constructor(private authService: AuthService, private router: Router) {
    this.setupMessageListener();
  }

  /** 📥 Listener για μηνύματα από admin */
  private setupMessageListener() {
    window.addEventListener('message', (event: MessageEvent) => {
      const allowedOrigins = [environment.ADMIN_ORIGIN, 'capacitor://localhost'];
      if (!allowedOrigins.includes(event.origin)) {
        console.warn('[SSO] 🔒 Blocked message from unexpected origin:', event.origin);
        return;
      }


      const msg = (event.data || {}) as { type?: IncomingType };
      if (!msg?.type) return;

      switch (msg.type) {
        case 'UNIHELP_NEED_TOKEN':
        case 'TOKEN_REQUEST':
        case 'READY':
          this.replyWithTokens(event.source as Window);
          break;
          case 'LOGOUT_REQUEST':
            console.warn('[SSO] Λήφθηκε LOGOUT από το admin.');
          
            if (this.authService.logout) {
              this.authService.logout();
            } else {
              localStorage.removeItem('token');
              localStorage.removeItem('refresh_token');
              localStorage.removeItem('email');
              localStorage.removeItem('user_id');
              localStorage.removeItem('role');
              sessionStorage.clear();
              this.router.navigateByUrl('/login');
            }
          
            break;
          
          
      }
    });
  }

  /** 📤 Στέλνει token + user info */
  private replyWithTokens(target: Window) {
    const token = this.authService.getToken?.() || localStorage.getItem('token');
    const refresh = localStorage.getItem('refresh_token');
  
    const userInfo = {
      user_id: this.authService.getUserId?.() ?? null,
      email: localStorage.getItem('email'),
      role: this.authService.getRole?.() ?? null,
    };
  
    const targetOrigin = environment.ADMIN_ORIGIN;
  
    try {
      if (target && target !== window) {
        target.postMessage(
          {
            type: 'UNIHELP_TOKEN',
            token,
            refresh,
            userInfo,
          },
          targetOrigin // ✅ Να είναι ξεκάθαρο και σίγουρο
        );
        console.log(`[SSO] ✅ Token sent to ${targetOrigin}`);
      } else {
        console.warn('[SSO] ❌ Not a valid target window – skipping postMessage');
      }
    } catch (err) {
      console.error('[SSO] ❌ Failed to postMessage token:', err);
    }
  }
  
  
  
  

  /** ✅ Ανοίγει admin dashboard σε νέο tab (ή redirect για mobile) */
  openAdminDashboard(): void {
    const token = this.authService.getToken();
    const role = this.authService.getRole();

    if (!token || role !== 'admin') return;

    const targetUrl = environment.ADMIN_ORIGIN;

    // --- ΠΕΡΙΠΤΩΣΗ 1: Mobile App (Capacitor) ---
    const isMobile = (window as any).Capacitor?.isNativePlatform?.();
    if (isMobile) {
      const encoded = encodeURIComponent(targetUrl);
      this.router.navigateByUrl(`/sso-redirect?target=${encoded}`);
      return;
    }

    // --- ΠΕΡΙΠΤΩΣΗ 2: Web Browser ---
    const newTab = window.open(targetUrl, '_blank');
    if (!newTab) {
      console.warn('[SSO] Αποτυχία ανοίγματος νέου tab (πιθανώς popup blocker)');
      return;
    }

    this.pendingWin = newTab;
    this.kickoffReplyLoop(); // επαναλαμβάνει την αποστολή token
  }

  /** 🔁 Επαναλαμβανόμενη αποστολή token μέχρι να το πάρει */
  private kickoffReplyLoop() {
    if (this.sendTimer) clearInterval(this.sendTimer);
    this.attempts = 0;

    this.sendTimer = setInterval(() => {
      this.attempts++;
      if (!this.pendingWin || this.attempts > 25) {
        clearInterval(this.sendTimer);
        this.sendTimer = null;
        this.pendingWin = null;
        return;
      }
      this.replyWithTokens(this.pendingWin);
    }, 200); // κάθε 200ms για 5s
  }

  /** ✉️ Χειροκίνητη αποστολή token */
  sendTokenToAdmin(win: Window) {
    this.replyWithTokens(win);
  }
}
