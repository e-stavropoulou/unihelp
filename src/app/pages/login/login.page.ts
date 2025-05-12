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
  styleUrls: ['./login.page.scss'],
})
export class LoginPage {
  email: string = '';
  password: string = '';

  constructor(
    private router: Router,
    private http: HttpClient,
    private toastService: ToastService,
    private authService: AuthService
  ) {}

  login() {
    console.log('Login button clicked');
    if (!this.email || !this.password) {
      this.toastService.present('Συμπλήρωσε όλα τα πεδία!', 'error');
      return;
    }

    this.http.post<{ message: string; token: string }>(`${environment.API_URL}/login`, {
      email: this.email,
      password: this.password
    }).subscribe({
      next: (res) => {
        this.authService.setToken(res.token);
        this.router.navigateByUrl('/profile', { replaceUrl: true }).then(() => {
          window.location.reload(); // Για να φορτωθούν τα δεδομένα με token
        });
      },
      error: (err) => {
        this.toastService.present(err.error?.error || 'Σφάλμα σύνδεσης');
      }
    });
  }
}
