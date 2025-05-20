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
        const errorMessage = err.error?.message || 'Σφάλμα σύνδεσης';
      
        this.toastService.present(errorMessage);
      
        if (err.error?.error === 'not_verified') {
          this.showResend = true;
        } else {
          this.showResend = false;
        }
      }      
    });
  }

  resendVerification() {
    if (!this.email.trim()) {
      this.toastService.present('Συμπλήρωσε πρώτα το email σου!', 'warning');
      return;
    }
  
    this.authService.resendVerificationEmail(this.email).subscribe({
      next: (res: any) => {
        // Αν όλα πήγαν καλά και δεν ήρθε error (status 200)
        this.toastService.present(res.message || 'Το email επιβεβαίωσης εστάλη ξανά.', 'success');
      },
      error: (err) => {
        console.log('FULL ERROR', err);
        console.log('ERROR BODY', err.error);
      
        const code = err.status;
        const errCode = err.error?.error;
        const msg = err.error?.message || 'Αποτυχία αποστολής email επιβεβαίωσης.';
      
        if (code === 403 && errCode === 'already_verified') {
          this.toastService.present(msg, 'success');
          setTimeout(() => this.router.navigate(['/login']), 1500);
        } else if (code === 404) {
          this.toastService.present('Δεν υπάρχει χρήστης με αυτό το email.', 'error');
        } else if (code === 400) {
          this.toastService.present('Συμπλήρωσε σωστά το email σου.', 'warning');
        } else {
          this.toastService.present(msg, 'error');
        }
      }      
    });
   }
  
}
