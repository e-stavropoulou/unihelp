import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from 'src/app/services/auth.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-my-reports',
  standalone: true,
  templateUrl: './my-reports.page.html',
  styleUrls: ['./my-reports.page.scss'],
  imports: [IonicModule, CommonModule]
})
export class MyReportsPage implements OnInit {
  reports: any[] = [];

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadReports();
  }

  loadReports() {
    const token = this.authService.getToken();
    if (!token) return;

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    this.http.get<any[]>(`${environment.API_URL}/my-reports`, { headers })
      .subscribe({
        next: (res) => {
          this.reports = res;
        },
        error: (err) => {
          console.error('Σφάλμα φόρτωσης αναφορών:', err);
        }
      });
  }
}
