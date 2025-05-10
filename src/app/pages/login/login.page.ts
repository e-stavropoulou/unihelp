import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { ToastService } from 'src/app/services/toast.service';
import { AuthService } from 'src/app/services/auth.service';
import { environment } from 'src/environments/environment';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    RouterModule,
    HttpClientModule
  ],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage {
  email: string = '';
  password: string = '';

  constructor(private router: Router, private http: HttpClient, private toastService: ToastService, private authService: AuthService) {}


  login() {
    if (!this.email || !this.password) {
      this.toastService.present('Συμπλήρωσε όλα τα πεδία!', 'error');
      return;
    }
  
    this.http.post<{ message: string; email: string }>(`${environment.API_URL}/login`, {
      email: this.email,
      password: this.password
    }).subscribe({
      next: (res) => {
        this.authService.setUserEmail(res.email);
        this.router.navigateByUrl('/profile', { state: { email: res.email }, replaceUrl: true }).then(() => {
          window.location.reload(); // Αναγκαστικό refresh για να ενημερωθεί η σελίδα
        });
      },
      error: (err) => {
        this.toastService.present(err.error?.error || 'Σφάλμα σύνδεσης');
      }
    });    
  }  
}
