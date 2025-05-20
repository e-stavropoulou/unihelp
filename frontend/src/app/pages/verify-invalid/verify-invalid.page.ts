import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from 'src/environments/environment';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-verify-invalid',
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule, FormsModule],
  templateUrl: './verify-invalid.page.html',
  styleUrls: ['./verify-invalid.page.scss']
})
export class VerifyInvalidPage {
  email: string = '';

  constructor(
    private http: HttpClient,
    private toastService: ToastService,
    private router: Router
  ) {}

  resendVerification() {
    if (!this.email.trim()) {
      this.toastService.present('Συμπλήρωσε το email σου.', 'warning');
      return;
    }
  
    this.http.post(`${environment.API_URL}/resend-verification`, { email: this.email }).subscribe({
      next: (res: any) => {
        if (res.message?.includes('ήδη επιβεβαιωμένος')) {
          this.toastService.present(res.message, 'success');
          setTimeout(() => this.router.navigate(['/login']), 1500);
        } else {
          this.toastService.present(res.message || 'Το email επιβεβαίωσης εστάλη ξανά.', 'success');
        }
      },
      error: (err) => {
        const msg = err.error?.message || 'Σφάλμα κατά την αποστολή.';
  
        if (err.status === 404) {
          this.toastService.present('Δεν υπάρχει χρήστης με αυτό το email.', 'error');
        } else if (err.status === 403 && err.error?.error === 'already_verified') {
          this.toastService.present(msg, 'success');
          setTimeout(() => this.router.navigate(['/login']), 1500);
        } else {
          this.toastService.present(msg, 'error');
        }
      }
    });
  }  

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
