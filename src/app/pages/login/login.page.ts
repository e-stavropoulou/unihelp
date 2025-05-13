import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { ToastService } from 'src/app/services/toast.service';
import { AuthService } from 'src/app/services/auth.service';
import { environment } from 'src/environments/environment';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    RouterModule,
    HttpClientModule,
    FormsModule
  ],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss']
})
export class LoginPage {
  email: string = '';
  password: string = '';
  showResend: boolean = false;

  constructor(
    private router: Router,
    private http: HttpClient,
    private toastService: ToastService,
    private authService: AuthService
  ) {}

  login() {
    if (!this.email || !this.password) {
      this.toastService.present('Συμπλήρωσε όλα τα πεδία!', 'error');
      return;
    }

    this.http.post<{ message: string; token: string; email: string }>(`${environment.API_URL}/login`, {
      email: this.email,
      password: this.password
    }).subscribe({
      next: (res) => {
        this.authService.setToken(res.token, res.email);
        this.showResend = false;
        this.router.navigateByUrl('/profile', { replaceUrl: true });
      },
      error: (err) => {
        const errorMessage = err.error?.error || 'Σφάλμα σύνδεσης';
        this.toastService.present(errorMessage);

        // Αν αφορά ενεργοποίηση, εμφάνιση κουμπιού resend
        if (errorMessage.includes('ενεργοποιηθεί')) {
          this.showResend = true;
        } else {
          this.showResend = false;
        }
      }
    });
  }

  resendVerification() {
    if (!this.email) {
      this.toastService.present('Συμπλήρωσε πρώτα το email σου!', 'error');
      return;
    }

    this.authService.resendVerificationEmail(this.email).subscribe({
      next: (res) => {
        this.toastService.present(res.message || 'Το email επιβεβαίωσης εστάλη ξανά.');
      },
      error: () => {
        this.toastService.present('Αποτυχία αποστολής email επιβεβαίωσης.');
      }
    });
  }
}
