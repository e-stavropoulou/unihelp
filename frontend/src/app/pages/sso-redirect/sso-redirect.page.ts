import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-sso-redirect',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Ανακατεύθυνση</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <p>Γίνεται ανακατεύθυνση στο Admin Dashboard...</p>
    </ion-content>
  `,
})
export class SsoRedirectPage implements OnInit {
  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    console.log('🟢 [SSO Redirect] Init');

    const token = localStorage.getItem('token');
    const refresh = localStorage.getItem('refresh_token');
    const email = localStorage.getItem('email');
    const user_id = localStorage.getItem('user_id');
    const role = localStorage.getItem('role');

    const target = this.route.snapshot.queryParamMap.get('target') || environment.ADMIN_ORIGIN;

    if (token && user_id && email && role) {
      const userInfo = {
        user_id: parseInt(user_id, 10),
        email,
        role,
      };

      const message = {
        type: 'UNIHELP_TOKEN',
        token,
        refresh,
        userInfo,
      };

      console.log('📤 [SSO Redirect] Sending token to opener', message);

      // ✅ Αν υπάρχει opener, στείλε postMessage
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(message, environment.ADMIN_ORIGIN);

        // Κλείσε το popup μετά από λίγο
        setTimeout(() => {
          window.close();
        }, 700);
      } else {
        // ❗ Fallback: redirect με query params
        const encodedUser = encodeURIComponent(JSON.stringify(userInfo));
        const redirectUrl = `${target}?token=${token}&user=${encodedUser}`;
        console.log('🔁 [SSO Redirect] Fallback redirect:', redirectUrl);
        window.location.href = redirectUrl;
      }

      // 🔙 Αφαίρεσε αυτή τη σελίδα από το history για να μην πας "πίσω" εδώ
      this.router.navigateByUrl('/profile', { replaceUrl: true });
    } else {
      console.warn('⚠️ [SSO Redirect] Missing token or user info – redirecting anyway');
      window.location.href = target;

      // Και πάλι, καθάρισε το history
      this.router.navigateByUrl('/profile', { replaceUrl: true });
    }
  }
}
