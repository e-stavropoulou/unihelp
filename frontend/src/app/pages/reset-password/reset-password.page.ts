import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, RouterModule],
  templateUrl: './reset-password.page.html',
  styleUrls: ['./reset-password.page.scss']
})
export class ResetPasswordPage {
  token: string = '';
  password: string = '';
  confirmPassword: string = '';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private toast: ToastService,
    private router: Router
  ) {
    this.token = this.route.snapshot.paramMap.get('token') || '';
  }

  resetPassword() {
    if (!this.password || !this.confirmPassword) {
      this.toast.present('Συμπλήρωσε όλα τα πεδία.', 'warning');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.toast.present('Οι κωδικοί δεν ταιριάζουν.', 'error');
      return;
    }

    if (this.password.length < 8) {
      this.toast.present('Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.', 'error');
      return;
    }

    this.http.post(`${environment.API_URL}/reset-password/${this.token}`, {
      password: this.password
    }).subscribe({
      next: () => {
        this.toast.present('Ο κωδικός ορίστηκε! Μπορείς τώρα να συνδεθείς.', 'success');
        this.router.navigate(['/login'], { replaceUrl: true });
      },
      error: (err) => {
        const msg = err?.error?.error || 'Ο σύνδεσμος δεν είναι έγκυρος ή έχει λήξει.';
        this.toast.present(msg, 'error');
      }
    });
  }
}
