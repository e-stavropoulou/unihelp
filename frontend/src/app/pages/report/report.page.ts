import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpClientModule } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/app/services/auth.service';
import { ToastService } from 'src/app/services/toast.service';
import { Location } from '@angular/common';

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, HttpClientModule],
  templateUrl: './report.page.html',
  styleUrls: ['./report.page.scss']
})
export class ReportPage implements OnInit {
  noteId?: number;
  reportedUserId?: number;

  category = '';
  description = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
    private location: Location,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.noteId = params['noteId'] ? Number(params['noteId']) : undefined;
      this.reportedUserId = params['reportedUserId'] ? Number(params['reportedUserId']) : undefined;
    });
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

          if (this.noteId) {
            this.router.navigate(['/notes-feed']);
          } else if (this.reportedUserId) {
            this.router.navigate(['/search-users']);
          } else {
            this.router.navigate(['/']);
          }
        },
        error: async () => {
          await this.toastService.present('Αποτυχία υποβολής αναφοράς', 'error');
        }
      });
  }

  goBack(ev: Event) {
    ev.preventDefault(); 
    this.location.back();
  }
}
