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
    console.log('👉 Login clicked!', this.email, this.password);
  
    if (!this.email || !this.password) {
      console.log('⚠️ Fields missing, θα εμφανίσω toast');
      this.toastService.present('Συμπλήρωσε όλα τα πεδία!', 'error');
      console.log('🟢 Κλήθηκε toast για empty fields');
      return;
    }
  
    console.log('✅ Sending HTTP request to:', `${environment.API_URL}/login`);
  
    this.http.post<{ message: string; token: string; email: string; user_id: number; role: string }>(
      `${environment.API_URL}/login`,
      {
        email: this.email,
        password: this.password,
      }
    ).subscribe({
      next: (res) => {
        console.log('✅ Login success response', res);
        this.authService.setToken(res.token, res.user_id, res.email, res.role);
        this.showResend = false;
        this.router.navigateByUrl('/profile', { replaceUrl: true });
      },
      error: (err) => {
        console.log('❌ FULL ERROR OBJECT:', err);
        console.log('❌ err.status:', err.status);
        console.log('❌ err.error:', err.error);
        console.log('❌ err.message:', err.message);
        console.log('❌ err.name:', err.name);
        const errorMessage = err.error?.message || 'Σφάλμα σύνδεσης';
        console.log('🟡 Θα εμφανίσω toast με μήνυμα:', errorMessage);
        this.toastService.present(errorMessage, 'error')
          .then(() => {
            console.log('🟢 Τελείωσε το await του toast');
          });
  
        if (err.error?.error === 'not_verified') {
          console.log('⚠️ User not verified - showResend TRUE');
          this.showResend = true;
        } else {
          this.showResend = false;
        }
      },
    });
  }

  resendVerification() {
    console.log('🔁 Κλήθηκε resendVerification');
    if (!this.email.trim()) {
      console.log('⚠️ Empty email, θα εμφανίσω toast');
      this.toastService.present('Συμπλήρωσε πρώτα το email σου!', 'warning')
        .then(() => {
          console.log('🟢 Τελείωσε το await του toast για warning');
        });
      return;
    }
  
    this.authService.resendVerificationEmail(this.email).subscribe({
      next: (res: any) => {
        console.log('🔁 resendVerification: success', res);
        this.toastService.present(res.message || 'Το email επιβεβαίωσης εστάλη ξανά.', 'success')
          .then(() => {
            console.log('🟢 Τελείωσε το await του toast για success');
          });
      },
      error: (err) => {
        console.log('FULL ERROR', err);
        console.log('ERROR BODY', err.error);
      
        const code = err.status;
        const errCode = err.error?.error;
        const msg = err.error?.message || 'Αποτυχία αποστολής email επιβεβαίωσης.';
        console.log('🔁 resendVerification: error', code, errCode, msg);
      
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
