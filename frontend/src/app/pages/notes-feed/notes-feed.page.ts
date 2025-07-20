import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { FooterNavComponent } from '../../components/footer-nav/footer-nav.component';
import { AuthService } from 'src/app/services/auth.service';
import { environment } from 'src/environments/environment';
import { NgZone } from '@angular/core';
import { ToastService } from 'src/app/services/toast.service';

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
    private authService: AuthService,
    private zone: NgZone,
    private toastService: ToastService
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
          console.log('✅ allCourses AFTER LOAD:', this.allCourses);
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
      const matchesSemester = this.selectedSemester ? note.semester === Number(this.selectedSemester) : true;
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

  downloadNote(note: any) {
    const token = this.authService.getToken();
    const downloadUrl = `${environment.API_URL}/download/${note.id}`;
  
    // Δημιουργία anchor tag με το JWT
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener');
  
    // ✅ Τοπική αύξηση των downloads
    this.zone.run(() => {
      note.downloads += 1;
    });
  
    link.click();
  }
  
  

  async addToFavorites(note: any) {
    const token = this.authService.getToken();

    if (!token) {
      await this.toastService.present('Πρέπει να είσαι συνδεδεμένος για να προσθέσεις αγαπημένα.', 'error');
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
        console.log('✅ Success res:', res);

        await this.toastService.present(res.message || 'Επιτυχία!', 'success');

        this.zone.run(() => {
          note.isFavorite = !note.isFavorite;
        });
      },
      error: async (err) => {
        await this.toastService.present('Σφάλμα κατά την αποθήκευση στα αγαπημένα.', 'error');
        console.error(err);
      }
    });
  }
}
