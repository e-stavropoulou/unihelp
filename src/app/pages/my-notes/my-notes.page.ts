// src/app/pages/my-notes/my-notes.page.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';


@Component({
  selector: 'app-my-notes',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './my-notes.page.html',
  styleUrls: ['./my-notes.page.scss']
})
export class MyNotesPage implements OnInit {
  notes: any[] = [];
  userEmail: string = '';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.userEmail = localStorage.getItem('email') || '';
    if (this.userEmail) {
      this.loadNotes();
    }
  }

  loadNotes() {
    this.http.get<any[]>(`${environment.API_URL}/my-notes?email=${this.userEmail}`)
      .subscribe(data => {
        this.notes = data;
      });
  }
}
