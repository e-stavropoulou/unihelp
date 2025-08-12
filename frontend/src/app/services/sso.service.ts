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
      if (event.origin !== environment.ADMIN_ORIGIN) return;

      const msg = (event.data || {}) as { type?: IncomingType };
      if (!msg?.type) return;

      switch (msg.type) {
        case 'UNIHELP_NEED_TOKEN':
        case 'TOKEN_REQUEST':
        case 'READY':
          this.replyWithTokens(event.source as Window);
          break;
        case 'LOGOUT_REQUEST':
          this.authService.clearToken?.();
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

    target.postMessage(
      {
        type: 'UNIHELP_TOKEN',
        token,
        refresh,
        userInfo,
      },
      environment.ADMIN_ORIGIN
    );
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
