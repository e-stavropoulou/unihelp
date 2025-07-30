import { Component, Input } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpClientModule } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/app/services/auth.service';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-report-modal',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, HttpClientModule],
  templateUrl: './report-modal.component.html',
  styleUrls: ['./report-modal.component.scss']
})
export class ReportModalComponent {
  @Input() noteId?: number;
  @Input() reportedUserId?: number;

  category = '';
  description = '';

  constructor(
    private modalCtrl: ModalController,
    private http: HttpClient,
    private authService: AuthService,
    private toastService: ToastService
  ) {
    console.log('STEP 5: ReportModalComponent constructor CALLED');
  }
  

  dismiss() {
    this.modalCtrl.dismiss();
  }

  submitReport() {
    const token = this.authService.getToken();
    if (!token) {
      this.toastService.present('Δεν είστε συνδεδεμένος', 'error');
      return;
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    const body: any = {
      category: this.category,
      description: this.description
    };

    if (this.noteId) body.note_id = this.noteId;
    if (this.reportedUserId) body.reported_user_id = this.reportedUserId;

    this.http.post(`${environment.API_URL}/report`, body, { headers })
      .subscribe({
        next: async () => {
          await this.toastService.present('Η αναφορά υποβλήθηκε!', 'success');
          this.modalCtrl.dismiss();
        },
        error: async () => {
          await this.toastService.present('Αποτυχία υποβολής αναφοράς', 'error');
        }
      });
  }
}
