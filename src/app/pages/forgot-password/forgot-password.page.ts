import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, RouterModule],
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss']
})
export class ForgotPasswordPage {
  email: string = '';

  constructor(private http: HttpClient, private toast: ToastService) {}

  submit() {
    if (!this.email.trim()) {
      this.toast.present('Συμπλήρωσε το email σου.', 'warning');
      return;
    }

    this.http.post(`${environment.API_URL}/forgot-password`, { email: this.email }).subscribe({
      next: () => {
        this.toast.present('Στάλθηκε email επαναφοράς κωδικού!', 'success');
      },
      error: () => {
        this.toast.present('Αποτυχία αποστολής. Δοκίμασε ξανά.', 'error');
      }
    });
  }
}
