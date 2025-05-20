import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { FooterNavComponent } from '../../components/footer-nav/footer-nav.component';
import { AuthService } from 'src/app/services/auth.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-notes-feed',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, FooterNavComponent],
  templateUrl: './notes-feed.page.html',
  styleUrls: ['./notes-feed.page.scss']
})
export class NotesFeedPage implements OnInit {
  notes: any[] = [];
  filteredNotes: any[] = [];
  allCourses: string[] = [];
  searchTerm: string = '';
  selectedCategory: string = '';
  selectedCourse: string = '';
  selectedSemester: number | '' = '';
  selectedType: string = '';
  semesters: number[] = Array.from({ length: 10 }, (_, i) => i + 1);



  constructor(
    private http: HttpClient,
    private toastCtrl: ToastController,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadAllNotes();
  }

  loadAllNotes() {
    const token = this.authService.getToken();
    if (!token) return;

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    this.http.get<any[]>(`${environment.API_URL}/all-notes`, { headers })
      .subscribe({
        next: (data) => {
          this.notes = data;
          this.allCourses = [...new Set(data.map(note => note.course))];
          this.applyFilters();
        },
        error: (err) => {
          console.error('Failed to load notes feed:', err);
        }
      });
  }

  applyFilters() {
    this.filteredNotes = this.notes.filter(note => {
      const matchesSearch = note.title.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesCategory = this.selectedCategory ? note.category === this.selectedCategory : true;
      const matchesCourse = this.selectedCourse ? note.course === this.selectedCourse : true;
      const matchesSemester = this.selectedSemester ? note.semester === this.selectedSemester : true;
      const matchesType = this.selectedType ? note.type === this.selectedType : true;
    
      return matchesSearch && matchesCategory && matchesCourse && matchesSemester && matchesType;
    });    
  }

  onSearchChange() {
    this.applyFilters();
  }

  onCategoryChange() {
    this.applyFilters();
  }

  onCourseChange() {
    this.applyFilters();
  }

  async addToFavorites(note: any) {
    const token = this.authService.getToken();

    if (!token) {
      const toast = await this.toastCtrl.create({
        message: 'Πρέπει να είσαι συνδεδεμένος για να προσθέσεις αγαπημένα.',
        duration: 1500,
        color: 'danger'
      });
      await toast.present();
      return;
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    this.http.post(`${environment.API_URL}/favorite`, {
      note_id: note.id
    }, { headers })
    .subscribe({
      next: async (res: any) => {
        const toast = await this.toastCtrl.create({
          message: res.message,
          duration: 1200,
          color: 'success'
        });
        await toast.present();
        this.loadAllNotes();
      },
      error: async (err) => {
        const toast = await this.toastCtrl.create({
          message: 'Σφάλμα κατά την αποθήκευση στα αγαπημένα.',
          duration: 1500,
          color: 'danger'
        });
        await toast.present();
        console.error(err);
      }
    });
  }
}

