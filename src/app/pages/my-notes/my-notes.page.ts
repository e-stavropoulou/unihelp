import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-my-notes',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './my-notes.page.html',
  styleUrls: ['./my-notes.page.scss']
})
export class MyNotesPage implements OnInit {
  notes: any[] = [];

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadNotes(); 
  }

  loadNotes() {
    this.http.get<any[]>(`${environment.API_URL}/my-notes`, {
      headers: {
        Authorization: `Bearer ${this.authService.getToken()}`
      }
    }).subscribe(data => {
      this.notes = data;
    });
  }
}
