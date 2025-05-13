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
      next: () => {
        this.toastService.present('Το email επιβεβαίωσης εστάλη ξανά.', 'success');
      },
      error: () => {
        this.toastService.present('Σφάλμα κατά την αποστολή. Δοκίμασε ξανά.', 'error');
      }
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
